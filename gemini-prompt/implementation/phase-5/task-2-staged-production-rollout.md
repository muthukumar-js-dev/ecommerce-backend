# Phase 5 - Task 2: Staged Production Rollout

**Duration:** 3-4 days  
**Priority:** Critical  
**Dependencies:** Task 1 (Pre-Production Validation - GO decision)

---

## Objective

Execute a staged production rollout using canary deployments, blue-green strategy, and progressive traffic shifting to minimize risk and ensure smooth transition to production.

---

## Context

Staged rollout provides:
- **Risk Mitigation:** Gradual exposure limits blast radius
- **Early Detection:** Issues caught with minimal user impact
- **Rollback Safety:** Easy reversion if problems occur
- **Confidence Building:** Progressive validation at each stage
- **Zero Downtime:** Seamless transition for users

---

## Implementation Steps

### Step 1: Blue-Green Deployment Setup

**Create blue-green deployment configuration:**

```yaml
# k8s/deployments/blue-green/core-service-blue.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service-blue
  namespace: ecommerce-prod
  labels:
    app: core-service
    version: blue
    environment: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: core-service
      version: blue
  template:
    metadata:
      labels:
        app: core-service
        version: blue
    spec:
      containers:
        - name: core-service
          image: ecommerce/core-service:v1.0.0  # Current stable version
          ports:
            - containerPort: 3000
          env:
            - name: VERSION
              value: "blue"
            - name: ENVIRONMENT
              value: "production"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service-green
  namespace: ecommerce-prod
  labels:
    app: core-service
    version: green
    environment: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: core-service
      version: green
  template:
    metadata:
      labels:
        app: core-service
        version: green
    spec:
      containers:
        - name: core-service
          image: ecommerce/core-service:v2.0.0  # New version
          ports:
            - containerPort: 3000
          env:
            - name: VERSION
              value: "green"
            - name: ENVIRONMENT
              value: "production"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: core-service
  namespace: ecommerce-prod
spec:
  selector:
    app: core-service
    version: blue  # Initially pointing to blue
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

### Step 2: Canary Deployment with Progressive Traffic Shifting

**Create canary deployment with Flagger:**

```yaml
# k8s/deployments/canary/core-service-canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: core-service
  namespace: ecommerce-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  progressDeadlineSeconds: 600
  service:
    port: 80
    targetPort: 3000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        url: http://flagger-loadtester/
        timeout: 5s
        metadata:
          type: cmd
          cmd: "hey -z 1m -q 10 -c 2 http://core-service-canary/"
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://core-service-canary/ | grep token"
      - name: slack-notification
        url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
        metadata:
          message: |
            Canary deployment {{ .Name }} is progressing
            Current weight: {{ .CanaryWeight }}%
```

**Create traffic shifting automation:**

```typescript
// scripts/deployment/traffic-shifter.ts

interface TrafficShiftConfig {
  stages: TrafficStage[];
  monitoringDuration: number;
  rollbackThreshold: {
    errorRate: number;
    latencyP95: number;
  };
}

interface TrafficStage {
  percentage: number;
  duration: number; // minutes
  validationChecks: string[];
}

export class TrafficShifter {
  private config: TrafficShiftConfig = {
    stages: [
      { percentage: 5, duration: 10, validationChecks: ['health', 'errors', 'latency'] },
      { percentage: 10, duration: 10, validationChecks: ['health', 'errors', 'latency'] },
      { percentage: 25, duration: 15, validationChecks: ['health', 'errors', 'latency', 'business'] },
      { percentage: 50, duration: 20, validationChecks: ['health', 'errors', 'latency', 'business'] },
      { percentage: 100, duration: 30, validationChecks: ['health', 'errors', 'latency', 'business'] },
    ],
    monitoringDuration: 10,
    rollbackThreshold: {
      errorRate: 0.5, // 0.5%
      latencyP95: 300, // 300ms
    },
  };

  async executeRollout(serviceName: string, newVersion: string): Promise<void> {
    console.log(`\n🚀 Starting staged rollout for ${serviceName}:${newVersion}\n`);

    for (const stage of this.config.stages) {
      console.log(`\n📊 Stage: ${stage.percentage}% traffic to new version`);
      
      // Shift traffic
      await this.shiftTraffic(serviceName, stage.percentage);
      
      // Monitor
      const healthy = await this.monitorStage(stage);
      
      if (!healthy) {
        console.log('\n❌ Health check failed - initiating rollback');
        await this.rollback(serviceName);
        throw new Error('Rollout failed - rolled back to previous version');
      }
      
      console.log(`✅ Stage ${stage.percentage}% completed successfully`);
      
      // Wait before next stage
      if (stage.percentage < 100) {
        console.log(`⏳ Waiting ${stage.duration} minutes before next stage...`);
        await this.sleep(stage.duration * 60 * 1000);
      }
    }

    console.log('\n🎉 Rollout completed successfully!');
  }

  private async shiftTraffic(serviceName: string, percentage: number): Promise<void> {
    // Update service selector to split traffic
    const greenWeight = percentage;
    const blueWeight = 100 - percentage;

    await exec(`
      kubectl patch service ${serviceName} -n ecommerce-prod --type=json -p='[
        {
          "op": "replace",
          "path": "/spec/selector/version",
          "value": "green"
        }
      ]'
    `);

    // If using Istio/Linkerd for traffic splitting
    await this.updateVirtualService(serviceName, blueWeight, greenWeight);
  }

  private async updateVirtualService(
    serviceName: string,
    blueWeight: number,
    greenWeight: number
  ): Promise<void> {
    const virtualService = `
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${serviceName}
  namespace: ecommerce-prod
spec:
  hosts:
    - ${serviceName}
  http:
    - match:
        - headers:
            canary:
              exact: "true"
      route:
        - destination:
            host: ${serviceName}
            subset: green
          weight: 100
    - route:
        - destination:
            host: ${serviceName}
            subset: blue
          weight: ${blueWeight}
        - destination:
            host: ${serviceName}
            subset: green
          weight: ${greenWeight}
`;

    await exec(`echo '${virtualService}' | kubectl apply -f -`);
  }

  private async monitorStage(stage: TrafficStage): Promise<boolean> {
    console.log(`\n🔍 Monitoring for ${this.config.monitoringDuration} minutes...`);

    const startTime = Date.now();
    const endTime = startTime + (this.config.monitoringDuration * 60 * 1000);

    while (Date.now() < endTime) {
      const metrics = await this.collectMetrics();

      // Check error rate
      if (metrics.errorRate > this.config.rollbackThreshold.errorRate) {
        console.log(`❌ Error rate too high: ${metrics.errorRate}%`);
        return false;
      }

      // Check latency
      if (metrics.latencyP95 > this.config.rollbackThreshold.latencyP95) {
        console.log(`❌ Latency too high: ${metrics.latencyP95}ms`);
        return false;
      }

      // Check pod health
      if (metrics.unhealthyPods > 0) {
        console.log(`❌ Unhealthy pods detected: ${metrics.unhealthyPods}`);
        return false;
      }

      console.log(`✓ Metrics OK - Error: ${metrics.errorRate}%, P95: ${metrics.latencyP95}ms`);
      
      await this.sleep(30000); // Check every 30 seconds
    }

    return true;
  }

  private async collectMetrics(): Promise<any> {
    const errorRate = await this.queryPrometheus(
      'rate(http_request_errors_total{version="green"}[5m]) * 100'
    );

    const latencyP95 = await this.queryPrometheus(
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{version="green"}[5m])) * 1000'
    );

    const unhealthyPods = await this.queryPrometheus(
      'count(kube_pod_status_phase{namespace="ecommerce-prod",version="green",phase!="Running"})'
    );

    return {
      errorRate: parseFloat(errorRate) || 0,
      latencyP95: parseFloat(latencyP95) || 0,
      unhealthyPods: parseInt(unhealthyPods) || 0,
    };
  }

  private async rollback(serviceName: string): Promise<void> {
    console.log('\n🔄 Rolling back to blue version...');

    // Shift all traffic back to blue
    await this.shiftTraffic(serviceName, 0);

    // Delete green deployment
    await exec(`kubectl delete deployment ${serviceName}-green -n ecommerce-prod`);

    console.log('✅ Rollback completed');
  }

  private async queryPrometheus(query: string): Promise<string> {
    const { stdout } = await exec(
      `kubectl exec -n monitoring prometheus-0 -- promtool query instant "${query}"`
    );
    return stdout.trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Step 3: Automated Rollout Script

**Create comprehensive rollout automation:**

```bash
#!/bin/bash
# scripts/deployment/staged-rollout.sh

set -e

SERVICE_NAME=${1:-"core-service"}
NEW_VERSION=${2:-"v2.0.0"}
NAMESPACE="ecommerce-prod"

echo "=== Staged Production Rollout ==="
echo "Service: $SERVICE_NAME"
echo "New Version: $NEW_VERSION"
echo "Namespace: $NAMESPACE"
echo ""

# Pre-rollout checks
echo "1. Pre-Rollout Checks"
echo "   Verifying current deployment..."
kubectl get deployment ${SERVICE_NAME}-blue -n $NAMESPACE

echo "   Checking backup status..."
LATEST_BACKUP=$(aws s3 ls s3://ecommerce-backups/mongodb/full/ | sort | tail -1)
echo "   Latest backup: $LATEST_BACKUP"

echo "   Verifying monitoring..."
curl -f http://prometheus:9090/-/healthy || exit 1
curl -f http://grafana:3000/api/health || exit 1

# Deploy green version
echo ""
echo "2. Deploying Green Version"
kubectl apply -f k8s/deployments/blue-green/core-service-green.yaml

echo "   Waiting for green pods to be ready..."
kubectl wait --for=condition=ready pod \
  -l app=$SERVICE_NAME,version=green \
  -n $NAMESPACE \
  --timeout=300s

# Run smoke tests on green
echo ""
echo "3. Running Smoke Tests on Green"
GREEN_POD=$(kubectl get pod -n $NAMESPACE -l app=$SERVICE_NAME,version=green -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $GREEN_POD -- curl -f http://localhost:3000/health

# Start canary rollout
echo ""
echo "4. Starting Canary Rollout"
node scripts/deployment/traffic-shifter.js $SERVICE_NAME $NEW_VERSION

# Verify rollout success
if [ $? -eq 0 ]; then
  echo ""
  echo "5. Rollout Successful - Cleaning Up"
  
  # Delete blue deployment
  kubectl delete deployment ${SERVICE_NAME}-blue -n $NAMESPACE
  
  # Rename green to blue for next deployment
  kubectl patch deployment ${SERVICE_NAME}-green -n $NAMESPACE \
    --type=json -p='[{"op": "replace", "path": "/metadata/labels/version", "value": "blue"}]'
  
  echo ""
  echo "✅ Staged rollout completed successfully!"
  echo "   New version $NEW_VERSION is now serving 100% of traffic"
else
  echo ""
  echo "❌ Rollout failed - check logs for details"
  exit 1
fi
```

### Step 4: Monitoring During Rollout

**Create real-time monitoring dashboard:**

```typescript
// scripts/deployment/rollout-monitor.ts

import blessed from 'blessed';
import contrib from 'blessed-contrib';

export class RolloutMonitor {
  private screen: any;
  private grid: any;
  private metrics: any = {};

  constructor() {
    this.screen = blessed.screen();
    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });
  }

  async start(serviceName: string): Promise<void> {
    // Create dashboard widgets
    const trafficGauge = this.grid.set(0, 0, 4, 6, contrib.gauge, {
      label: 'Traffic to New Version',
      stroke: 'green',
      fill: 'white',
    });

    const errorLine = this.grid.set(0, 6, 4, 6, contrib.line, {
      style: { line: 'red', text: 'white', baseline: 'white' },
      label: 'Error Rate (%)',
      maxY: 1,
    });

    const latencyLine = this.grid.set(4, 0, 4, 6, contrib.line, {
      style: { line: 'yellow', text: 'white', baseline: 'white' },
      label: 'P95 Latency (ms)',
      maxY: 500,
    });

    const podTable = this.grid.set(4, 6, 4, 6, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: 'Pod Status',
      width: '100%',
      height: '100%',
      columnSpacing: 3,
      columnWidth: [20, 10, 10],
    });

    const log = this.grid.set(8, 0, 4, 12, contrib.log, {
      fg: 'green',
      selectedFg: 'green',
      label: 'Rollout Log',
    });

    // Update metrics every 5 seconds
    setInterval(async () => {
      const metrics = await this.collectMetrics(serviceName);
      
      trafficGauge.setPercent(metrics.trafficPercentage);
      
      errorLine.setData([{
        title: 'Error Rate',
        x: metrics.timestamps,
        y: metrics.errorRates,
      }]);

      latencyLine.setData([{
        title: 'P95 Latency',
        x: metrics.timestamps,
        y: metrics.latencies,
      }]);

      podTable.setData({
        headers: ['Pod Name', 'Status', 'Restarts'],
        data: metrics.pods,
      });

      log.log(`[${new Date().toISOString()}] Traffic: ${metrics.trafficPercentage}%, Error: ${metrics.currentErrorRate}%, P95: ${metrics.currentLatency}ms`);

      this.screen.render();
    }, 5000);

    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
    this.screen.render();
  }

  private async collectMetrics(serviceName: string): Promise<any> {
    // Collect metrics from Prometheus
    // Implementation similar to TrafficShifter.collectMetrics()
    return {
      trafficPercentage: 50,
      timestamps: ['10:00', '10:05', '10:10'],
      errorRates: [0.05, 0.06, 0.04],
      latencies: [180, 190, 175],
      currentErrorRate: 0.04,
      currentLatency: 175,
      pods: [
        ['core-service-green-abc123', 'Running', '0'],
        ['core-service-green-def456', 'Running', '0'],
      ],
    };
  }
}
```

---

## Testing

**Test rollout in staging:**

```bash
# Test blue-green deployment
./scripts/deployment/test-blue-green.sh

# Test canary deployment
./scripts/deployment/test-canary.sh

# Test rollback
./scripts/deployment/test-rollback.sh
```

---

## Deliverables

- [ ] Blue-green deployment configured
- [ ] Canary deployment with Flagger configured
- [ ] Traffic shifting automation implemented
- [ ] Rollback procedures tested
- [ ] Monitoring dashboard created
- [ ] Rollout runbook documented
- [ ] Staged rollout completed successfully
- [ ] Old version decommissioned

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| Zero downtime | 100% | ___ |
| Successful traffic shift | 100% to new version | ___ |
| Error rate during rollout | < 0.1% | ___ |
| Rollback capability | < 5 minutes | ___ |
| User impact | None | ___ |

---

**Task Owner:** DevOps + SRE Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
