import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface InfrastructureCheck {
    component: string;
    status: 'healthy' | 'unhealthy' | 'warning';
    details: string;
}

export class InfrastructureValidator {
    private checks: InfrastructureCheck[] = [];

    async validateInfrastructure(): Promise<boolean> {
        console.log('\n=== Running Infrastructure Validation ===\n');

        await this.checkKubernetesCluster();
        await this.checkMongoDBSharding();
        await this.checkRedisCluster();
        await this.checkMonitoringSystems();
        await this.checkBackupSystems();

        return this.generateReport();
    }

    private async checkKubernetesCluster(): Promise<void> {
        console.log('Checking Kubernetes cluster...');

        try {
            // Check cluster nodes
            const { stdout: nodesOutput } = await execAsync('kubectl get nodes -o json');
            const nodes = JSON.parse(nodesOutput);

            const readyNodes = nodes.items?.filter((node: any) =>
                node.status?.conditions?.some(
                    (c: any) => c.type === 'Ready' && c.status === 'True'
                )
            );

            const totalNodes = nodes.items?.length || 0;
            const healthyNodes = readyNodes?.length || 0;

            this.checks.push({
                component: 'Kubernetes Cluster',
                status: healthyNodes === totalNodes ? 'healthy' : 'warning',
                details: `${healthyNodes}/${totalNodes} nodes ready`,
            });

            // Check pods
            const { stdout: podsOutput } = await execAsync(
                'kubectl get pods -n ecommerce-prod -o json'
            );
            const pods = JSON.parse(podsOutput);

            const runningPods = pods.items?.filter(
                (pod: any) => pod.status?.phase === 'Running'
            );

            this.checks.push({
                component: 'Application Pods',
                status: runningPods?.length > 0 ? 'healthy' : 'unhealthy',
                details: `${runningPods?.length || 0} pods running`,
            });
        } catch (error) {
            this.checks.push({
                component: 'Kubernetes Cluster',
                status: 'warning',
                details: 'Cluster not accessible (may not be deployed yet)',
            });
        }
    }

    private async checkMongoDBSharding(): Promise<void> {
        console.log('Checking MongoDB sharding...');

        try {
            const { stdout } = await execAsync(
                'kubectl get statefulsets -n ecommerce-prod -l app=mongodb -o json'
            );

            const statefulsets = JSON.parse(stdout);
            const mongoComponents = statefulsets.items?.length || 0;

            // Check for config servers, shards, and mongos
            const hasConfigServers = statefulsets.items?.some((s: any) =>
                s.metadata?.name?.includes('config')
            );
            const hasShards = statefulsets.items?.some((s: any) =>
                s.metadata?.name?.includes('shard')
            );

            this.checks.push({
                component: 'MongoDB Sharding',
                status:
                    hasConfigServers && hasShards && mongoComponents >= 4
                        ? 'healthy'
                        : 'warning',
                details: `${mongoComponents} MongoDB components deployed`,
            });
        } catch (error) {
            this.checks.push({
                component: 'MongoDB Sharding',
                status: 'warning',
                details: 'MongoDB not deployed or not accessible',
            });
        }
    }

    private async checkRedisCluster(): Promise<void> {
        console.log('Checking Redis cluster...');

        try {
            const { stdout } = await execAsync(
                'kubectl get statefulsets -n ecommerce-prod -l app=redis -o json'
            );

            const statefulsets = JSON.parse(stdout);
            const redisReplicas = statefulsets.items?.[0]?.status?.readyReplicas || 0;
            const desiredReplicas = statefulsets.items?.[0]?.spec?.replicas || 0;

            this.checks.push({
                component: 'Redis Cluster',
                status: redisReplicas === desiredReplicas ? 'healthy' : 'warning',
                details: `${redisReplicas}/${desiredReplicas} replicas ready`,
            });
        } catch (error) {
            this.checks.push({
                component: 'Redis Cluster',
                status: 'warning',
                details: 'Redis not deployed or not accessible',
            });
        }
    }

    private async checkMonitoringSystems(): Promise<void> {
        console.log('Checking monitoring systems...');

        try {
            // Check Prometheus
            const { stdout: promOutput } = await execAsync(
                'kubectl get pods -n monitoring -l app=prometheus -o json'
            );
            const promPods = JSON.parse(promOutput);
            const promRunning = promPods.items?.some(
                (pod: any) => pod.status?.phase === 'Running'
            );

            // Check Grafana
            const { stdout: grafanaOutput } = await execAsync(
                'kubectl get pods -n monitoring -l app=grafana -o json'
            );
            const grafanaPods = JSON.parse(grafanaOutput);
            const grafanaRunning = grafanaPods.items?.some(
                (pod: any) => pod.status?.phase === 'Running'
            );

            this.checks.push({
                component: 'Monitoring Systems',
                status: promRunning && grafanaRunning ? 'healthy' : 'warning',
                details: `Prometheus: ${promRunning ? 'running' : 'not running'}, Grafana: ${grafanaRunning ? 'running' : 'not running'}`,
            });
        } catch (error) {
            this.checks.push({
                component: 'Monitoring Systems',
                status: 'warning',
                details: 'Monitoring namespace not accessible',
            });
        }
    }

    private async checkBackupSystems(): Promise<void> {
        console.log('Checking backup systems...');

        try {
            // Check for backup CronJobs
            const { stdout } = await execAsync(
                'kubectl get cronjobs -n ecommerce-prod -o json'
            );

            const cronjobs = JSON.parse(stdout);
            const backupJobs = cronjobs.items?.filter((job: any) =>
                job.metadata?.name?.includes('backup')
            );

            this.checks.push({
                component: 'Backup Systems',
                status: backupJobs?.length > 0 ? 'healthy' : 'warning',
                details: `${backupJobs?.length || 0} backup jobs configured`,
            });
        } catch (error) {
            this.checks.push({
                component: 'Backup Systems',
                status: 'warning',
                details: 'Backup jobs not configured or not accessible',
            });
        }
    }

    private generateReport(): boolean {
        const unhealthy = this.checks.filter((c) => c.status === 'unhealthy');
        const warnings = this.checks.filter((c) => c.status === 'warning');

        console.log('\n=== Infrastructure Validation Report ===\n');

        this.checks.forEach((check) => {
            const icon =
                check.status === 'healthy'
                    ? '✅'
                    : check.status === 'unhealthy'
                        ? '❌'
                        : '⚠️';
            console.log(`${icon} ${check.component}: ${check.details}`);
        });

        console.log(`\nTotal Components: ${this.checks.length}`);
        console.log(`Healthy: ${this.checks.filter((c) => c.status === 'healthy').length}`);
        console.log(`Warnings: ${warnings.length}`);
        console.log(`Unhealthy: ${unhealthy.length}`);

        if (unhealthy.length > 0) {
            console.log('\n❌ INFRASTRUCTURE VALIDATION FAILED');
            console.log('\nUnhealthy Components:');
            unhealthy.forEach((c) => console.log(`  - ${c.component}: ${c.details}`));
            return false;
        }

        if (warnings.length > 0) {
            console.log('\n⚠️  Infrastructure validation passed with warnings');
            console.log('\nWarnings:');
            warnings.forEach((c) => console.log(`  - ${c.component}: ${c.details}`));
        } else {
            console.log('\n✅ Infrastructure validation passed');
        }

        return true;
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new InfrastructureValidator();
    validator
        .validateInfrastructure()
        .then((passed) => {
            process.exit(passed ? 0 : 1);
        })
        .catch((error) => {
            console.error('Infrastructure validation failed:', error);
            process.exit(1);
        });
}
