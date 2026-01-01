# Phase 5 - Task 5: Advanced Observability & Logging

**Duration:** 2-3 days  
**Priority:** Medium  
**Dependencies:** Task 3 (Monitoring Operational)

---

## Objective

Implement advanced observability with centralized logging, log aggregation, structured logging, and log-based alerting to enable rapid troubleshooting and system insights.

---

## Context

Advanced observability provides:
- **Rapid Troubleshooting:** Quickly identify root causes
- **System Insights:** Understand system behavior
- **Compliance:** Audit trails for regulatory requirements
- **Security:** Detect anomalies and threats
- **Performance Analysis:** Identify bottlenecks

---

## Implementation Steps

### Step 1: Centralized Logging with ELK Stack

**Deploy Elasticsearch, Logstash, Kibana:**

```yaml
# k8s/logging/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
  namespace: logging
spec:
  version: 8.5.0
  nodeSets:
    - name: default
      count: 3
      config:
        node.store.allow_mmap: false
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi
            storageClassName: gp3
---
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: kibana
  namespace: logging
spec:
  version: 8.5.0
  count: 1
  elasticsearchRef:
    name: elasticsearch
```

**Configure Fluent Bit for log collection:**

```yaml
# k8s/logging/fluent-bit.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Daemon        off
        Log_Level     info
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [FILTER]
        Name    modify
        Match   *
        Add     cluster production
        Add     environment prod

    [OUTPUT]
        Name            es
        Match           *
        Host            elasticsearch-es-http.logging.svc
        Port            9200
        Logstash_Format On
        Logstash_Prefix kubernetes
        Retry_Limit     False
        tls             On
        tls.verify      Off

  parsers.conf: |
    [PARSER]
        Name   json
        Format json
        Time_Key time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z

    [PARSER]
        Name   docker
        Format json
        Time_Key time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z
```

### Step 2: Structured Logging

**Implement structured logging in application:**

```typescript
// src/infrastructure/logging/logger.ts

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  },
  index: 'logs',
};

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'core-service',
    environment: process.env.ENVIRONMENT || 'production',
    version: process.env.VERSION || '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new ElasticsearchTransport(esTransportOpts),
  ],
});

// Structured logging helpers
export const logRequest = (req: any, res: any, duration: number) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.user?.id,
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logBusinessEvent = (event: string, data: any) => {
  logger.info('Business Event', {
    event,
    ...data,
  });
};
```

**Add logging middleware:**

```typescript
// src/api/middleware/logging.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { logger, logRequest } from '../../infrastructure/logging/logger';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  logger.debug('Incoming Request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    logRequest(req, res, duration);
    return originalSend.call(this, data);
  };

  next();
}
```

### Step 3: Log-Based Alerting

**Create log-based alert rules:**

```yaml
# k8s/logging/elastalert-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elastalert-rules
  namespace: logging
data:
  high-error-rate.yaml: |
    name: High Error Rate
    type: frequency
    index: logs-*
    num_events: 50
    timeframe:
      minutes: 5
    filter:
      - term:
          level: "error"
    alert:
      - slack:
          slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
          slack_channel_override: "#alerts"
          slack_msg_color: "danger"

  security-anomaly.yaml: |
    name: Security Anomaly Detected
    type: any
    index: logs-*
    filter:
      - query_string:
          query: 'message:("SQL injection" OR "XSS attack" OR "unauthorized access")'
    alert:
      - slack:
          slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
          slack_channel_override: "#security"
          slack_msg_color: "danger"
      - pagerduty:
          pagerduty_service_key: "YOUR_PAGERDUTY_KEY"

  slow-query.yaml: |
    name: Slow Database Query
    type: frequency
    index: logs-*
    num_events: 10
    timeframe:
      minutes: 5
    filter:
      - range:
          duration:
            gte: 1000  # > 1 second
      - term:
          type: "database_query"
    alert:
      - slack:
          slack_webhook_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
          slack_channel_override: "#performance"
```

### Step 4: Log Analysis & Insights

**Create log analyzer:**

```typescript
// scripts/observability/log-analyzer.ts

import { Client } from '@elastic/elasticsearch';

export class LogAnalyzer {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    });
  }

  async analyzeErrors(timeRange: string = '1h'): Promise<any> {
    const result = await this.client.search({
      index: 'logs-*',
      body: {
        query: {
          bool: {
            must: [
              { term: { level: 'error' } },
              { range: { '@timestamp': { gte: `now-${timeRange}` } } },
            ],
          },
        },
        aggs: {
          by_service: {
            terms: { field: 'service.keyword', size: 10 },
          },
          by_error_type: {
            terms: { field: 'message.keyword', size: 20 },
          },
          error_timeline: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '5m',
            },
          },
        },
      },
    });

    return {
      totalErrors: result.hits.total,
      byService: result.aggregations.by_service.buckets,
      byErrorType: result.aggregations.by_error_type.buckets,
      timeline: result.aggregations.error_timeline.buckets,
    };
  }

  async findSlowRequests(threshold: number = 1000): Promise<any[]> {
    const result = await this.client.search({
      index: 'logs-*',
      body: {
        query: {
          bool: {
            must: [
              { term: { type: 'http_request' } },
              { range: { duration: { gte: threshold } } },
              { range: { '@timestamp': { gte: 'now-1h' } } },
            ],
          },
        },
        sort: [{ duration: { order: 'desc' } }],
        size: 100,
      },
    });

    return result.hits.hits.map((hit: any) => hit._source);
  }

  async detectAnomalies(): Promise<any> {
    // Use Elasticsearch ML for anomaly detection
    const result = await this.client.ml.getBuckets({
      job_id: 'error_rate_anomaly',
      body: {
        sort: 'anomaly_score',
        desc: true,
        size: 10,
      },
    });

    return result.buckets;
  }

  async generateDailyReport(): Promise<string> {
    const errors = await this.analyzeErrors('24h');
    const slowRequests = await this.findSlowRequests();

    const report = `
# Daily Log Analysis Report
Generated: ${new Date().toISOString()}

## Error Summary
- Total Errors (24h): ${errors.totalErrors}
- Top Services with Errors:
${errors.byService.map((s: any) => `  - ${s.key}: ${s.doc_count}`).join('\n')}

## Top Error Messages
${errors.byErrorType.slice(0, 5).map((e: any, i: number) => 
  `${i + 1}. ${e.key} (${e.doc_count} occurrences)`
).join('\n')}

## Slow Requests
- Total Slow Requests (>1s): ${slowRequests.length}
- Slowest Request: ${slowRequests[0]?.duration}ms - ${slowRequests[0]?.url}

## Recommendations
${this.generateRecommendations(errors, slowRequests)}
`;

    return report;
  }

  private generateRecommendations(errors: any, slowRequests: any[]): string {
    const recommendations: string[] = [];

    if (errors.totalErrors > 1000) {
      recommendations.push('- High error rate detected. Investigate top error messages.');
    }

    if (slowRequests.length > 50) {
      recommendations.push('- Many slow requests detected. Consider optimizing database queries.');
    }

    return recommendations.length > 0 
      ? recommendations.join('\n') 
      : '- No critical issues detected.';
  }
}
```

---

## Deliverables

- [ ] ELK stack deployed
- [ ] Fluent Bit configured for log collection
- [ ] Structured logging implemented
- [ ] Log-based alerting configured
- [ ] Kibana dashboards created
- [ ] Log analyzer deployed
- [ ] Daily log reports automated

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| Log ingestion rate | > 10K logs/sec | ___ |
| Log search latency | < 1s | ___ |
| Log retention | 90 days | ___ |
| Alert accuracy | > 95% | ___ |

---

**Task Owner:** DevOps + SRE Team  
**Estimated Effort:** 2-3 days  
**Status:** Not Started
