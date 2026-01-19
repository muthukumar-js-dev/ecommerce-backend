import sharp from 'sharp';
import { S3 } from 'aws-sdk';
import crypto from 'crypto';

const s3 = new S3();

export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'avif';
    generateThumbnail?: boolean;
    generateResponsive?: boolean;
}

export interface OptimizationResult {
    original: string;
    optimized: string;
    thumbnail?: string;
    responsive?: {
        small: string;
        medium: string;
        large: string;
        xlarge: string;
    };
    sizes: {
        original: number;
        optimized: number;
        thumbnail?: number;
    };
    savings: number;
    savingsPercent: number;
}

export class AssetOptimizer {
    private readonly bucket = process.env.S3_BUCKET ?? 'ecommerce-static-assets';
    private readonly cdnDomain = process.env.CDN_DOMAIN ?? 'https://cdn.yourdomain.com';

    /**
     * Optimize and upload image to S3/CDN
     */
    async optimizeImage(
        buffer: Buffer,
        filename: string,
        options: ImageOptimizationOptions = {}
    ): Promise<OptimizationResult> {
        const {
            maxWidth = 1920,
            maxHeight = 1920,
            quality = 80,
            format = 'webp',
            generateThumbnail = true,
            generateResponsive = false,
        } = options;

        // Generate unique filename
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const timestamp = Date.now();
        const baseFilename = `${hash}-${timestamp}`;

        const originalSize = buffer.length;

        // Optimize main image
        const optimized = await sharp(buffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .toFormat(format, { quality })
            .toBuffer();

        const optimizedKey = `images/${baseFilename}.${format}`;
        await this.uploadToS3(optimizedKey, optimized, `image/${format}`);

        const result: OptimizationResult = {
            original: filename,
            optimized: `${this.cdnDomain}/${optimizedKey}`,
            sizes: {
                original: originalSize,
                optimized: optimized.length,
            },
            savings: originalSize - optimized.length,
            savingsPercent: ((originalSize - optimized.length) / originalSize) * 100,
        };

        // Generate thumbnail
        if (generateThumbnail) {
            const thumbnail = await sharp(buffer)
                .resize(300, 300, { fit: 'cover' })
                .toFormat(format, { quality: 70 })
                .toBuffer();

            const thumbnailKey = `images/thumbnails/${baseFilename}.${format}`;
            await this.uploadToS3(thumbnailKey, thumbnail, `image/${format}`);

            result.thumbnail = `${this.cdnDomain}/${thumbnailKey}`;
            result.sizes.thumbnail = thumbnail.length;
        }

        // Generate responsive images
        if (generateResponsive) {
            result.responsive = await this.generateResponsiveImages(buffer, baseFilename);
        }

        return result;
    }

    /**
     * Generate responsive image sizes
     */
    private async generateResponsiveImages(
        buffer: Buffer,
        baseFilename: string
    ): Promise<{
        small: string;
        medium: string;
        large: string;
        xlarge: string;
    }> {
        const sizes = [
            { name: 'small', width: 640 },
            { name: 'medium', width: 1024 },
            { name: 'large', width: 1920 },
            { name: 'xlarge', width: 2560 },
        ];

        const results: any = {};

        for (const size of sizes) {
            const resized = await sharp(buffer)
                .resize(size.width, null, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .webp({ quality: 80 })
                .toBuffer();

            const key = `images/responsive/${size.name}/${baseFilename}.webp`;
            await this.uploadToS3(key, resized, 'image/webp');

            results[size.name] = `${this.cdnDomain}/${key}`;
        }

        return results;
    }

    /**
     * Optimize CSS files
     */
    optimizeCSS(css: string): Promise<{ optimized: string; savings: number }> {
        // Remove comments
        let optimized = css.replace(/\/\*[\s\S]*?\*\//g, '');

        // Remove whitespace
        optimized = optimized.replace(/\s+/g, ' ');
        optimized = optimized.replace(/\s*{\s*/g, '{');
        optimized = optimized.replace(/\s*}\s*/g, '}');
        optimized = optimized.replace(/\s*;\s*/g, ';');
        optimized = optimized.replace(/\s*:\s*/g, ':');

        const originalSize = Buffer.byteLength(css);
        const optimizedSize = Buffer.byteLength(optimized);

        return Promise.resolve({
            optimized,
            savings: originalSize - optimizedSize,
        });
    }

    /**
     * Optimize JavaScript files
     */
    optimizeJS(js: string): Promise<{ optimized: string; savings: number }> {
        // Remove single-line comments
        let optimized = js.replace(/\/\/.*$/gm, '');

        // Remove multi-line comments
        optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');

        // Remove extra whitespace
        optimized = optimized.replace(/\s+/g, ' ');

        const originalSize = Buffer.byteLength(js);
        const optimizedSize = Buffer.byteLength(optimized);

        return Promise.resolve({
            optimized,
            savings: originalSize - optimizedSize,
        });
    }

    /**
     * Upload file to S3 with optimal cache headers
     */
    private async uploadToS3(
        key: string,
        buffer: Buffer,
        contentType: string
    ): Promise<void> {
        await s3
            .putObject({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000, immutable',
                ContentEncoding: 'gzip',
            })
            .promise();
    }

    /**
     * Get optimization statistics
     */
    getStats(result: OptimizationResult): string {
        return `
Optimization Stats:
- Original: ${(result.sizes.original / 1024).toFixed(2)} KB
- Optimized: ${(result.sizes.optimized / 1024).toFixed(2)} KB
- Savings: ${(result.savings / 1024).toFixed(2)} KB (${result.savingsPercent.toFixed(1)}%)
${result.thumbnail ? `- Thumbnail: ${(result.sizes.thumbnail! / 1024).toFixed(2)} KB` : ''}
    `.trim();
    }
}

// Export singleton
export const assetOptimizer = new AssetOptimizer();
