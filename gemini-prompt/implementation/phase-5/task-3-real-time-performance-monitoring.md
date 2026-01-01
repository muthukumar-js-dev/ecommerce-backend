# Phase 5 - Task 3: Real-Time Performance Monitoring

**Duration:** 3-4 days  
**Priority:** High  
**Dependencies:** Task 2 (Staged Rollout Complete)

---

## Objective

Implement comprehensive real-time performance monitoring with advanced dashboards, intelligent alerting, distributed tracing, and automated performance analysis to ensure optimal system health.

---

## Context

Real-time monitoring provides:
- **Immediate Visibility:** Detect issues as they happen
- **Proactive Response:** Alert before users are impacted
- **Performance Insights:** Understand system behavior
- **Capacity Planning:** Data-driven scaling decisions
- **SLA Compliance:** Track and maintain SLOs

---

## Implementation Steps

### Step 1: Advanced Grafana Dashboards

**Create comprehensive production dashboard:**

```json
{
  "dashboard": {
    "title": "Production - Real-Time Overview",
    "tags": ["production", "real-time"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate (RPS)",
        "type": "graph",
        "targets": [{
          "expr": "sum(rate(http_requests_total{namespace='ecommerce-prod'}[1m]))",
          "legendFormat": "Total RPS"
        }],
        "alert": {
          "conditions": [{
            "evaluator": { "params": [50000], "type": "lt" },
            "query": { "params": ["A", "5m", "now"] }
          }],
          "name": "Low Traffic Alert"
        }
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "graph",
        "targets": [{
          "expr": "sum(rate(http_request_errors_total{namespace='ecommerce-prod'}[5m])) / sum(rate(http_requests_total{namespace='ecommerce-prod'}[5m])) * 100",
          "legendFormat": "Error Rate %"
        }],
        "thresholds": [
          { "value": 0.1, "color": "green" },
          { "value": 0.5, "color": "yellow" },
          { "value": 1.0, "color": "red" }
        ]
      },
      {
        "id": 3,
        "title": "Latency Distribution",
        "type": "heatmap",
        "targets": [{
          "expr": "sum(rate(http_request_duration_seconds_bucket{namespace='ecommerce-prod'}[5m])) by (le)",
          "format": "heatmap"
        }]
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "stat",
        "targets": [{
          "expr": "sum(active_sessions{namespace='ecommerce-prod'})"
        }],
        "options": {
          "graphMode": "area",
          "colorMode": "value"
        }
      },
      {
        "id": 5,
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(mongodb_query_duration_seconds_bucket[5m]))",
            "legendFormat": "P95 Query Time"
          },
          {
            "expr": "rate(mongodb_queries_total[5m])",
            "legendFormat": "Queries/sec"
          }
        ]
      },
      {
        "id": 6,
        "title": "Cache Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100",
            "legendFormat": "Hit Rate %"
          }
        ]
      },
      {
        "id": 7,
        "title": "Pod Health",
        "type": "table",
        "targets": [{
          "expr": "kube_pod_status_phase{namespace='ecommerce-prod'}",
          "format": "table"
        }]
      },
      {
        "id": 8,
        "title": "Resource Utilization",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace='ecommerce-prod'}[5m])) by (pod)",
            "legendFormat": "CPU - {{pod}}"
          },
          {
            "expr": "sum(container_memory_usage_bytes{namespace='ecommerce-prod'}) by (pod)",
            "legendFormat": "Memory - {{pod}}"
          }
        ]
      },
      {
        "id": 9,
        "title": "Business Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(orders_created_total[5m]))",
            "legendFormat": "Orders/min"
          },
          {
            "expr": "sum(rate(revenue_total[5m]))",
            "legendFormat": "Revenue/min"
          }
        ]
      },
      {
        "id": 10,
        "title": "SLA Compliance",
        "type": "gauge",
        "targets": [{
          "expr": "(1 - (sum(rate(http_request_errors_total[30d])) / sum(rate(http_requests_total[30d])))) * 100"
        }],
        "options": {
          "min": 99,
          "max": 100,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "value": 99, "color": "red" },
              { "value": 99.9, "color": "yellow" },
              { "value": 99.99, "color": "green" }
            ]
          }
        }
      }
    ],
    "refresh": "10s",
    "time": { "from": "now-1h", "to": "now" }
  }
}
```

**Create service-specific dashboards:**

```typescript
// scripts/monitoring/create-dashboards.ts

import { GrafanaClient } from './grafana-client';

const services = ['core-service', 'payment-service', 'notification-service'];

async function createServiceDashboards() {
  const grafana = new GrafanaClient('http://grafana:3000', process.env.GRAFANA_API_KEY!);

  for (const service of services) {
    const dashboard = {
      dashboard: {
        title: `${service} - Detailed Metrics`,
        tags: ['production', service],
        panels: [
          createRequestRatePanel(service),
          createErrorRatePanel(service),
          createLatencyPanel(service),
          createDependencyPanel(service),
          createResourcePanel(service),
        ],
      },
    };

    await grafana.createDashboard(dashboard);
    console.log(`✓ Created dashboard for ${service}`);
  }
}

function createLatencyPanel(service: string) {
  return {
    title: 'Latency Percentiles',
    type: 'graph',
    targets: [
      {
        expr: `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
        legendFormat: 'P50',
      },
      {
        expr: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
        legendFormat: 'P95',
      },
      {
        expr: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
        legendFormat: 'P99',
      },
    ],
  };
}
```

### Step 2: Intelligent Alerting

**Create advanced alert rules:**

```yaml
# k8s/monitoring/prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: production-alerts
  namespace: monitoring
spec:
  groups:
    - name: sla_alerts
      interval: 30s
      rules:
        - alert: HighErrorRate
          expr: |
            (sum(rate(http_request_errors_total{namespace="ecommerce-prod"}[5m])) 
            / sum(rate(http_requests_total{namespace="ecommerce-prod"}[5m]))) * 100 > 0.5
          for: 2m
          labels:
            severity: critical
            team: backend
          annotations:
            summary: "High error rate detected"
            description: "Error rate is {{ $value }}% (threshold: 0.5%)"
            runbook_url: "https://runbooks.yourdomain.com/high-error-rate"

        - alert: HighLatency
          expr: |
            histogram_quantile(0.95, 
              rate(http_request_duration_seconds_bucket{namespace="ecommerce-prod"}[5m])
            ) > 0.2
          for: 5m
          labels:
            severity: warning
            team: backend
          annotations:
            summary: "High latency detected"
            description: "P95 latency is {{ $value }}s (threshold: 200ms)"

        - alert: LowCacheHitRate
          expr: |
            (rate(redis_keyspace_hits_total[5m]) 
            / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))) * 100 < 70
          for: 10m
          labels:
            severity: warning
            team: backend
          annotations:
            summary: "Low cache hit rate"
            description: "Cache hit rate is {{ $value }}% (threshold: 80%)"

        - alert: PodCrashLooping
          expr: |
            rate(kube_pod_container_status_restarts_total{namespace="ecommerce-prod"}[15m]) > 0
          for: 5m
          labels:
            severity: critical
            team: devops
          annotations:
            summary: "Pod is crash looping"
            description: "Pod {{ $labels.pod }} is restarting frequently"

        - alert: DatabaseSlowQueries
          expr: |
            histogram_quantile(0.95, 
              rate(mongodb_query_duration_seconds_bucket[5m])
            ) > 0.1
          for: 10m
          labels:
            severity: warning
            team: backend
          annotations:
            summary: "Slow database queries detected"
            description: "P95 query time is {{ $value }}s (threshold: 100ms)"

        - alert: HighMemoryUsage
          expr: |
            (container_memory_usage_bytes{namespace="ecommerce-prod"} 
            / container_spec_memory_limit_bytes{namespace="ecommerce-prod"}) * 100 > 85
          for: 5m
          labels:
            severity: warning
            team: devops
          annotations:
            summary: "High memory usage"
            description: "Pod {{ $labels.pod }} memory usage is {{ $value }}%"

        - alert: SLAViolation
          expr: |
            (1 - (sum(rate(http_request_errors_total{namespace="ecommerce-prod"}[30d])) 
            / sum(rate(http_requests_total{namespace="ecommerce-prod"}[30d])))) * 100 < 99.99
          for: 1h
          labels:
            severity: critical
            team: leadership
          annotations:
            summary: "SLA violation detected"
            description: "30-day availability is {{ $value }}% (target: 99.99%)"
```

**Create alert manager configuration:**

```yaml
# k8s/monitoring/alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
      pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'default'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty-critical'
          continue: true
        
        - match:
            severity: critical
          receiver: 'slack-critical'
        
        - match:
            severity: warning
          receiver: 'slack-warnings'

    receivers:
      - name: 'default'
        slack_configs:
          - channel: '#alerts'
            title: 'Alert: {{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

      - name: 'pagerduty-critical'
        pagerduty_configs:
          - service_key: 'YOUR_PAGERDUTY_KEY'
            description: '{{ .GroupLabels.alertname }}'

      - name: 'slack-critical'
        slack_configs:
          - channel: '#incidents'
            title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
            text: |
              *Summary:* {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}
              *Description:* {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
              *Runbook:* {{ range .Alerts }}{{ .Annotations.runbook_url }}{{ end }}
            color: 'danger'

      - name: 'slack-warnings'
        slack_configs:
          - channel: '#alerts'
            title: '⚠️  WARNING: {{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
            color: 'warning'
```

### Step 3: Distributed Tracing

**Configure Jaeger for distributed tracing:**

```typescript
// src/infrastructure/tracing/jaeger-config.ts

import { initTracer, JaegerTracer } from 'jaeger-client';

export function initializeTracing(serviceName: string): JaegerTracer {
  const config = {
    serviceName,
    sampler: {
      type: 'probabilistic',
      param: 0.1, // Sample 10% of requests
    },
    reporter: {
      logSpans: true,
      agentHost: process.env.JAEGER_AGENT_HOST || 'jaeger-agent',
      agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6832'),
    },
  };

  const options = {
    logger: {
      info: (msg: string) => console.log('INFO', msg),
      error: (msg: string) => console.error('ERROR', msg),
    },
  };

  return initTracer(config, options);
}

// Middleware for Express
export function tracingMiddleware(tracer: JaegerTracer) {
  return (req: any, res: any, next: any) => {
    const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`);
    
    span.setTag('http.method', req.method);
    span.setTag('http.url', req.url);
    span.setTag('http.status_code', res.statusCode);

    req.span = span;

    res.on('finish', () => {
      span.setTag('http.status_code', res.statusCode);
      span.finish();
    });

    next();
  };
}
```

### Step 4: Automated Performance Analysis

**Create performance analyzer:**

```typescript
// scripts/monitoring/performance-analyzer.ts

interface PerformanceAnomaly {
  timestamp: Date;
  metric: string;
  value: number;
  baseline: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export class PerformanceAnalyzer {
  async analyzePerformance(): Promise<PerformanceAnomaly[]> {
    const anomalies: PerformanceAnomaly[] = [];

    // Analyze latency trends
    const latencyAnomalies = await this.detectLatencyAnomalies();
    anomalies.push(...latencyAnomalies);

    // Analyze error rate trends
    const errorAnomalies = await this.detectErrorAnomalies();
    anomalies.push(...errorAnomalies);

    // Analyze resource utilization
    const resourceAnomalies = await this.detectResourceAnomalies();
    anomalies.push(...resourceAnomalies);

    // Generate report
    if (anomalies.length > 0) {
      await this.generateAnomalyReport(anomalies);
    }

    return anomalies;
  }

  private async detectLatencyAnomalies(): Promise<PerformanceAnomaly[]> {
    const currentP95 = await this.getMetric('http_request_duration_p95');
    const baseline = await this.getBaselineMetric('http_request_duration_p95', '7d');
    
    const deviation = ((currentP95 - baseline) / baseline) * 100;

    if (Math.abs(deviation) > 20) {
      return [{
        timestamp: new Date(),
        metric: 'P95 Latency',
        value: currentP95,
        baseline,
        deviation,
        severity: deviation > 50 ? 'high' : 'medium',
      }];
    }

    return [];
  }

  private async generateAnomalyReport(anomalies: PerformanceAnomaly[]): Promise<void> {
    const report = `
# Performance Anomaly Report
Generated: ${new Date().toISOString()}

## Summary
Total Anomalies: ${anomalies.length}
High Severity: ${anomalies.filter(a => a.severity === 'high').length}
Medium Severity: ${anomalies.filter(a => a.severity === 'medium').length}

## Anomalies
${anomalies.map(a => `
### ${a.metric}
- **Current Value:** ${a.value}
- **Baseline:** ${a.baseline}
- **Deviation:** ${a.deviation.toFixed(2)}%
- **Severity:** ${a.severity}
- **Timestamp:** ${a.timestamp.toISOString()}
`).join('\n')}
`;

    // Send to Slack
    await this.sendToSlack(report);
  }
}
```

---

## Deliverables

- [ ] Advanced Grafana dashboards created
- [ ] Intelligent alerting configured
- [ ] Distributed tracing implemented
- [ ] Performance analyzer deployed
- [ ] Real-time monitoring operational
- [ ] Alert runbooks created
- [ ] Team trained on dashboards

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| Dashboard refresh rate | < 10s | ___ |
| Alert response time | < 15 min | ___ |
| Trace sampling | 10% | ___ |
| False positive rate | < 5% | ___ |
| Dashboard availability | 99.9% | ___ |

---

**Task Owner:** DevOps + SRE Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
