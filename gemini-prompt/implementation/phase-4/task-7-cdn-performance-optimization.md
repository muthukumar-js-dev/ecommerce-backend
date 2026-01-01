# Phase 4 - Task 7: CDN & Performance Optimization

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Tasks 1-6 (Infrastructure Secure)

---

## Objective

Setup CloudFront CDN for global content delivery, implement comprehensive performance optimizations including compression, HTTP/2, image optimization, and advanced caching strategies to achieve sub-100ms TTFB and minimize latency for 10 million users.

---

## Context

Performance optimization provides:
- **Global Content Delivery:** CDN edge locations worldwide
- **Reduced Latency:** Cache content closer to users
- **Bandwidth Savings:** Compression and optimization
- **Improved UX:** Faster page loads and interactions
- **Cost Efficiency:** Reduced origin server load

---

## Implementation Steps

### Step 1: S3 Bucket Setup for Static Assets

**Create and configure S3 bucket:**

```bash
# Create bucket
aws s3 mb s3://ecommerce-static-assets --region ap-south-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ecommerce-static-assets \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket ecommerce-static-assets \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Configure lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket ecommerce-static-assets \
  --lifecycle-configuration file://s3-lifecycle.json
```

**Create `s3-lifecycle.json`:**

```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    },
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

### Step 2: CloudFront Distribution Setup

**Create comprehensive CloudFront configuration:**

```typescript
// infrastructure/cdn/cloudfront-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class CloudFrontStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for static assets
    const assetsBucket = s3.Bucket.fromBucketName(
      this,
      'StaticAssets',
      'ecommerce-static-assets'
    );

    // S3 bucket for CloudFront logs
    const logsBucket = new s3.Bucket(this, 'CDNLogs', {
      bucketName: 'ecommerce-cdn-logs',
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    // SSL Certificate
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      'arn:aws:acm:us-east-1:123456789012:certificate/...'
    );

    // Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for ecommerce static assets',
    });

    // Grant read permissions to OAI
    assetsBucket.grantRead(oai);

    // Custom cache policies
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(
      this,
      'StaticAssetsCachePolicy',
      {
        cachePolicyName: 'StaticAssetsCachePolicy',
        comment: 'Cache policy for static assets (images, CSS, JS)',
        defaultTtl: cdk.Duration.days(30),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.days(1),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      }
    );

    const apiCachePolicy = new cloudfront.CachePolicy(
      this,
      'APICachePolicy',
      {
        cachePolicyName: 'APICachePolicy',
        comment: 'Cache policy for API responses',
        defaultTtl: cdk.Duration.minutes(5),
        maxTtl: cdk.Duration.hours(1),
        minTtl: cdk.Duration.seconds(0),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Authorization',
          'Accept',
          'Accept-Language'
        ),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      }
    );

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'CDN', {
      comment: 'E-Commerce CDN Distribution',
      
      // Default behavior - S3 static assets
      defaultBehavior: {
        origin: new origins.S3Origin(assetsBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: staticAssetsCachePolicy,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      },

      // Additional behaviors
      additionalBehaviors: {
        // API endpoints - no caching
        '/api/*': {
          origin: new origins.HttpOrigin('api.yourdomain.com', {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            httpsPort: 443,
            originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
            readTimeout: cdk.Duration.seconds(30),
            keepaliveTimeout: cdk.Duration.seconds(5),
          }),
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },

        // Images - aggressive caching
        '/images/*': {
          origin: new origins.S3Origin(assetsBucket, {
            originAccessIdentity: oai,
          }),
          cachePolicy: new cloudfront.CachePolicy(this, 'ImageCachePolicy', {
            cachePolicyName: 'ImageCachePolicy',
            defaultTtl: cdk.Duration.days(30),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
          }),
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },

        // CSS/JS - moderate caching with versioning
        '/static/*': {
          origin: new origins.S3Origin(assetsBucket, {
            originAccessIdentity: oai,
          }),
          cachePolicy: new cloudfront.CachePolicy(this, 'StaticFilesCachePolicy', {
            cachePolicyName: 'StaticFilesCachePolicy',
            defaultTtl: cdk.Duration.days(7),
            maxTtl: cdk.Duration.days(30),
            minTtl: cdk.Duration.hours(1),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
          }),
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },

      // Geographic restrictions
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Europe, Asia
      geoRestriction: cloudfront.GeoRestriction.allowlist(
        'IN', 'US', 'GB', 'SG', 'AU', 'CA', 'DE', 'FR', 'JP'
      ),

      // SSL/TLS
      certificate: certificate,
      domainNames: ['cdn.yourdomain.com', 'assets.yourdomain.com'],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: cloudfront.SSLMethod.SNI,

      // Logging
      enableLogging: true,
      logBucket: logsBucket,
      logFilePrefix: 'cdn-logs/',
      logIncludesCookies: false,

      // Error responses
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 500,
          responseHttpStatus: 500,
          responsePagePath: '/500.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],

      // HTTP version
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,

      // Enable IPv6
      enableIpv6: true,
    });

    // Output distribution domain
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });
  }
}
```

### Step 3: Compression Middleware

**Install compression libraries:**

```bash
npm install compression
npm install --save-dev @types/compression
```

**Implement advanced compression middleware:**

```typescript
// src/infrastructure/http/middleware/compression.middleware.ts
import compression from 'compression';
import { Request, Response } from 'express';
import zlib from 'zlib';

export const compressionMiddleware = compression({
  // Filter function to determine if response should be compressed
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress images (already compressed)
    const contentType = res.getHeader('Content-Type') as string;
    if (contentType && contentType.startsWith('image/')) {
      return false;
    }

    // Use compression filter for other content
    return compression.filter(req, res);
  },

  // Compression level (0-9, higher = better compression but slower)
  level: 6,

  // Only compress responses larger than 1KB
  threshold: 1024,

  // Brotli compression settings (better than gzip)
  chunkSize: 16 * 1024,
  memLevel: 8,
  strategy: zlib.constants.Z_DEFAULT_STRATEGY,
});

// Brotli compression middleware (for modern browsers)
export const brotliMiddleware = compression({
  filter: (req: Request, res: Response) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    return acceptEncoding.includes('br') && compression.filter(req, res);
  },
  threshold: 1024,
});
```

### Step 4: HTTP/2 and HTTP/3 Support

**Configure Nginx Ingress for HTTP/2:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  use-http2: "true"
  http2-max-field-size: "16k"
  http2-max-header-size: "32k"
  enable-brotli: "true"
  brotli-level: "6"
  brotli-types: "text/xml image/svg+xml application/x-font-ttf image/vnd.microsoft.icon application/x-font-opentype application/json font/eot application/vnd.ms-fontobject application/javascript font/otf application/xml application/xhtml+xml text/javascript application/x-javascript text/plain application/x-font-truetype application/xml+rss image/x-icon font/opentype text/css image/x-win-bitmap"
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: ecommerce-prod
  annotations:
    nginx.ingress.kubernetes.io/http2-push-preload: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://yourdomain.com"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: SAMEORIGIN";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: api-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
```

### Step 5: Image Optimization Service

**Install image processing libraries:**

```bash
npm install sharp aws-sdk
npm install --save-dev @types/sharp
```

**Create comprehensive image optimizer:**

```typescript
// src/infrastructure/storage/image-optimizer.ts
import sharp from 'sharp';
import AWS from 'aws-sdk';
import crypto from 'crypto';

const s3 = new AWS.S3();

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  generateThumbnail?: boolean;
}

export class ImageOptimizer {
  private readonly bucket = 'ecommerce-static-assets';
  private readonly cdnDomain = 'https://cdn.yourdomain.com';

  async optimizeAndUpload(
    buffer: Buffer,
    filename: string,
    options: ImageOptimizationOptions = {}
  ): Promise<{
    original: string;
    optimized: string;
    thumbnail?: string;
    sizes: { original: number; optimized: number; thumbnail?: number };
  }> {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 80,
      format = 'webp',
      generateThumbnail = true,
    } = options;

    // Generate unique filename
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const baseFilename = `${hash}-${Date.now()}`;

    // Original size
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

    const result = {
      original: filename,
      optimized: `${this.cdnDomain}/${optimizedKey}`,
      sizes: {
        original: originalSize,
        optimized: optimized.length,
      },
    };

    // Generate thumbnail if requested
    if (generateThumbnail) {
      const thumbnail = await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
        })
        .toFormat(format, { quality: 70 })
        .toBuffer();

      const thumbnailKey = `images/thumbnails/${baseFilename}.${format}`;
      await this.uploadToS3(thumbnailKey, thumbnail, `image/${format}`);

      result.thumbnail = `${this.cdnDomain}/${thumbnailKey}`;
      result.sizes.thumbnail = thumbnail.length;
    }

    return result;
  }

  async generateResponsiveImages(
    buffer: Buffer,
    filename: string
  ): Promise<{
    small: string;
    medium: string;
    large: string;
    xlarge: string;
  }> {
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const baseFilename = `${hash}-${Date.now()}`;

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
        ACL: 'public-read',
      })
      .promise();
  }
}
```

### Step 6: Advanced Caching Strategies

**Implement ETag and Cache-Control:**

```typescript
// src/infrastructure/http/middleware/cache.middleware.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  mustRevalidate?: boolean;
  public?: boolean;
  immutable?: boolean;
}

export function cacheControl(options: CacheOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const directives: string[] = [];

    if (options.public) {
      directives.push('public');
    } else {
      directives.push('private');
    }

    if (options.maxAge !== undefined) {
      directives.push(`max-age=${options.maxAge}`);
    }

    if (options.sMaxAge !== undefined) {
      directives.push(`s-maxage=${options.sMaxAge}`);
    }

    if (options.mustRevalidate) {
      directives.push('must-revalidate');
    }

    if (options.immutable) {
      directives.push('immutable');
    }

    res.setHeader('Cache-Control', directives.join(', '));
    next();
  };
}

export function etagMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalSend = res.send;

  res.send = function (data: any): Response {
    if (req.method === 'GET' && res.statusCode === 200) {
      // Generate ETag
      const etag = `"${crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex')}"`;

      res.setHeader('ETag', etag);

      // Check if client has cached version
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === etag) {
        res.status(304).end();
        return res;
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

// Vary header for content negotiation
export function varyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Vary', 'Accept-Encoding, Accept-Language, Authorization');
  next();
}
```

**Apply caching to routes:**

```typescript
// Example usage in routes
import { cacheControl, etagMiddleware } from './middleware/cache.middleware';

// Static assets - cache for 1 year
router.get('/static/*', 
  cacheControl({ public: true, maxAge: 31536000, immutable: true }),
  serveStatic
);

// Product listings - cache for 5 minutes
router.get('/api/products',
  cacheControl({ public: true, maxAge: 300, sMaxAge: 600 }),
  etagMiddleware,
  getProducts
);

// User profile - private, cache for 1 minute
router.get('/api/users/profile',
  authMiddleware,
  cacheControl({ public: false, maxAge: 60, mustRevalidate: true }),
  etagMiddleware,
  getUserProfile
);
```

### Step 7: Performance Monitoring

**Create comprehensive performance metrics:**

```typescript
// src/infrastructure/monitoring/performance-metrics.ts
import { Histogram, Counter, Gauge, register } from 'prom-client';

export class PerformanceMetrics {
  private responseTime: Histogram;
  private cdnHitRate: Counter;
  private cdnMissRate: Counter;
  private compressionRatio: Histogram;
  private imageOptimizationSavings: Histogram;
  private cacheSize: Gauge;

  constructor() {
    this.responseTime = new Histogram({
      name: 'http_response_time_ms',
      help: 'HTTP response time in milliseconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000],
      registers: [register],
    });

    this.cdnHitRate = new Counter({
      name: 'cdn_hits_total',
      help: 'Total number of CDN cache hits',
      labelNames: ['path', 'edge_location'],
      registers: [register],
    });

    this.cdnMissRate = new Counter({
      name: 'cdn_misses_total',
      help: 'Total number of CDN cache misses',
      labelNames: ['path', 'edge_location'],
      registers: [register],
    });

    this.compressionRatio = new Histogram({
      name: 'compression_ratio',
      help: 'Compression ratio achieved',
      labelNames: ['content_type', 'algorithm'],
      buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
      registers: [register],
    });

    this.imageOptimizationSavings = new Histogram({
      name: 'image_optimization_savings_bytes',
      help: 'Bytes saved through image optimization',
      buckets: [1000, 10000, 50000, 100000, 500000, 1000000],
      registers: [register],
    });

    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Current cache size in bytes',
      labelNames: ['cache_type'],
      registers: [register],
    });
  }

  recordResponseTime(
    method: string,
    route: string,
    status: number,
    duration: number
  ): void {
    this.responseTime.observe({ method, route, status }, duration);
  }

  recordCDNHit(path: string, edgeLocation: string): void {
    this.cdnHitRate.inc({ path, edge_location: edgeLocation });
  }

  recordCDNMiss(path: string, edgeLocation: string): void {
    this.cdnMissRate.inc({ path, edge_location: edgeLocation });
  }

  recordCompressionRatio(
    contentType: string,
    algorithm: string,
    ratio: number
  ): void {
    this.compressionRatio.observe({ content_type: contentType, algorithm }, ratio);
  }

  recordImageOptimization(originalSize: number, optimizedSize: number): void {
    const savings = originalSize - optimizedSize;
    this.imageOptimizationSavings.observe(savings);
  }

  updateCacheSize(cacheType: string, size: number): void {
    this.cacheSize.set({ cache_type: cacheType }, size);
  }

  getCDNHitRate(): number {
    const hits = this.cdnHitRate['hashMap'];
    const misses = this.cdnMissRate['hashMap'];
    
    let totalHits = 0;
    let totalMisses = 0;

    for (const key in hits) {
      totalHits += hits[key].value;
    }

    for (const key in misses) {
      totalMisses += misses[key].value;
    }

    const total = totalHits + totalMisses;
    return total === 0 ? 0 : (totalHits / total) * 100;
  }
}

// Export singleton instance
export const performanceMetrics = new PerformanceMetrics();
```

**Performance monitoring middleware:**

```typescript
// src/infrastructure/http/middleware/performance-monitor.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { performanceMetrics } from '@infrastructure/monitoring/performance-metrics';

export function performanceMonitorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Capture original end function
  const originalEnd = res.end;

  res.end = function (...args: any[]): any {
    const duration = Date.now() - start;
    
    // Record response time
    performanceMetrics.recordResponseTime(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );

    // Record CDN hit/miss
    const cdnStatus = res.getHeader('x-cache') as string;
    const edgeLocation = res.getHeader('x-amz-cf-pop') as string;
    
    if (cdnStatus === 'Hit from cloudfront') {
      performanceMetrics.recordCDNHit(req.path, edgeLocation);
    } else if (cdnStatus === 'Miss from cloudfront') {
      performanceMetrics.recordCDNMiss(req.path, edgeLocation);
    }

    // Record compression ratio
    const contentLength = parseInt(res.getHeader('content-length') as string);
    const originalLength = parseInt(res.getHeader('x-original-content-length') as string);
    
    if (contentLength && originalLength) {
      const ratio = contentLength / originalLength;
      const contentType = res.getHeader('content-type') as string;
      const encoding = res.getHeader('content-encoding') as string;
      
      performanceMetrics.recordCompressionRatio(
        contentType,
        encoding || 'none',
        ratio
      );
    }

    return originalEnd.apply(res, args);
  };

  next();
}
```

### Step 8: Performance Testing

**Create performance test suite:**

```typescript
// tests/performance/cdn-performance.test.ts
import axios from 'axios';

describe('CDN Performance Tests', () => {
  const cdnUrl = 'https://cdn.yourdomain.com';
  const apiUrl = 'https://api.yourdomain.com';

  it('should serve static assets from CDN with cache hit', async () => {
    // First request - cache miss
    const firstResponse = await axios.get(`${cdnUrl}/images/logo.png`);
    expect(firstResponse.headers['x-cache']).toContain('Miss');

    // Second request - cache hit
    const secondResponse = await axios.get(`${cdnUrl}/images/logo.png`);
    expect(secondResponse.headers['x-cache']).toContain('Hit');
  });

  it('should achieve TTFB < 100ms for cached content', async () => {
    const start = Date.now();
    await axios.get(`${cdnUrl}/static/app.js`);
    const ttfb = Date.now() - start;

    expect(ttfb).toBeLessThan(100);
  });

  it('should compress responses with gzip or brotli', async () => {
    const response = await axios.get(`${apiUrl}/api/products`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const encoding = response.headers['content-encoding'];
    expect(['gzip', 'br']).toContain(encoding);
  });

  it('should return optimized images in WebP format', async () => {
    const response = await axios.get(`${cdnUrl}/images/product-1.webp`);
    expect(response.headers['content-type']).toBe('image/webp');
  });

  it('should respect ETag for conditional requests', async () => {
    const firstResponse = await axios.get(`${apiUrl}/api/products`);
    const etag = firstResponse.headers['etag'];

    const secondResponse = await axios.get(`${apiUrl}/api/products`, {
      headers: {
        'If-None-Match': etag,
      },
      validateStatus: () => true,
    });

    expect(secondResponse.status).toBe(304);
  });
});
```

---

## Testing

**Manual testing checklist:**

```bash
# Test CDN distribution
curl -I https://cdn.yourdomain.com/images/logo.png

# Test compression
curl -H "Accept-Encoding: gzip, deflate, br" \
  -I https://api.yourdomain.com/api/products

# Test cache headers
curl -I https://api.yourdomain.com/api/products

# Test ETag
ETAG=$(curl -s -I https://api.yourdomain.com/api/products | grep -i etag | cut -d' ' -f2)
curl -H "If-None-Match: $ETAG" -I https://api.yourdomain.com/api/products

# Test HTTP/2
curl --http2 -I https://api.yourdomain.com/health
```

---

## Deliverables

- [ ] CloudFront distribution configured
- [ ] S3 bucket for static assets
- [ ] Compression middleware (gzip + brotli)
- [ ] HTTP/2 and HTTP/3 enabled
- [ ] Image optimization service
- [ ] Responsive image generation
- [ ] ETag and Cache-Control headers
- [ ] Performance monitoring
- [ ] CDN hit rate > 80%
- [ ] TTFB < 100ms
- [ ] Tests passing
- [ ] Documentation

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| CDN Hit Rate | > 80% | CloudWatch |
| TTFB (Cached) | < 100ms | Synthetic monitoring |
| TTFB (Uncached) | < 500ms | Synthetic monitoring |
| Image Load Time | < 500ms | Real User Monitoring |
| Page Load Time | < 2 seconds | Lighthouse |
| Compression Ratio | > 60% | Prometheus |
| Bandwidth Savings | > 50% | CloudFront reports |

---

## Monitoring Dashboards

**Create Grafana dashboard for CDN metrics:**

```json
{
  "dashboard": {
    "title": "CDN Performance",
    "panels": [
      {
        "title": "CDN Hit Rate",
        "targets": [{
          "expr": "(cdn_hits_total / (cdn_hits_total + cdn_misses_total)) * 100"
        }]
      },
      {
        "title": "Response Time by Edge Location",
        "targets": [{
          "expr": "histogram_quantile(0.95, http_response_time_ms)"
        }]
      },
      {
        "title": "Compression Ratio",
        "targets": [{
          "expr": "avg(compression_ratio)"
        }]
      },
      {
        "title": "Bandwidth Savings",
        "targets": [{
          "expr": "sum(image_optimization_savings_bytes)"
        }]
      }
    ]
  }
}
```

---

## Next Steps

After completing this task:
1. Proceed to **Task 8: Disaster Recovery & Backup**
2. Monitor CDN performance metrics
3. Optimize cache policies based on usage patterns
4. A/B test different compression strategies

---

**Task Owner:** DevOps + Frontend Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
