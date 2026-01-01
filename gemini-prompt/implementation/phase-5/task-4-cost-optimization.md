# Phase 5 - Task 4: Cost Optimization & Resource Management

**Duration:** 3-4 days  
**Priority:** High  
**Dependencies:** Task 3 (Monitoring Operational)

---

## Objective

Implement comprehensive cost optimization strategies including right-sizing, auto-scaling policies, resource cleanup, and cost monitoring to reduce cloud spend while maintaining performance.

---

## Context

Cost optimization provides:
- **Reduced Spend:** Lower cloud infrastructure costs
- **Resource Efficiency:** Optimal resource utilization
- **Budget Control:** Predictable monthly costs
- **Sustainability:** Reduced environmental impact
- **Business Value:** Better ROI on infrastructure

---

## Implementation Steps

### Step 1: Resource Right-Sizing

**Analyze current resource usage:**

```typescript
// scripts/cost-optimization/resource-analyzer.ts

interface ResourceRecommendation {
  resource: string;
  currentSize: string;
  recommendedSize: string;
  currentCost: number;
  projectedCost: number;
  savings: number;
}

export class ResourceAnalyzer {
  async analyzeResources(): Promise<ResourceRecommendation[]> {
    const recommendations: ResourceRecommendation[] = [];

    // Analyze pod resources
    const pods = await this.getPodMetrics();
    
    for (const pod of pods) {
      const avgCPU = await this.getAvgMetric(`container_cpu_usage_seconds_total{pod="${pod.name}"}`, '7d');
      const avgMemory = await this.getAvgMetric(`container_memory_usage_bytes{pod="${pod.name}"}`, '7d');
      
      const cpuRequest = pod.resources.requests.cpu;
      const memoryRequest = pod.resources.requests.memory;

      // If using < 50% of requested resources, recommend downsizing
      if (avgCPU < cpuRequest * 0.5 || avgMemory < memoryRequest * 0.5) {
        recommendations.push({
          resource: pod.name,
          currentSize: `CPU: ${cpuRequest}, Memory: ${memoryRequest}`,
          recommendedSize: `CPU: ${Math.ceil(avgCPU * 1.2)}, Memory: ${Math.ceil(avgMemory * 1.2)}`,
          currentCost: this.calculateCost(cpuRequest, memoryRequest),
          projectedCost: this.calculateCost(avgCPU * 1.2, avgMemory * 1.2),
          savings: this.calculateCost(cpuRequest, memoryRequest) - this.calculateCost(avgCPU * 1.2, avgMemory * 1.2),
        });
      }
    }

    return recommendations;
  }

  private calculateCost(cpu: number, memory: number): number {
    // AWS EKS pricing (approximate)
    const cpuCostPerHour = 0.0416; // per vCPU
    const memoryCostPerHour = 0.0046; // per GB
    const hoursPerMonth = 730;

    return (cpu * cpuCostPerHour + (memory / 1024) * memoryCostPerHour) * hoursPerMonth;
  }
}
```

**Apply right-sizing recommendations:**

```bash
#!/bin/bash
# scripts/cost-optimization/apply-rightsizing.sh

echo "=== Applying Resource Right-Sizing ==="

# Generate recommendations
node scripts/cost-optimization/resource-analyzer.js > recommendations.json

# Review recommendations
cat recommendations.json | jq '.[] | select(.savings > 10)'

# Apply recommendations (requires manual approval)
while IFS= read -r recommendation; do
  POD=$(echo $recommendation | jq -r '.resource')
  NEW_CPU=$(echo $recommendation | jq -r '.recommendedSize.cpu')
  NEW_MEMORY=$(echo $recommendation | jq -r '.recommendedSize.memory')
  
  echo "Updating $POD to CPU: $NEW_CPU, Memory: $NEW_MEMORY"
  
  # Update deployment
  kubectl set resources deployment/$POD \
    --requests=cpu=$NEW_CPU,memory=$NEW_MEMORY \
    -n ecommerce-prod
done < <(cat recommendations.json | jq -c '.[]')
```

### Step 2: Intelligent Auto-Scaling

**Configure cost-aware auto-scaling:**

```yaml
# k8s/autoscaling/cost-aware-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: core-service-cost-aware
  namespace: ecommerce-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  minReplicas: 3
  maxReplicas: 50
  metrics:
    # CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale at 70% to balance cost/performance
    
    # Memory-based scaling
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
    
    # Custom metric: requests per pod
    - type: Pods
      pods:
        metric:
          name: http_requests_per_pod
        target:
          type: AverageValue
          averageValue: "1000"  # Scale when > 1000 req/s per pod
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 50  # Scale down max 50% at a time
          periodSeconds: 60
        - type: Pods
          value: 2  # Or max 2 pods at a time
          periodSeconds: 60
      selectPolicy: Min  # Use the most conservative policy
    
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
        - type: Percent
          value: 100  # Can double pods
          periodSeconds: 15
        - type: Pods
          value: 4  # Or add 4 pods at a time
          periodSeconds: 15
      selectPolicy: Max  # Use the most aggressive policy
```

**Configure Cluster Autoscaler with cost optimization:**

```yaml
# k8s/autoscaling/cluster-autoscaler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    10:
      - .*-spot-.*  # Prefer spot instances (cheapest)
    5:
      - .*-standard-.*  # Then standard instances
    1:
      - .*-ondemand-.*  # On-demand as last resort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
        - name: cluster-autoscaler
          image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.24.0
          command:
            - ./cluster-autoscaler
            - --v=4
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=priority
            - --balance-similar-node-groups
            - --skip-nodes-with-system-pods=false
            - --scale-down-enabled=true
            - --scale-down-delay-after-add=10m
            - --scale-down-unneeded-time=10m
            - --scale-down-utilization-threshold=0.5  # Scale down at 50% utilization
```

### Step 3: Resource Cleanup Automation

**Create automated cleanup jobs:**

```typescript
// scripts/cost-optimization/resource-cleanup.ts

export class ResourceCleanup {
  async cleanupUnusedResources(): Promise<void> {
    console.log('=== Resource Cleanup ===\n');

    await this.cleanupOldImages();
    await this.cleanupUnusedVolumes();
    await this.cleanupOldBackups();
    await this.cleanupUnusedLoadBalancers();
    await this.cleanupOldLogs();
  }

  private async cleanupOldImages(): Promise<void> {
    console.log('Cleaning up old container images...');
    
    // Delete images older than 30 days
    const images = await this.listECRImages();
    const oldImages = images.filter(img => {
      const age = Date.now() - img.pushedAt.getTime();
      return age > 30 * 24 * 60 * 60 * 1000; // 30 days
    });

    for (const image of oldImages) {
      await this.deleteECRImage(image.digest);
      console.log(`  Deleted: ${image.tag}`);
    }

    console.log(`✓ Deleted ${oldImages.length} old images\n`);
  }

  private async cleanupUnusedVolumes(): Promise<void> {
    console.log('Cleaning up unused volumes...');
    
    const volumes = await this.listEBSVolumes();
    const unusedVolumes = volumes.filter(v => v.state === 'available');

    for (const volume of unusedVolumes) {
      // Check if volume has been unused for > 7 days
      const lastAttached = await this.getVolumeLastAttached(volume.id);
      if (Date.now() - lastAttached > 7 * 24 * 60 * 60 * 1000) {
        await this.deleteVolume(volume.id);
        console.log(`  Deleted: ${volume.id}`);
      }
    }

    console.log(`✓ Deleted ${unusedVolumes.length} unused volumes\n`);
  }

  private async cleanupOldBackups(): Promise<void> {
    console.log('Cleaning up old backups...');
    
    // Keep: 7 daily, 4 weekly, 12 monthly
    const backups = await this.listS3Backups();
    const toDelete = this.selectBackupsToDelete(backups);

    for (const backup of toDelete) {
      await this.deleteS3Object(backup.key);
      console.log(`  Deleted: ${backup.key}`);
    }

    console.log(`✓ Deleted ${toDelete.length} old backups\n`);
  }

  private async cleanupUnusedLoadBalancers(): Promise<void> {
    console.log('Checking for unused load balancers...');
    
    const lbs = await this.listLoadBalancers();
    
    for (const lb of lbs) {
      const targets = await this.getLoadBalancerTargets(lb.arn);
      if (targets.length === 0) {
        console.log(`  Warning: Load balancer ${lb.name} has no targets`);
      }
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    console.log('Cleaning up old logs...');
    
    // Delete CloudWatch logs older than retention period
    const logGroups = await this.listLogGroups();
    
    for (const group of logGroups) {
      await this.setLogRetention(group.name, 90); // 90 days
    }

    console.log('✓ Set log retention policies\n');
  }
}
```

**Schedule cleanup as CronJob:**

```yaml
# k8s/jobs/resource-cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resource-cleanup
  namespace: ecommerce-prod
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: resource-cleanup-sa
          containers:
            - name: cleanup
              image: ecommerce/resource-cleanup:latest
              env:
                - name: AWS_REGION
                  value: "ap-south-1"
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
          restartPolicy: OnFailure
```

### Step 4: Cost Monitoring & Reporting

**Create cost monitoring dashboard:**

```typescript
// scripts/cost-optimization/cost-monitor.ts

interface CostReport {
  period: string;
  totalCost: number;
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    database: number;
  };
  trends: {
    vsLastMonth: number;
    vsLastWeek: number;
  };
  recommendations: string[];
}

export class CostMonitor {
  async generateCostReport(): Promise<CostReport> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const costs = await this.getAWSCosts(currentMonth);
    const lastMonthCosts = await this.getAWSCosts(this.getPreviousMonth());

    const report: CostReport = {
      period: currentMonth,
      totalCost: costs.total,
      breakdown: {
        compute: costs.ec2 + costs.eks,
        storage: costs.s3 + costs.ebs,
        network: costs.dataTransfer,
        database: costs.rds + costs.documentdb,
      },
      trends: {
        vsLastMonth: ((costs.total - lastMonthCosts.total) / lastMonthCosts.total) * 100,
        vsLastWeek: await this.getWeeklyTrend(),
      },
      recommendations: await this.generateRecommendations(costs),
    };

    await this.sendCostReport(report);
    return report;
  }

  private async generateRecommendations(costs: any): Promise<string[]> {
    const recommendations: string[] = [];

    // Check for unused resources
    const unusedVolumes = await this.countUnusedVolumes();
    if (unusedVolumes > 0) {
      recommendations.push(`Delete ${unusedVolumes} unused EBS volumes to save ~$${unusedVolumes * 10}/month`);
    }

    // Check for over-provisioned resources
    const overProvisioned = await this.findOverProvisionedPods();
    if (overProvisioned.length > 0) {
      const savings = overProvisioned.reduce((sum, p) => sum + p.potentialSavings, 0);
      recommendations.push(`Right-size ${overProvisioned.length} pods to save ~$${savings}/month`);
    }

    // Check for spot instance opportunities
    const spotOpportunities = await this.findSpotOpportunities();
    if (spotOpportunities > 0) {
      recommendations.push(`Use spot instances for ${spotOpportunities} workloads to save ~70%`);
    }

    return recommendations;
  }

  private async sendCostReport(report: CostReport): Promise<void> {
    const message = `
📊 *Monthly Cost Report - ${report.period}*

*Total Cost:* $${report.totalCost.toFixed(2)}
*Trend:* ${report.trends.vsLastMonth > 0 ? '📈' : '📉'} ${Math.abs(report.trends.vsLastMonth).toFixed(1)}% vs last month

*Breakdown:*
• Compute: $${report.breakdown.compute.toFixed(2)}
• Storage: $${report.breakdown.storage.toFixed(2)}
• Network: $${report.breakdown.network.toFixed(2)}
• Database: $${report.breakdown.database.toFixed(2)}

*Recommendations:*
${report.recommendations.map(r => `• ${r}`).join('\n')}
`;

    await this.sendToSlack(message, '#finance');
  }
}
```

**Create cost alerts:**

```yaml
# k8s/monitoring/cost-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-alerts
  namespace: monitoring
spec:
  groups:
    - name: cost_optimization
      rules:
        - alert: HighMonthlyCost
          expr: aws_billing_estimated_charges > 5000
          for: 1h
          labels:
            severity: warning
            team: finance
          annotations:
            summary: "Monthly cost exceeding budget"
            description: "Estimated monthly cost is ${{ $value }} (budget: $5000)"

        - alert: CostSpikeDetected
          expr: |
            (aws_billing_estimated_charges - aws_billing_estimated_charges offset 24h) 
            / aws_billing_estimated_charges offset 24h > 0.2
          for: 30m
          labels:
            severity: warning
            team: devops
          annotations:
            summary: "Unusual cost spike detected"
            description: "Cost increased by {{ $value }}% in last 24 hours"
```

---

## Deliverables

- [ ] Resource right-sizing completed
- [ ] Cost-aware auto-scaling configured
- [ ] Automated cleanup jobs deployed
- [ ] Cost monitoring dashboard created
- [ ] Monthly cost reports automated
- [ ] Cost optimization recommendations implemented
- [ ] Team trained on cost management

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| Monthly cost reduction | 20-30% | ___ |
| Resource utilization | > 70% | ___ |
| Unused resources | < 5% | ___ |
| Cost visibility | 100% | ___ |
| Spot instance usage | > 50% | ___ |

---

**Task Owner:** DevOps + FinOps Team  
**Reviewer:** Engineering Manager  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
