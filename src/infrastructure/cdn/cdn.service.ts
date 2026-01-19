import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
    CloudFrontClient,
    CreateInvalidationCommand,
    GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { createLogger } from '../logging/logger';
import winston from 'winston';

export interface CDNConfig {
    distributionId: string;
    domain: string;
    s3Bucket: string;
    s3Region: string;
    cacheTTL: {
        images: number;
        css: number;
        js: number;
        fonts: number;
        default: number;
    };
}

export class CDNService {
    private s3Client: S3Client;
    private cloudFrontClient: CloudFrontClient;
    private logger: winston.Logger;
    private config: CDNConfig;

    constructor(config: CDNConfig) {
        this.config = config;
        this.s3Client = new S3Client({ region: config.s3Region });
        this.cloudFrontClient = new CloudFrontClient({ region: 'us-east-1' }); // CloudFront is global
        this.logger = createLogger('CDNService');
    }

    /**
     * Upload asset to S3 and get CDN URL
     */
    async uploadAsset(
        key: string,
        buffer: Buffer,
        contentType: string
    ): Promise<{ cdnUrl: string; s3Url: string }> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.config.s3Bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                CacheControl: this.getCacheControl(key),
            });

            await this.s3Client.send(command);

            const s3Url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;
            const cdnUrl = `https://${this.config.domain}/${key}`;

            this.logger.info(`Asset uploaded successfully: ${key}`);

            return { cdnUrl, s3Url };
        } catch (error: unknown) {
            this.logger.error(`Failed to upload asset: ${key}`, error);
            throw error;
        }
    }

    /**
     * Delete asset from S3 and invalidate CDN cache
     */
    async deleteAsset(key: string): Promise<void> {
        try {
            // Delete from S3
            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.config.s3Bucket,
                Key: key,
            });

            await this.s3Client.send(deleteCommand);

            // Invalidate CDN cache
            await this.invalidateCache([`/${key}`]);

            this.logger.info(`Asset deleted successfully: ${key}`);
        } catch (error: unknown) {
            this.logger.error(`Failed to delete asset: ${key}`, error);
            throw error;
        }
    }

    /**
     * Invalidate CDN cache for specific paths
     */
    async invalidateCache(paths: string[]): Promise<string> {
        try {
            const command = new CreateInvalidationCommand({
                DistributionId: this.config.distributionId,
                InvalidationBatch: {
                    CallerReference: `invalidation-${Date.now()}`,
                    Paths: {
                        Quantity: paths.length,
                        Items: paths,
                    },
                },
            });

            const response = await this.cloudFrontClient.send(command);
            const invalidationId = response.Invalidation?.Id ?? '';

            this.logger.info(`CDN cache invalidated for paths: ${paths.join(', ')}`);

            return invalidationId;
        } catch (error: unknown) {
            this.logger.error('Failed to invalidate CDN cache', error);
            throw error;
        }
    }

    /**
     * Get CDN URL for a given asset key
     */
    getCDNUrl(key: string): string {
        return `https://${this.config.domain}/${key}`;
    }

    /**
     * Get cache control header based on file type
     */
    private getCacheControl(key: string): string {
        const extension = key.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
            case 'svg':
                return `public, max-age=${this.config.cacheTTL.images}`;
            case 'css':
                return `public, max-age=${this.config.cacheTTL.css}`;
            case 'js':
                return `public, max-age=${this.config.cacheTTL.js}`;
            case 'woff':
            case 'woff2':
            case 'ttf':
            case 'eot':
                return `public, max-age=${this.config.cacheTTL.fonts}`;
            default:
                return `public, max-age=${this.config.cacheTTL.default}`;
        }
    }

    /**
     * Get distribution status
     */
    async getDistributionStatus(): Promise<{
        status: string;
        enabled: boolean;
        domainName: string;
    }> {
        try {
            const command = new GetDistributionCommand({
                Id: this.config.distributionId,
            });

            const response = await this.cloudFrontClient.send(command);
            const distribution = response.Distribution;

            return {
                status: distribution?.Status ?? 'Unknown',
                enabled: distribution?.DistributionConfig?.Enabled ?? false,
                domainName: distribution?.DomainName ?? '',
            };
        } catch (error: unknown) {
            this.logger.error('Failed to get distribution status', error);
            throw error;
        }
    }
}

// Singleton instance
let cdnServiceInstance: CDNService | null = null;

export function initializeCDNService(config: CDNConfig): CDNService {
    if (!cdnServiceInstance) {
        cdnServiceInstance = new CDNService(config);
    }
    return cdnServiceInstance;
}

export function getCDNService(): CDNService {
    if (!cdnServiceInstance) {
        throw new Error('CDN Service not initialized. Call initializeCDNService first.');
    }
    return cdnServiceInstance;
}
