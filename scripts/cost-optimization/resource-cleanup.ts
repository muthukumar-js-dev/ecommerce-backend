import { exec } from 'child_process';
import { promisify } from 'util';
import AWS from 'aws-sdk';

const execAsync = promisify(exec);

export class ResourceCleanup {
    private ecr: AWS.ECR;
    private ec2: AWS.EC2;
    private s3: AWS.S3;
    private cloudwatchlogs: AWS.CloudWatchLogs;
    private elbv2: AWS.ELBv2;

    constructor() {
        const region = process.env.AWS_REGION || 'ap-south-1';
        this.ecr = new AWS.ECR({ region });
        this.ec2 = new AWS.EC2({ region });
        this.s3 = new AWS.S3({ region });
        this.cloudwatchlogs = new AWS.CloudWatchLogs({ region });
        this.elbv2 = new AWS.ELBv2({ region });
    }

    async cleanupUnusedResources(): Promise<void> {
        console.log('=== Resource Cleanup ===\n');

        await this.cleanupOldImages();
        await this.cleanupUnusedVolumes();
        await this.cleanupOldBackups();
        await this.cleanupUnusedLoadBalancers();
        await this.cleanupOldLogs();

        console.log('\n✅ Resource cleanup completed\n');
    }

    private async cleanupOldImages(): Promise<void> {
        console.log('Cleaning up old container images...');

        try {
            const repositories = await this.ecr.describeRepositories({}).promise();

            let totalDeleted = 0;

            for (const repo of repositories.repositories || []) {
                const images = await this.ecr
                    .describeImages({
                        repositoryName: repo.repositoryName!,
                    })
                    .promise();

                const oldImages = (images.imageDetails || []).filter((img) => {
                    if (!img.imagePushedAt) return false;
                    const age = Date.now() - img.imagePushedAt.getTime();
                    return age > 30 * 24 * 60 * 60 * 1000; // 30 days
                });

                if (oldImages.length > 0) {
                    await this.ecr
                        .batchDeleteImage({
                            repositoryName: repo.repositoryName!,
                            imageIds: oldImages.map((img) => ({
                                imageDigest: img.imageDigest,
                            })),
                        })
                        .promise();

                    totalDeleted += oldImages.length;
                    console.log(`  Deleted ${oldImages.length} images from ${repo.repositoryName}`);
                }
            }

            console.log(`✓ Deleted ${totalDeleted} old images\n`);
        } catch (error) {
            console.error(`✗ Failed to cleanup images: ${(error as Error).message}\n`);
        }
    }

    private async cleanupUnusedVolumes(): Promise<void> {
        console.log('Cleaning up unused volumes...');

        try {
            const volumes = await this.ec2.describeVolumes({}).promise();

            const unusedVolumes = (volumes.Volumes || []).filter(
                (v) => v.State === 'available'
            );

            let deleted = 0;

            for (const volume of unusedVolumes) {
                // Check if volume has been unused for > 7 days
                const createTime = volume.CreateTime?.getTime() || 0;
                const age = Date.now() - createTime;

                if (age > 7 * 24 * 60 * 60 * 1000) {
                    await this.ec2
                        .deleteVolume({
                            VolumeId: volume.VolumeId!,
                        })
                        .promise();

                    console.log(`  Deleted: ${volume.VolumeId}`);
                    deleted++;
                }
            }

            console.log(`✓ Deleted ${deleted} unused volumes\n`);
        } catch (error) {
            console.error(`✗ Failed to cleanup volumes: ${(error as Error).message}\n`);
        }
    }

    private async cleanupOldBackups(): Promise<void> {
        console.log('Cleaning up old backups...');

        try {
            const bucket = process.env.BACKUP_BUCKET || 'ecommerce-backups';

            const objects = await this.s3
                .listObjectsV2({
                    Bucket: bucket,
                    Prefix: 'database/',
                })
                .promise();

            // Keep: 7 daily, 4 weekly, 12 monthly
            const backups = (objects.Contents || []).map((obj) => ({
                key: obj.Key!,
                lastModified: obj.LastModified!,
            }));

            const toDelete = this.selectBackupsToDelete(backups);

            if (toDelete.length > 0) {
                await this.s3
                    .deleteObjects({
                        Bucket: bucket,
                        Delete: {
                            Objects: toDelete.map((key) => ({ Key: key })),
                        },
                    })
                    .promise();

                console.log(`✓ Deleted ${toDelete.length} old backups\n`);
            } else {
                console.log(`✓ No old backups to delete\n`);
            }
        } catch (error) {
            console.error(`✗ Failed to cleanup backups: ${(error as Error).message}\n`);
        }
    }

    private selectBackupsToDelete(
        backups: { key: string; lastModified: Date }[]
    ): string[] {
        const now = Date.now();
        const toDelete: string[] = [];

        const sorted = backups.sort(
            (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
        );

        const daily: string[] = [];
        const weekly: string[] = [];
        const monthly: string[] = [];

        sorted.forEach((backup) => {
            const age = now - backup.lastModified.getTime();
            const days = age / (24 * 60 * 60 * 1000);

            if (days <= 7) {
                daily.push(backup.key);
            } else if (days <= 28) {
                weekly.push(backup.key);
            } else if (days <= 365) {
                monthly.push(backup.key);
            } else {
                toDelete.push(backup.key);
            }
        });

        // Keep only 7 daily, 4 weekly, 12 monthly
        if (daily.length > 7) toDelete.push(...daily.slice(7));
        if (weekly.length > 4) toDelete.push(...weekly.slice(4));
        if (monthly.length > 12) toDelete.push(...monthly.slice(12));

        return toDelete;
    }

    private async cleanupUnusedLoadBalancers(): Promise<void> {
        console.log('Checking for unused load balancers...');

        try {
            const lbs = await this.elbv2.describeLoadBalancers({}).promise();

            let unused = 0;

            for (const lb of lbs.LoadBalancers || []) {
                const targetGroups = await this.elbv2
                    .describeTargetGroups({
                        LoadBalancerArn: lb.LoadBalancerArn,
                    })
                    .promise();

                let hasTargets = false;

                for (const tg of targetGroups.TargetGroups || []) {
                    if (!tg.TargetGroupArn) continue;

                    const health = await this.elbv2
                        .describeTargetHealth({
                            TargetGroupArn: tg.TargetGroupArn,
                        })
                        .promise();

                    if (health.TargetHealthDescriptions && health.TargetHealthDescriptions.length > 0) {
                        hasTargets = true;
                        break;
                    }
                }

                if (!hasTargets) {
                    console.log(`  Warning: Load balancer ${lb.LoadBalancerName} has no targets`);
                    unused++;
                }
            }

            console.log(`✓ Found ${unused} unused load balancers (manual review required)\n`);
        } catch (error) {
            console.error(`✗ Failed to check load balancers: ${(error as Error).message}\n`);
        }
    }

    private async cleanupOldLogs(): Promise<void> {
        console.log('Cleaning up old logs...');

        try {
            const logGroups = await this.cloudwatchlogs.describeLogGroups({}).promise();

            let updated = 0;

            for (const group of logGroups.logGroups || []) {
                // Set 90-day retention if not set
                if (!group.retentionInDays || group.retentionInDays > 90) {
                    await this.cloudwatchlogs
                        .putRetentionPolicy({
                            logGroupName: group.logGroupName!,
                            retentionInDays: 90,
                        })
                        .promise();

                    updated++;
                }
            }

            console.log(`✓ Updated ${updated} log group retention policies\n`);
        } catch (error) {
            console.error(`✗ Failed to cleanup logs: ${(error as Error).message}\n`);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const cleanup = new ResourceCleanup();
    cleanup
        .cleanupUnusedResources()
        .then(() => {
            console.log('✓ Cleanup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('✗ Cleanup failed:', error);
            process.exit(1);
        });
}
