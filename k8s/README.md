# Kubernetes Setup for E-Commerce Backend

## Overview

This directory contains all Kubernetes configuration files, Helm charts, and deployment scripts for the e-commerce backend microservices.

## Directory Structure

```
k8s/
├── kind-config.yaml              # Kind cluster configuration
├── namespaces/                   # Namespace definitions
│   ├── namespaces.yaml          # All namespaces
│   └── resource-quotas.yaml     # Resource quotas and limits
├── config/                       # Configuration files
│   ├── configmap.yaml           # Application ConfigMaps
│   └── secrets-template.yaml    # Secret templates (DO NOT commit real secrets)
├── storage/                      # Storage configuration
│   ├── storage-class.yaml       # Storage classes
│   └── persistent-volumes.yaml  # Persistent volumes
├── production/                   # Production cluster config
│   ├── eks-cluster.yaml         # EKS cluster configuration
│   └── eks-setup.md             # EKS setup guide
├── monitoring/                   # Monitoring setup
│   ├── monitoring-setup.md      # Prometheus & Grafana guide
│   └── prometheus-values.yaml   # Custom Prometheus values
└── ingress/                      # Ingress configuration
    └── ingress-setup.md         # NGINX Ingress setup guide

helm/
└── ecommerce-backend/           # Helm chart
    ├── Chart.yaml               # Chart metadata
    ├── values.yaml              # Default values
    ├── values-production.yaml   # Production overrides
    ├── values-staging.yaml      # Staging overrides
    ├── values-development.yaml  # Development overrides
    └── templates/               # Kubernetes templates
        ├── deployment.yaml      # Deployment template
        ├── service.yaml         # Service template
        ├── ingress.yaml         # Ingress template
        ├── hpa.yaml             # HorizontalPodAutoscaler
        ├── serviceaccount.yaml  # ServiceAccount
        └── _helpers.tpl         # Template helpers

scripts/k8s/
├── deploy.sh                    # Deployment script
├── setup-local.sh               # Local cluster setup
├── verify.sh                    # Cluster verification
├── cleanup.sh                   # Cleanup script
├── switch-namespace.sh          # Namespace switcher
└── kubectl-aliases.sh           # Kubectl aliases
```

## Quick Start

### Local Development

1. **Setup local Kind cluster:**
   ```bash
   cd D:\github\ecommerce-backend
   bash scripts/k8s/setup-local.sh
   ```

2. **Create secrets:**
   ```bash
   # See k8s/config/secrets-template.yaml for examples
   kubectl create secret generic jwt-secret \
     --from-literal=JWT_SECRET=your-secret-key \
     --namespace=ecommerce-dev
   ```

3. **Deploy application:**
   ```bash
   bash scripts/k8s/deploy.sh ecommerce-dev development
   ```

4. **Access application:**
   - HTTP: http://localhost:30080
   - HTTPS: https://localhost:30443

### Production Deployment

1. **Create EKS cluster:**
   ```bash
   # See k8s/production/eks-setup.md for detailed instructions
   eksctl create cluster -f k8s/production/eks-cluster.yaml
   ```

2. **Setup monitoring:**
   ```bash
   # See k8s/monitoring/monitoring-setup.md
   helm install prometheus prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --values k8s/monitoring/prometheus-values.yaml
   ```

3. **Setup ingress:**
   ```bash
   # See k8s/ingress/ingress-setup.md
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx
   ```

4. **Deploy application:**
   ```bash
   bash scripts/k8s/deploy.sh ecommerce-prod production v1.0.0
   ```

## Environments

### Development (`ecommerce-dev`)
- **Purpose:** Local development and testing
- **Replicas:** 1
- **Resources:** Minimal (250m CPU, 256Mi RAM)
- **Autoscaling:** Disabled
- **Domain:** api-dev.yourdomain.com

### Staging (`ecommerce-staging`)
- **Purpose:** Pre-production testing
- **Replicas:** 2-5 (autoscaling)
- **Resources:** Moderate (500m CPU, 512Mi RAM)
- **Autoscaling:** Enabled
- **Domain:** api-staging.yourdomain.com

### Production (`ecommerce-prod`)
- **Purpose:** Live production environment
- **Replicas:** 5-20 (autoscaling)
- **Resources:** High (1000m CPU, 1Gi RAM)
- **Autoscaling:** Enabled with strict thresholds
- **Domain:** api.yourdomain.com

## Common Operations

### View Cluster Status
```bash
bash scripts/k8s/verify.sh
```

### Switch Namespace
```bash
bash scripts/k8s/switch-namespace.sh ecommerce-prod
```

### View Logs
```bash
kubectl logs -f deployment/ecommerce-backend -n ecommerce-prod
```

### Scale Deployment
```bash
kubectl scale deployment/ecommerce-backend --replicas=10 -n ecommerce-prod
```

### Update Deployment
```bash
helm upgrade ecommerce-backend ./helm/ecommerce-backend \
  --namespace ecommerce-prod \
  --values ./helm/ecommerce-backend/values-production.yaml \
  --set image.tag=v1.0.1
```

### Rollback Deployment
```bash
helm rollback ecommerce-backend -n ecommerce-prod
```

## Monitoring

### Access Grafana
```bash
# Get password
kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80

# Access at http://localhost:3001
```

### Access Prometheus
```bash
kubectl port-forward -n monitoring \
  svc/prometheus-kube-prometheus-prometheus 9090:9090

# Access at http://localhost:9090
```

## Troubleshooting

### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n ecommerce-prod

# Describe pod
kubectl describe pod <pod-name> -n ecommerce-prod

# Check logs
kubectl logs <pod-name> -n ecommerce-prod
```

### Service Not Accessible
```bash
# Check service
kubectl get svc -n ecommerce-prod

# Check endpoints
kubectl get endpoints -n ecommerce-prod

# Check ingress
kubectl get ingress -n ecommerce-prod
kubectl describe ingress -n ecommerce-prod
```

### Resource Issues
```bash
# Check resource quotas
kubectl describe resourcequota -n ecommerce-prod

# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n ecommerce-prod
```

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `kubectl create secret` or external secret managers
   - See `k8s/config/secrets-template.yaml` for examples

2. **Use RBAC**
   - Create service accounts with minimal permissions
   - Use namespace-scoped roles

3. **Enable Network Policies**
   - Restrict pod-to-pod communication
   - Allow only necessary traffic

4. **Use Pod Security Standards**
   - Enforce restricted pod security
   - Disable privilege escalation

5. **Regular Updates**
   - Keep Kubernetes version up to date
   - Update container images regularly
   - Scan images for vulnerabilities

## Cost Optimization

### Local Development
- Use Kind (free)
- Minimal resource allocation
- Single replica

### Production
- Use cluster autoscaler
- Set appropriate resource limits
- Use Spot instances for non-critical workloads
- Monitor costs with AWS Cost Explorer
- Estimated cost: $400-500/month

## Support

For issues or questions:
1. Check troubleshooting guides in each setup document
2. Review Kubernetes logs
3. Check monitoring dashboards
4. Contact DevOps team

## Next Steps

1. **Phase 4 Task 2:** Containerize all services
2. **Phase 4 Task 3:** Setup CI/CD pipeline
3. **Phase 4 Task 4:** Deploy to production

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Prometheus Operator](https://prometheus-operator.dev/)
