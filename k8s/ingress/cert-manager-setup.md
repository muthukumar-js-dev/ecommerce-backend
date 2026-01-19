# cert-manager Setup Guide

## Overview

cert-manager is a Kubernetes add-on that automates the management and issuance of TLS certificates from various certificate authorities (CAs), including Let's Encrypt.

## Prerequisites

- Kubernetes cluster running (Kind for local, EKS for production)
- Helm 3 installed
- kubectl configured
- NGINX Ingress Controller installed

## Installation

### Step 1: Add Jetstack Helm Repository

```bash
# Add Jetstack repository
helm repo add jetstack https://charts.jetstack.io

# Update Helm repositories
helm repo update
```

### Step 2: Install cert-manager

```bash
# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait

# Verify installation
kubectl get pods -n cert-manager
```

Expected output:
```
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-7d9f8c6b4f-xxxxx             1/1     Running   0          1m
cert-manager-cainjector-5d9f8c6b4f-xxxxx  1/1     Running   0          1m
cert-manager-webhook-5d9f8c6b4f-xxxxx     1/1     Running   0          1m
```

### Step 3: Verify Installation

```bash
# Check cert-manager version
kubectl get deployment -n cert-manager cert-manager -o yaml | grep "image:"

# Check CRDs
kubectl get crd | grep cert-manager
```

## ClusterIssuer Configuration

### Production ClusterIssuer (Let's Encrypt)

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory
    
    # Email for certificate expiration notifications
    email: your-email@example.com  # CHANGE THIS!
    
    # Secret to store ACME account private key
    privateKeySecretRef:
      name: letsencrypt-prod
    
    # ACME challenge solver
    solvers:
      # HTTP-01 challenge
      - http01:
          ingress:
            class: nginx
      
      # DNS-01 challenge (optional, for wildcard certificates)
      # - dns01:
      #     route53:
      #       region: ap-south-1
      #       hostedZoneID: YOUR_HOSTED_ZONE_ID
EOF
```

### Staging ClusterIssuer (For Testing)

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Let's Encrypt staging server (higher rate limits)
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    
    email: your-email@example.com  # CHANGE THIS!
    
    privateKeySecretRef:
      name: letsencrypt-staging
    
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### Self-Signed ClusterIssuer (For Development)

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned
spec:
  selfSigned: {}
EOF
```

### Step 4: Verify ClusterIssuer

```bash
# Check ClusterIssuer status
kubectl get clusterissuer

# Describe ClusterIssuer
kubectl describe clusterissuer letsencrypt-prod
```

## Certificate Issuance

### Automatic Certificate (via Ingress Annotation)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  namespace: ecommerce-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: api-tls  # cert-manager will create this secret
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ecommerce-backend
                port:
                  number: 3000
```

### Manual Certificate

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-certificate
  namespace: ecommerce-prod
spec:
  secretName: api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.yourdomain.com
    - www.api.yourdomain.com
EOF
```

### Wildcard Certificate (DNS-01 Challenge)

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-certificate
  namespace: ecommerce-prod
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.yourdomain.com"
    - yourdomain.com
EOF
```

## Verification

### Check Certificate Status

```bash
# List certificates
kubectl get certificate -n ecommerce-prod

# Describe certificate
kubectl describe certificate api-certificate -n ecommerce-prod

# Check certificate secret
kubectl get secret api-tls -n ecommerce-prod
```

### Check Certificate Request

```bash
# List certificate requests
kubectl get certificaterequest -n ecommerce-prod

# Describe certificate request
kubectl describe certificaterequest -n ecommerce-prod
```

### Check Certificate Order

```bash
# List orders
kubectl get order -n ecommerce-prod

# Describe order
kubectl describe order -n ecommerce-prod
```

### Check Challenge

```bash
# List challenges
kubectl get challenge -n ecommerce-prod

# Describe challenge
kubectl describe challenge -n ecommerce-prod
```

## DNS-01 Challenge Setup (AWS Route53)

### Step 1: Create IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "route53:GetChange",
      "Resource": "arn:aws:route53:::change/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/*"
    },
    {
      "Effect": "Allow",
      "Action": "route53:ListHostedZonesByName",
      "Resource": "*"
    }
  ]
}
```

### Step 2: Create Secret with AWS Credentials

```bash
kubectl create secret generic route53-credentials \
  --from-literal=secret-access-key=YOUR_AWS_SECRET_KEY \
  --namespace=cert-manager
```

### Step 3: Create ClusterIssuer with DNS-01

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-dns
    solvers:
      - dns01:
          route53:
            region: ap-south-1
            accessKeyID: YOUR_AWS_ACCESS_KEY_ID
            secretAccessKeySecretRef:
              name: route53-credentials
              key: secret-access-key
```

## Troubleshooting

### Certificate Not Issuing

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check webhook logs
kubectl logs -n cert-manager deployment/cert-manager-webhook

# Check cainjector logs
kubectl logs -n cert-manager deployment/cert-manager-cainjector
```

### HTTP-01 Challenge Failing

**Common Issues:**
1. Ingress controller not configured correctly
2. DNS not pointing to LoadBalancer
3. Firewall blocking port 80

**Debug:**
```bash
# Check ingress
kubectl describe ingress -n ecommerce-prod

# Check challenge
kubectl describe challenge -n ecommerce-prod

# Test HTTP endpoint
curl http://api.yourdomain.com/.well-known/acme-challenge/test
```

### DNS-01 Challenge Failing

**Common Issues:**
1. AWS credentials incorrect
2. IAM permissions insufficient
3. Hosted Zone ID incorrect

**Debug:**
```bash
# Check order
kubectl describe order -n ecommerce-prod

# Check challenge
kubectl describe challenge -n ecommerce-prod

# Verify DNS propagation
nslookup _acme-challenge.yourdomain.com
```

### Certificate Renewal Issues

```bash
# Check certificate expiry
kubectl get certificate -n ecommerce-prod -o wide

# Force renewal
kubectl delete certificaterequest <request-name> -n ecommerce-prod
```

## Certificate Renewal

cert-manager automatically renews certificates 30 days before expiry.

### Manual Renewal

```bash
# Delete the secret to trigger renewal
kubectl delete secret api-tls -n ecommerce-prod

# cert-manager will automatically recreate it
```

## Best Practices

1. **Use Staging for Testing**
   - Test with `letsencrypt-staging` first
   - Production has rate limits (50 certificates/week)

2. **Monitor Certificate Expiry**
   - Set up alerts for expiring certificates
   - Check renewal status regularly

3. **Use DNS-01 for Wildcards**
   - HTTP-01 doesn't support wildcard certificates
   - DNS-01 required for `*.yourdomain.com`

4. **Secure Credentials**
   - Store AWS credentials in Kubernetes secrets
   - Use IAM roles for service accounts (IRSA) when possible

5. **Backup Certificates**
   - Export certificate secrets
   - Store in secure location

## Monitoring

### Prometheus Metrics

cert-manager exposes Prometheus metrics:

```bash
# Port forward cert-manager
kubectl port-forward -n cert-manager deployment/cert-manager 9402:9402

# Access metrics
curl http://localhost:9402/metrics
```

### Grafana Dashboard

Import cert-manager dashboard:
- Dashboard ID: 11001

## Cleanup

```bash
# Uninstall cert-manager
helm uninstall cert-manager -n cert-manager

# Delete CRDs
kubectl delete crd certificates.cert-manager.io
kubectl delete crd certificaterequests.cert-manager.io
kubectl delete crd challenges.cert-manager.io
kubectl delete crd clusterissuers.cert-manager.io
kubectl delete crd issuers.cert-manager.io
kubectl delete crd orders.cert-manager.io

# Delete namespace
kubectl delete namespace cert-manager
```

## Additional Resources

- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [ACME Challenge Types](https://letsencrypt.org/docs/challenge-types/)
- [cert-manager Troubleshooting](https://cert-manager.io/docs/troubleshooting/)
