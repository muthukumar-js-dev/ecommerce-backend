# NGINX Ingress Controller Setup Guide

## Overview

This guide covers the installation and configuration of NGINX Ingress Controller for routing external traffic to Kubernetes services.

## Prerequisites

- Kubernetes cluster running (Kind for local, EKS for production)
- Helm 3 installed
- kubectl configured

## Installation

### Step 1: Add Helm Repository

```bash
# Add NGINX Ingress Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

### Step 2: Install NGINX Ingress Controller

**For Local Development (Kind):**

```bash
# Install with NodePort service type
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443 \
  --wait

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

**For Production (EKS):**

```bash
# Install with LoadBalancer service type
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb" \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-cross-zone-load-balancing-enabled"="true" \
  --set controller.metrics.enabled=true \
  --set controller.metrics.serviceMonitor.enabled=true \
  --set controller.resources.requests.cpu=100m \
  --set controller.resources.requests.memory=128Mi \
  --set controller.resources.limits.cpu=500m \
  --set controller.resources.limits.memory=512Mi \
  --wait

# Get LoadBalancer external IP
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

### Step 3: Verify Installation

```bash
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check ingress controller service
kubectl get svc -n ingress-nginx

# Check ingress class
kubectl get ingressclass
```

## SSL/TLS Configuration with cert-manager

### Step 1: Install cert-manager

```bash
# Add Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait

# Verify installation
kubectl get pods -n cert-manager
```

### Step 2: Create ClusterIssuer for Let's Encrypt

**Production ClusterIssuer:**

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # Change this!
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

**Staging ClusterIssuer (for testing):**

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # Change this!
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### Step 3: Verify ClusterIssuer

```bash
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

## Ingress Configuration

### Basic Ingress Example

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-backend
  namespace: ecommerce-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
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
                name: ecommerce-backend
                port:
                  number: 3000
```

### Advanced Ingress with Rate Limiting

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-backend
  namespace: ecommerce-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-connections: "20"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
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
                name: ecommerce-backend
                port:
                  number: 3000
```

## Testing

### Test HTTP Access (Local)

```bash
# For Kind cluster
curl http://localhost:30080

# With host header
curl -H "Host: api.yourdomain.com" http://localhost:30080
```

### Test HTTPS Access (Production)

```bash
# Get LoadBalancer IP
LB_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test HTTPS
curl -k https://$LB_IP -H "Host: api.yourdomain.com"

# Verify certificate
curl -vI https://api.yourdomain.com
```

## DNS Configuration

### For Production (EKS)

1. Get LoadBalancer hostname:
   ```bash
   kubectl get svc -n ingress-nginx ingress-nginx-controller
   ```

2. Create DNS A record or CNAME:
   - **A Record**: Point to LoadBalancer IP
   - **CNAME**: Point to LoadBalancer hostname (recommended for AWS)

3. Example Route53 configuration:
   ```bash
   # Using AWS CLI
   aws route53 change-resource-record-sets \
     --hosted-zone-id YOUR_ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "UPSERT",
         "ResourceRecordSet": {
           "Name": "api.yourdomain.com",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "YOUR_LB_HOSTNAME"}]
         }
       }]
     }'
   ```

## Monitoring

### Enable Prometheus Metrics

```bash
# Metrics are already enabled if installed with monitoring flags
# Verify metrics endpoint
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller-metrics 10254:10254

# Access metrics
curl http://localhost:10254/metrics
```

### Create ServiceMonitor

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  endpoints:
    - port: metrics
      interval: 30s
EOF
```

## Troubleshooting

### Ingress Not Working

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Check ingress status
kubectl describe ingress -n ecommerce-prod

# Verify service endpoints
kubectl get endpoints -n ecommerce-prod
```

### Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n ecommerce-prod

# Check certificate request
kubectl get certificaterequest -n ecommerce-prod

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### 502 Bad Gateway

```bash
# Check backend service
kubectl get svc -n ecommerce-prod

# Check pod status
kubectl get pods -n ecommerce-prod

# Check pod logs
kubectl logs -n ecommerce-prod deployment/ecommerce-backend
```

## Best Practices

1. **Use TLS for all production traffic**
2. **Enable rate limiting to prevent abuse**
3. **Configure appropriate timeouts**
4. **Monitor ingress metrics**
5. **Use staging ClusterIssuer for testing**
6. **Set resource limits on ingress controller**
7. **Use multiple replicas for high availability**

## Cleanup

```bash
# Uninstall NGINX Ingress
helm uninstall ingress-nginx -n ingress-nginx

# Uninstall cert-manager
helm uninstall cert-manager -n cert-manager

# Delete namespaces
kubectl delete namespace ingress-nginx
kubectl delete namespace cert-manager
```

## Next Steps

1. Configure DNS records for your domain
2. Test SSL certificate issuance
3. Deploy application with ingress
4. Monitor ingress metrics in Grafana
