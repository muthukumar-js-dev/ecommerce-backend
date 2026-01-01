# Phase 5 - Task 6: Chaos Engineering & Resilience Testing

**Duration:** 3-4 days  
**Priority:** Medium  
**Dependencies:** Task 2 (Production Rollout Complete)

---

## Objective

Implement chaos engineering practices to proactively test system resilience, identify weaknesses, and validate disaster recovery procedures through controlled failure injection.

---

## Context

Chaos engineering provides:
- **Proactive Testing:** Find issues before customers do
- **Confidence:** Validate resilience mechanisms
- **Learning:** Understand system behavior under stress
- **Improvement:** Identify and fix weaknesses
- **Preparedness:** Team practice for real incidents

---

## Implementation Steps

### Step 1: Deploy Chaos Mesh

**Install Chaos Mesh:**

```bash
#!/bin/bash
# scripts/chaos/install-chaos-mesh.sh

echo "=== Installing Chaos Mesh ==="

# Add Chaos Mesh Helm repo
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Install Chaos Mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace=chaos-testing \
  --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock \
  --set dashboard.create=true

# Wait for deployment
kubectl wait --for=condition=Ready pods --all -n chaos-testing --timeout=300s

echo "✓ Chaos Mesh installed"
echo "Dashboard: kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333"
```

### Step 2: Pod Failure Experiments

**Create pod kill experiment:**

```yaml
# chaos-experiments/pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-experiment
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - ecommerce-prod
    labelSelectors:
      app: core-service
  scheduler:
    cron: '@every 2h'  # Run every 2 hours
  duration: '30s'
```

**Create pod failure experiment:**

```yaml
# chaos-experiments/pod-failure.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-experiment
  namespace: chaos-testing
spec:
  action: pod-failure
  mode: fixed-percent
  value: '20'  # Fail 20% of pods
  selector:
    namespaces:
      - ecommerce-prod
    labelSelectors:
      app: core-service
  duration: '5m'
```

### Step 3: Network Chaos Experiments

**Create network delay experiment:**

```yaml
# chaos-experiments/network-delay.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay-experiment
  namespace: chaos-testing
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - ecommerce-prod
    labelSelectors:
      app: core-service
  delay:
    latency: '100ms'
    correlation: '25'
    jitter: '10ms'
  duration: '10m'
  direction: to
  target:
    mode: all
    selector:
      namespaces:
        - ecommerce-prod
      labelSelectors:
        app: payment-service
```

**Create network partition experiment:**

```yaml
# chaos-experiments/network-partition.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition-experiment
  namespace: chaos-testing
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - ecommerce-prod
    labelSelectors:
      app: core-service
  direction: both
  target:
    mode: all
    selector:
      namespaces:
        - ecommerce-prod
      labelSelectors:
        app: mongodb
  duration: '2m'
```

### Step 4: Stress Testing Experiments

**Create CPU stress experiment:**

```yaml
# chaos-experiments/cpu-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-experiment
  namespace: chaos-testing
spec:
  mode: one
  selector:
    namespaces:
      - ecommerce-prod
    labelSelectors:
      app: core-service
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: '5m'
```

**Create memory stress experiment:**

```yaml
# chaos-experiments/memory-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress-experiment
  namespace: chaos-testing
spec:
  mode: one
  selector:
    namespaces:
      - ecommerce-prod
    labelSelectors:
      app: core-service
  stressors:
    memory:
      workers: 1
      size: '512MB'
  duration: '5m'
```

### Step 5: Automated Chaos Testing Suite

**Create chaos testing automation:**

```typescript
// scripts/chaos/chaos-runner.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ChaosExperiment {
  name: string;
  file: string;
  duration: number;
  validations: string[];
}

export class ChaosRunner {
  private experiments: ChaosExperiment[] = [
    {
      name: 'Pod Kill',
      file: 'chaos-experiments/pod-kill.yaml',
      duration: 60,
      validations: ['pod_recovery', 'service_availability', 'error_rate'],
    },
    {
      name: 'Network Delay',
      file: 'chaos-experiments/network-delay.yaml',
      duration: 600,
      validations: ['latency_increase', 'timeout_handling', 'circuit_breaker'],
    },
    {
      name: 'CPU Stress',
      file: 'chaos-experiments/cpu-stress.yaml',
      duration: 300,
      validations: ['autoscaling', 'performance_degradation', 'resource_limits'],
    },
  ];

  async runExperiment(experiment: ChaosExperiment): Promise<boolean> {
    console.log(`\n🔬 Running Chaos Experiment: ${experiment.name}`);
    
    // Capture baseline metrics
    const baseline = await this.captureMetrics();
    
    // Apply chaos experiment
    console.log('  Applying chaos...');
    await execAsync(`kubectl apply -f ${experiment.file}`);
    
    // Monitor during experiment
    console.log(`  Monitoring for ${experiment.duration}s...`);
    await this.monitorExperiment(experiment.duration);
    
    // Capture post-chaos metrics
    const postChaos = await this.captureMetrics();
    
    // Cleanup
    await execAsync(`kubectl delete -f ${experiment.file}`);
    
    // Wait for recovery
    console.log('  Waiting for system recovery...');
    await this.waitForRecovery();
    
    // Validate results
    const results = await this.validateExperiment(experiment, baseline, postChaos);
    
    return results.passed;
  }

  async runAllExperiments(): Promise<void> {
    console.log('=== Chaos Engineering Test Suite ===\n');
    
    const results = [];
    
    for (const experiment of this.experiments) {
      const passed = await this.runExperiment(experiment);
      results.push({ experiment: experiment.name, passed });
      
      // Wait between experiments
      await this.sleep(60000); // 1 minute
    }
    
    // Generate report
    this.generateReport(results);
  }

  private async captureMetrics(): Promise<any> {
    const metrics = {
      errorRate: await this.queryPrometheus('rate(http_request_errors_total[1m])'),
      latencyP95: await this.queryPrometheus('histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))'),
      podCount: await this.queryPrometheus('count(kube_pod_status_phase{phase="Running"})'),
      requestRate: await this.queryPrometheus('rate(http_requests_total[1m])'),
    };
    
    return metrics;
  }

  private async monitorExperiment(duration: number): Promise<void> {
    const interval = 10; // Check every 10 seconds
    const iterations = duration / interval;
    
    for (let i = 0; i < iterations; i++) {
      const metrics = await this.captureMetrics();
      console.log(`    [${i * interval}s] Error: ${metrics.errorRate}%, P95: ${metrics.latencyP95}ms`);
      
      // Check if system is completely down
      if (metrics.requestRate === 0) {
        console.log('    ⚠️  WARNING: System appears to be down!');
      }
      
      await this.sleep(interval * 1000);
    }
  }

  private async waitForRecovery(): Promise<void> {
    const maxWait = 300; // 5 minutes
    const interval = 10;
    
    for (let i = 0; i < maxWait / interval; i++) {
      const metrics = await this.captureMetrics();
      
      if (metrics.errorRate < 0.1 && metrics.latencyP95 < 200) {
        console.log(`  ✓ System recovered in ${i * interval}s`);
        return;
      }
      
      await this.sleep(interval * 1000);
    }
    
    console.log('  ⚠️  WARNING: System did not fully recover within timeout');
  }

  private async validateExperiment(
    experiment: ChaosExperiment,
    baseline: any,
    postChaos: any
  ): Promise<any> {
    const validations: any = {};
    
    for (const validation of experiment.validations) {
      switch (validation) {
        case 'pod_recovery':
          validations.pod_recovery = postChaos.podCount >= baseline.podCount;
          break;
        case 'service_availability':
          validations.service_availability = postChaos.requestRate > 0;
          break;
        case 'error_rate':
          validations.error_rate = postChaos.errorRate < 1; // < 1%
          break;
        case 'autoscaling':
          validations.autoscaling = postChaos.podCount > baseline.podCount;
          break;
      }
    }
    
    const passed = Object.values(validations).every(v => v === true);
    
    console.log(`\n  Validation Results:`);
    Object.entries(validations).forEach(([key, value]) => {
      console.log(`    ${value ? '✓' : '✗'} ${key}`);
    });
    
    return { passed, validations };
  }

  private generateReport(results: any[]): void {
    console.log('\n=== Chaos Engineering Report ===\n');
    console.log(`Total Experiments: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.passed).length}`);
    console.log(`Failed: ${results.filter(r => !r.passed).length}`);
    
    results.forEach(r => {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.experiment}`);
    });
  }

  private async queryPrometheus(query: string): Promise<number> {
    const { stdout } = await execAsync(
      `kubectl exec -n monitoring prometheus-0 -- promtool query instant "${query}"`
    );
    return parseFloat(stdout) || 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Step 6: Scheduled Chaos Testing

**Create weekly chaos testing schedule:**

```yaml
# chaos-experiments/chaos-schedule.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: weekly-chaos-tests
  namespace: chaos-testing
spec:
  schedule: '0 2 * * 1'  # Every Monday at 2 AM
  type: 'Workflow'
  workflowSpec:
    entry: chaos-workflow
    templates:
      - name: chaos-workflow
        templateType: Serial
        children:
          - pod-kill-test
          - network-delay-test
          - cpu-stress-test
      
      - name: pod-kill-test
        templateType: PodChaos
        deadline: 5m
        podChaos:
          action: pod-kill
          mode: one
          selector:
            namespaces:
              - ecommerce-prod
            labelSelectors:
              app: core-service
      
      - name: network-delay-test
        templateType: NetworkChaos
        deadline: 10m
        networkChaos:
          action: delay
          mode: all
          selector:
            namespaces:
              - ecommerce-prod
          delay:
            latency: '100ms'
      
      - name: cpu-stress-test
        templateType: StressChaos
        deadline: 5m
        stressChaos:
          mode: one
          selector:
            namespaces:
              - ecommerce-prod
          stressors:
            cpu:
              workers: 2
              load: 80
```

---

## Deliverables

- [ ] Chaos Mesh deployed
- [ ] Pod failure experiments created
- [ ] Network chaos experiments created
- [ ] Stress testing experiments created
- [ ] Automated chaos runner implemented
- [ ] Weekly chaos schedule configured
- [ ] Chaos testing runbook created
- [ ] Team trained on chaos engineering

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| System recovery time | < 5 min | ___ |
| Service availability during chaos | > 99% | ___ |
| Auto-scaling triggered | Yes | ___ |
| Circuit breakers activated | Yes | ___ |
| No data loss | 100% | ___ |

---

**Task Owner:** SRE + DevOps Team  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
