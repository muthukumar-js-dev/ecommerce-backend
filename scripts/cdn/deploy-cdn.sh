#!/bin/bash

# CDN Deployment Script
# This script sets up CloudFront distribution and S3 bucket for static assets

set -e

echo "🚀 Starting CDN deployment..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
S3_BUCKET="${CDN_S3_BUCKET:-profitcart-static-assets}"
S3_REGION="${CDN_S3_REGION:-us-east-1}"
CDN_DOMAIN="${CDN_DOMAIN:-cdn.profitcart.com}"

echo "📦 Configuration:"
echo "  S3 Bucket: $S3_BUCKET"
echo "  S3 Region: $S3_REGION"
echo "  CDN Domain: $CDN_DOMAIN"

# Step 1: Create S3 bucket
echo ""
echo "📦 Step 1: Creating S3 bucket..."
if aws s3 ls "s3://$S3_BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
  aws s3 mb "s3://$S3_BUCKET" --region "$S3_REGION"
  echo "✅ S3 bucket created: $S3_BUCKET"
else
  echo "ℹ️  S3 bucket already exists: $S3_BUCKET"
fi

# Step 2: Configure S3 bucket for static website hosting
echo ""
echo "🌐 Step 2: Configuring S3 bucket..."
aws s3api put-bucket-cors --bucket "$S3_BUCKET" --cors-configuration file://infrastructure/cdn/s3-cors-config.json
echo "✅ CORS configuration applied"

# Step 3: Create CloudFront distribution
echo ""
echo "☁️  Step 3: Creating CloudFront distribution..."

# Check if distribution already exists
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "Creating new CloudFront distribution..."
  
  # Create distribution config from template
  cat > /tmp/cloudfront-config.json <<EOF
{
  "CallerReference": "profitcart-cdn-$(date +%s)",
  "Comment": "ProfitCart CDN Distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-static-assets",
        "DomainName": "$S3_BUCKET.s3.$S3_REGION.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-static-assets",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "PriceClass": "PriceClass_100"
}
EOF

  DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cloudfront-config.json \
    --query 'Distribution.Id' \
    --output text)
  
  echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"
  echo ""
  echo "⚠️  IMPORTANT: Add this to your .env file:"
  echo "CLOUDFRONT_DISTRIBUTION_ID=$DISTRIBUTION_ID"
else
  echo "ℹ️  Using existing CloudFront distribution: $DISTRIBUTION_ID"
fi

# Step 4: Wait for distribution to be deployed
echo ""
echo "⏳ Step 4: Waiting for distribution to be deployed..."
echo "This may take 10-15 minutes..."

aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"
echo "✅ Distribution deployed successfully"

# Step 5: Get distribution domain name
DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text)

echo ""
echo "🎉 CDN deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your DNS to point $CDN_DOMAIN to $DISTRIBUTION_DOMAIN"
echo "2. Add CLOUDFRONT_DISTRIBUTION_ID=$DISTRIBUTION_ID to your .env file"
echo "3. Test CDN by uploading assets: npm run cdn:upload-test"
echo ""
echo "CDN URLs:"
echo "  CloudFront: https://$DISTRIBUTION_DOMAIN"
echo "  Custom Domain: https://$CDN_DOMAIN (after DNS update)"
