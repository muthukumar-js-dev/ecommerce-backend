export interface CloudFrontConfig {
    distributionId?: string;
    domain: string;
    s3Bucket: string;
    s3Region: string;
    priceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
    cacheBehaviors: CacheBehavior[];
    customErrorResponses?: CustomErrorResponse[];
}

export interface CacheBehavior {
    pathPattern: string;
    targetOriginId: string;
    viewerProtocolPolicy: 'allow-all' | 'https-only' | 'redirect-to-https';
    allowedMethods: string[];
    cachedMethods: string[];
    minTTL: number;
    defaultTTL: number;
    maxTTL: number;
    compress: boolean;
}

export interface CustomErrorResponse {
    errorCode: number;
    responseCode: number;
    responsePagePath: string;
    errorCachingMinTTL: number;
}

export const defaultCloudFrontConfig: CloudFrontConfig = {
    domain: process.env.CDN_DOMAIN ?? 'cdn.profitcart.com',
    s3Bucket: process.env.CDN_S3_BUCKET ?? 'profitcart-static-assets',
    s3Region: process.env.CDN_S3_REGION ?? 'us-east-1',
    priceClass: 'PriceClass_100', // Use only North America and Europe edge locations
    cacheBehaviors: [
        {
            pathPattern: '/images/*',
            targetOriginId: 'S3-static-assets',
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            cachedMethods: ['GET', 'HEAD'],
            minTTL: 0,
            defaultTTL: 86400, // 1 day
            maxTTL: 31536000, // 1 year
            compress: true,
        },
        {
            pathPattern: '/css/*',
            targetOriginId: 'S3-static-assets',
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            cachedMethods: ['GET', 'HEAD'],
            minTTL: 0,
            defaultTTL: 3600, // 1 hour
            maxTTL: 86400, // 1 day
            compress: true,
        },
        {
            pathPattern: '/js/*',
            targetOriginId: 'S3-static-assets',
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            cachedMethods: ['GET', 'HEAD'],
            minTTL: 0,
            defaultTTL: 3600, // 1 hour
            maxTTL: 86400, // 1 day
            compress: true,
        },
        {
            pathPattern: '/fonts/*',
            targetOriginId: 'S3-static-assets',
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            cachedMethods: ['GET', 'HEAD'],
            minTTL: 0,
            defaultTTL: 604800, // 7 days
            maxTTL: 31536000, // 1 year
            compress: true,
        },
    ],
    customErrorResponses: [
        {
            errorCode: 404,
            responseCode: 404,
            responsePagePath: '/404.html',
            errorCachingMinTTL: 300,
        },
        {
            errorCode: 403,
            responseCode: 403,
            responsePagePath: '/403.html',
            errorCachingMinTTL: 300,
        },
    ],
};

export const cdnConfig = {
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID ?? '',
    domain: process.env.CDN_DOMAIN ?? 'cdn.profitcart.com',
    s3Bucket: process.env.CDN_S3_BUCKET ?? 'profitcart-static-assets',
    s3Region: process.env.CDN_S3_REGION ?? 'us-east-1',
    cacheTTL: {
        images: 86400, // 1 day
        css: 3600, // 1 hour
        js: 3600, // 1 hour
        fonts: 604800, // 7 days
        default: 300, // 5 minutes
    },
};
