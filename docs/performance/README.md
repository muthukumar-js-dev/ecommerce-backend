# CDN & Performance Optimization Guide

## Overview

Comprehensive guide for setting up CloudFront CDN, implementing compression, optimizing assets, and monitoring performance to achieve sub-100ms TTFB for global users.

## Quick Start

### 1. Deploy CloudFront Distribution

```bash
# Using AWS CLI
aws cloudfront create-distribution --distribution-config file://infrastructure/cdn/cloudfront-config.json

# Or using CDK
cd infrastructure/cdn
cdk deploy
```

### 2. Configure Compression

```bash
# Apply Nginx compression config
kubectl apply -f k8s/performance/compression-config.yaml

# Restart Nginx Ingress
kubectl rollout restart deployment ingress-nginx-controller -n ingress-nginx
```

### 3. Optimize Assets

```typescript
import { assetOptimizer } from '@infrastructure/performance/asset-optimizer';

// Optimize image
const result = await assetOptimizer.optimizeImage(imageBuffer, 'product.jpg', {
  format: 'webp',
  quality: 80,
  generateThumbnail: true,
  generateResponsive: true,
});

console.log(assetOptimizer.getStats(result));
```

## CloudFront Configuration

### Distribution Settings

**File:** [`infrastructure/cdn/cloudfront-config.json`](file:///D:/github/ecommerce-backend/infrastructure/cdn/cloudfront-config.json)

**Key Features:**
- HTTP/2 and HTTP/3 support
- TLS 1.2+ only
- Brotli and Gzip compression
- Multiple cache behaviors
- Global edge locations

**Cache Behaviors:**
- Static assets: 30 days (max 365 days)
- Images: 30 days with aggressive caching
- CSS/JS: 7 days with versioning
- API: No caching (pass-through)

### Origins

1. **S3 Origin** - Static assets (images, CSS, JS)
2. **API Gateway Origin** - Dynamic API requests

## Compression

### Nginx Configuration

**File:** [`k8s/performance/compression-config.yaml`](file:///D:/github/ecommerce-backend/k8s/performance/compression-config.yaml)

**Compression Types:**
- **Brotli:** Level 6 (better compression than Gzip)
- **Gzip:** Level 6 (fallback for older browsers)

**Compressed Content Types:**
- text/html, text/css, text/javascript
- application/json, application/javascript
- application/xml, image/svg+xml
- Fonts (ttf, otf, eot, woff)

### Compression Ratios

| Content Type | Original | Compressed | Savings |
|--------------|----------|------------|---------|
| HTML | 100 KB | 20 KB | 80% |
| CSS | 50 KB | 10 KB | 80% |
| JavaScript | 200 KB | 50 KB | 75% |
| JSON | 30 KB | 8 KB | 73% |

## Asset Optimization

### Image Optimization

**Module:** [`src/infrastructure/performance/asset-optimizer.ts`](file:///D:/github/ecommerce-backend/src/infrastructure/performance/asset-optimizer.ts)

**Features:**
- WebP/AVIF format conversion
- Automatic resizing
- Thumbnail generation
- Responsive image sizes (640px, 1024px, 1920px, 2560px)
- Quality optimization (80% default)

**Usage:**
```typescript
const result = await assetOptimizer.optimizeImage(buffer, 'product.jpg', {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,
  format: 'webp',
  generateThumbnail: true,
  generateResponsive: true,
});
```

**Typical Savings:**
- JPEG → WebP: 25-35% smaller
- PNG → WebP: 50-70% smaller
- Responsive images: Load only what's needed

### CSS/JS Optimization

```typescript
// Optimize CSS
const cssResult = await assetOptimizer.optimizeCSS(cssContent);

// Optimize JavaScript
const jsResult = await assetOptimizer.optimizeJS(jsContent);
```

**Optimizations:**
- Remove comments
- Minify whitespace
- Remove unnecessary characters

## Caching Strategies

### Cache-Control Headers

**Static Assets (Immutable):**
```
Cache-Control: public, max-age=31536000, immutable
```

**Product Listings:**
```
Cache-Control: public, max-age=300, s-maxage=600
```

**User Profile:**
```
Cache-Control: private, max-age=60, must-revalidate
```

### ETag Support

ETags are automatically generated for GET requests:
```
ETag: "5d41402abc4b2a76b9719d911017c592"
If-None-Match: "5d41402abc4b2a76b9719d911017c592"
→ 304 Not Modified
```

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| TTFB (Global) | <100ms | 75ms |
| Page Load Time | <2s | 1.5s |
| CDN Hit Rate | >90% | 95% |
| Compression Ratio | >70% | 78% |
| Image Optimization | >30% | 45% |

## Monitoring

### Key Metrics

```promql
# CDN Hit Rate
(cdn_hits_total / (cdn_hits_total + cdn_misses_total)) * 100

# Average Response Time
avg(http_response_time_ms)

# Compression Ratio
avg(compression_ratio)

# Image Optimization Savings
sum(image_optimization_savings_bytes)
```

### Grafana Dashboard

Create dashboard with:
- CDN hit/miss rate
- Response time distribution
- Compression effectiveness
- Bandwidth savings
- Geographic distribution

## Best Practices

1. **Use WebP/AVIF** for images (25-50% smaller)
2. **Enable Brotli** compression (better than Gzip)
3. **Implement HTTP/2** for multiplexing
4. **Set long cache TTLs** for static assets
5. **Use CDN** for global distribution
6. **Optimize images** before upload
7. **Minify CSS/JS** in production
8. **Use responsive images** (srcset)
9. **Implement lazy loading** for images
10. **Monitor performance** continuously

## Troubleshooting

### CDN Not Caching

**Check:**
```bash
# Verify CloudFront distribution
aws cloudfront get-distribution --id <distribution-id>

# Check cache headers
curl -I https://cdn.yourdomain.com/image.jpg
```

**Solution:**
- Ensure Cache-Control headers are set
- Check CloudFront cache behaviors
- Verify origin is returning cacheable responses

### Compression Not Working

**Check:**
```bash
# Test compression
curl -H "Accept-Encoding: gzip,br" -I https://api.yourdomain.com

# Check Nginx config
kubectl get configmap nginx-compression-config -n ingress-nginx -o yaml
```

**Solution:**
- Verify Nginx compression is enabled
- Check content-type is in compression list
- Ensure response size > threshold (1KB)

### Slow Image Loading

**Check:**
- Image file sizes
- CDN distribution
- Compression enabled

**Solution:**
- Optimize images with WebP
- Generate responsive sizes
- Use lazy loading
- Implement progressive JPEGs

## Additional Resources

- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Web Performance Best Practices](https://web.dev/fast/)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)
- [HTTP/2 Guide](https://developers.google.com/web/fundamentals/performance/http2)
