# Monitoring Setup Guide

## Overview

This guide covers the installation and configuration of Prometheus and Grafana for monitoring the e-commerce backend Kubernetes cluster.

## Prerequisites

- Kubernetes cluster running (Kind for local, EKS for production)
- Helm 3 installed
- kubectl configured

## Prometheus Installation

### Step 1: Add Helm Repository

```bash
# Add Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### Step 2: Install Prometheus Stack

```bash
# Install kube-prometheus-stack (includes Prometheus, Grafana, AlertManager)
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml \
  --wait

# Verify installation
kubectl get pods -n monitoring
kubectl get svc -n monitoring
```

### Step 3: Access Prometheus UI

**For Local Development (Kind):**
```bash
# Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Access at: http://localhost:9090
```

**For Production (EKS):**
```bash
# Create ingress for Prometheus (optional)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-ingress
  namespace: monitoring
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - prometheus.yourdomain.com
      secretName: prometheus-tls
  rules:
    - host: prometheus.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prometheus-kube-prometheus-prometheus
                port:
                  number: 9090
EOF
```

## Grafana Installation

### Step 1: Access Grafana

Grafana is included in the kube-prometheus-stack installation.

**Get Admin Password:**
```bash
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

**Port Forward (Local):**
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80

# Access at: http://localhost:3001
# Username: admin
# Password: (from command above)
```

### Step 2: Configure Data Sources

Prometheus is automatically configured as a data source. Verify:

1. Login to Grafana
2. Go to Configuration > Data Sources
3. Verify Prometheus is listed and working

### Step 3: Import Dashboards

**Import Pre-built Dashboards:**

```bash
# Kubernetes Cluster Monitoring Dashboard (ID: 7249)
# Node Exporter Full Dashboard (ID: 1860)
# Kubernetes Deployment Statefulset Daemonset metrics (ID: 8588)
```

**Steps to Import:**
1. In Grafana, click "+" > Import
2. Enter dashboard ID
3. Select Prometheus data source
4. Click Import

### Step 4: Create Custom Dashboard for E-Commerce Backend

```bash
# Apply custom dashboard ConfigMap
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ecommerce-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  ecommerce-backend.json: |
    {
      "dashboard": {
        "title": "E-Commerce Backend Metrics",
        "panels": [
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "rate(http_requests_total[5m])"
              }
            ]
          },
          {
            "title": "Error Rate",
            "targets": [
              {
                "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
              }
            ]
          },
          {
            "title": "Response Time (p95)",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
              }
            ]
          }
        ]
      }
    }
EOF
```

## Application Metrics Integration

### Step 1: Install Prometheus Client in Application

Already included in the project dependencies.

### Step 2: Create ServiceMonitor

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ecommerce-backend
  namespace: ecommerce-prod
  labels:
    app: ecommerce-backend
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ecommerce-backend
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
EOF
```

### Step 3: Verify Metrics Collection

```bash
# Check ServiceMonitor
kubectl get servicemonitor -n ecommerce-prod

# Check if Prometheus is scraping
# Go to Prometheus UI > Status > Targets
# Look for ecommerce-backend endpoints
```

## AlertManager Configuration

### Step 1: Configure Alerts

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
      - name: ecommerce-backend
        interval: 30s
        rules:
          - alert: HighErrorRate
            expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "High error rate detected"
              description: "Error rate is {{ \$value }} requests/sec"

          - alert: HighMemoryUsage
            expr: container_memory_usage_bytes{pod=~"ecommerce-backend.*"} / container_spec_memory_limit_bytes > 0.9
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High memory usage"
              description: "Memory usage is above 90%"

          - alert: PodCrashLooping
            expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "Pod is crash looping"
              description: "Pod {{ \$labels.pod }} is restarting"
EOF
```

### Step 2: Configure Notifications

```bash
# Edit AlertManager configuration
kubectl edit secret -n monitoring alertmanager-prometheus-kube-prometheus-alertmanager

# Add notification receivers (Slack, Email, PagerDuty, etc.)
```

## Monitoring Best Practices

### 1. Key Metrics to Monitor

**Application Metrics:**
- Request rate (RPS)
- Error rate (%)
- Response time (p50, p95, p99)
- Active connections
- Queue depth

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Pod restarts

**Business Metrics:**
- Orders per minute
- Payment success rate
- User registrations
- Cart abandonment rate

### 2. Dashboard Organization

Create separate dashboards for:
- Infrastructure overview
- Application performance
- Business metrics
- Error tracking
- Resource utilization

### 3. Alert Tuning

- Start with conservative thresholds
- Adjust based on baseline metrics
- Avoid alert fatigue
- Use severity levels appropriately

## Troubleshooting

### Prometheus Not Scraping Metrics

```bash
# Check ServiceMonitor
kubectl describe servicemonitor ecommerce-backend -n ecommerce-prod

# Check Prometheus logs
kubectl logs -n monitoring prometheus-prometheus-kube-prometheus-prometheus-0

# Verify service labels match ServiceMonitor selector
kubectl get svc -n ecommerce-prod --show-labels
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
kubectl logs -n monitoring deployment/prometheus-grafana

# Verify data source connection
# Grafana UI > Configuration > Data Sources > Test
```

### High Cardinality Issues

```bash
# Check metric cardinality
# Prometheus UI > Status > TSDB Status

# Reduce label cardinality in application code
# Use relabeling in Prometheus config
```

## Cleanup

```bash
# Uninstall Prometheus stack
helm uninstall prometheus -n monitoring

# Delete namespace
kubectl delete namespace monitoring
```

## Next Steps

1. Configure AlertManager notifications
2. Create custom dashboards for business metrics
3. Set up log aggregation (ELK or Loki)
4. Implement distributed tracing (Jaeger)
