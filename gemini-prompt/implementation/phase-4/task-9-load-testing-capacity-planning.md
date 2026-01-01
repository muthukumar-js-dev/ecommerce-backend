# Phase 4 - Task 9: Load Testing & Capacity Planning

**Duration:** 5-6 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-8 (All Infrastructure Ready)

---

## Objective

Conduct comprehensive load testing to validate the system can handle 10 million concurrent users and 100K RPS, identify bottlenecks, perform stress testing, and create detailed capacity planning for production scaling.

---

## Context

Load testing provides:
- **Performance Validation:** Verify system meets targets
- **Bottleneck Identification:** Find performance issues before production
- **Capacity Planning:** Determine resource requirements
- **Cost Optimization:** Right-size infrastructure
- **Confidence:** Ensure system reliability under load

---

## Implementation Steps

### Step 1: Load Testing Tools Setup

**Install Artillery and dependencies:**

```bash
npm install -g artillery@latest
npm install -g artillery-plugin-metrics-by-endpoint
npm install -g artillery-plugin-expect

# Verify installation
artillery --version
```

**Install additional testing tools:**

```bash
# k6 for advanced scenarios
choco install k6

# Apache Bench for quick tests
choco install apache-bench

# Locust for Python-based tests (optional)
pip install locust
```

### Step 2: Comprehensive Load Test Configuration

**Create `load-tests/production-simulation.yml`:**

```yaml
config:
  target: 'https://api.yourdomain.com'
  phases:
    # Phase 1: Warm-up
    - duration: 300
      arrivalRate: 100
      name: 'Warm up - 100 RPS'
    
    # Phase 2: Gradual ramp to 1K RPS
    - duration: 300
      arrivalRate: 100
      rampTo: 1000
      name: 'Ramp to 1K RPS'
    
    # Phase 3: Sustained 1K RPS
    - duration: 600
      arrivalRate: 1000
      name: 'Sustained 1K RPS - 10 minutes'
    
    # Phase 4: Ramp to 10K RPS
    - duration: 600
      arrivalRate: 1000
      rampTo: 10000
      name: 'Ramp to 10K RPS'
    
    # Phase 5: Sustained 10K RPS (simulating 10M users)
    - duration: 1800
      arrivalRate: 10000
      name: 'Sustained 10K RPS - 30 minutes'
    
    # Phase 6: Peak load 50K RPS
    - duration: 300
      arrivalRate: 10000
      rampTo: 50000
      name: 'Ramp to peak - 50K RPS'
    
    # Phase 7: Sustained peak
    - duration: 600
      arrivalRate: 50000
      name: 'Sustained peak - 50K RPS - 10 minutes'
    
    # Phase 8: Spike to 100K RPS
    - duration: 120
      arrivalRate: 50000
      rampTo: 100000
      name: 'Spike to 100K RPS'
    
    # Phase 9: Brief sustained 100K
    - duration: 180
      arrivalRate: 100000
      name: 'Sustained 100K RPS - 3 minutes'
    
    # Phase 10: Ramp down
    - duration: 300
      arrivalRate: 100000
      rampTo: 100
      name: 'Ramp down'
  
  processor: './load-test-processor.js'
  
  plugins:
    metrics-by-endpoint:
      stripQueryString: true
      excludeQueryString: false
    expect: {}
  
  http:
    timeout: 10
    pool: 100
  
  variables:
    baseUrl: 'https://api.yourdomain.com'

scenarios:
  # Scenario 1: User Registration and Login (10%)
  - name: 'User Authentication Flow'
    weight: 10
    flow:
      - post:
          url: '/api/users/register'
          json:
            name: '{{ $randomString() }}'
            email: '{{ $randomEmail() }}'
            password: 'Test@123456'
          capture:
            - json: '$.data.userId'
              as: 'userId'
            - json: '$.data.token'
              as: 'token'
          expect:
            - statusCode: 201
            - contentType: json
            - hasProperty: data.token
      
      - think: 2
      
      - post:
          url: '/api/users/login'
          json:
            email: '{{ email }}'
            password: 'Test@123456'
          capture:
            - json: '$.data.token'
              as: 'loginToken'
          expect:
            - statusCode: 200
            - hasProperty: data.token
      
      - get:
          url: '/api/users/profile'
          headers:
            Authorization: 'Bearer {{ loginToken }}'
          expect:
            - statusCode: 200
  
  # Scenario 2: Product Browsing (50%)
  - name: 'Product Browsing and Search'
    weight: 50
    flow:
      - get:
          url: '/api/products?page={{ $randomNumber(1, 100) }}&limit=20'
          expect:
            - statusCode: 200
            - contentType: json
            - hasProperty: data
      
      - think: 1
      
      - get:
          url: '/api/products/{{ $randomString() }}'
          expect:
            - statusCode: [200, 404]
      
      - think: 2
      
      - get:
          url: '/api/products/search?q={{ $randomString() }}&page=1&limit=20'
          expect:
            - statusCode: 200
      
      - get:
          url: '/api/products/categories'
          expect:
            - statusCode: 200
      
      - think: 1
      
      - get:
          url: '/api/products?category={{ $randomString() }}&page=1&limit=20'
          expect:
            - statusCode: 200
  
  # Scenario 3: Shopping Cart Operations (25%)
  - name: 'Shopping Cart Management'
    weight: 25
    flow:
      - post:
          url: '/api/users/login'
          json:
            email: 'loadtest@example.com'
            password: 'Test@123456'
          capture:
            - json: '$.data.token'
              as: 'token'
      
      - get:
          url: '/api/cart'
          headers:
            Authorization: 'Bearer {{ token }}'
          expect:
            - statusCode: 200
      
      - post:
          url: '/api/cart/add'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            productId: '{{ $randomString() }}'
            quantity: '{{ $randomNumber(1, 5) }}'
          expect:
            - statusCode: [200, 201]
      
      - think: 1
      
      - put:
          url: '/api/cart/update'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            productId: '{{ $randomString() }}'
            quantity: '{{ $randomNumber(1, 10) }}'
          expect:
            - statusCode: 200
      
      - get:
          url: '/api/cart'
          headers:
            Authorization: 'Bearer {{ token }}'
          expect:
            - statusCode: 200
  
  # Scenario 4: Order Placement (15%)
  - name: 'Complete Order Flow'
    weight: 15
    flow:
      - post:
          url: '/api/users/login'
          json:
            email: 'loadtest@example.com'
            password: 'Test@123456'
          capture:
            - json: '$.data.token'
              as: 'token'
      
      - post:
          url: '/api/orders'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            items:
              - productId: '{{ $randomString() }}'
                quantity: 2
                price: 1999
            shippingAddress:
              street: '123 Test Street'
              city: 'Mumbai'
              state: 'MH'
              postalCode: '400001'
              country: 'IN'
            paymentMethodId: 'pm_test_{{ $randomString() }}'
          capture:
            - json: '$.data.orderId'
              as: 'orderId'
          expect:
            - statusCode: [200, 201]
            - hasProperty: data.orderId
      
      - think: 2
      
      - get:
          url: '/api/orders/{{ orderId }}'
          headers:
            Authorization: 'Bearer {{ token }}'
          expect:
            - statusCode: 200
      
      - get:
          url: '/api/orders'
          headers:
            Authorization: 'Bearer {{ token }}'
          expect:
            - statusCode: 200
```

**Create processor file `load-tests/load-test-processor.js`:**

```javascript
module.exports = {
  generateRandomEmail,
  generateRandomString,
  generateRandomNumber,
  setAuthToken,
  logResponse,
};

function generateRandomEmail(context, events, done) {
  context.vars.email = `loadtest${Date.now()}${Math.random().toString(36).substring(7)}@example.com`;
  return done();
}

function generateRandomString(context, events, done) {
  context.vars.randomString = Math.random().toString(36).substring(2, 15);
  return done();
}

function generateRandomNumber(context, events, done) {
  const min = context.vars.min || 1;
  const max = context.vars.max || 100;
  context.vars.randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return done();
}

function setAuthToken(requestParams, context, ee, next) {
  if (context.vars.token) {
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['Authorization'] = `Bearer ${context.vars.token}`;
  }
  return next();
}

function logResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.log(`Error ${response.statusCode}: ${requestParams.url}`);
  }
  return next();
}
```

### Step 3: Stress Testing Configuration

**Create `load-tests/stress-test.yml`:**

```yaml
config:
  target: 'https://api.yourdomain.com'
  phases:
    # Find breaking point
    - duration: 600
      arrivalRate: 1000
      rampTo: 200000
      name: 'Stress test - find breaking point'
    
    # Sustained stress
    - duration: 300
      arrivalRate: 200000
      name: 'Sustained stress'

scenarios:
  - name: 'Heavy Load'
    flow:
      - get:
          url: '/api/products?page={{ $randomNumber(1, 1000) }}&limit=50'
      - post:
          url: '/api/users/login'
          json:
            email: 'stress@example.com'
            password: 'Test@123'
      - get:
          url: '/api/orders'
```

### Step 4: Database Load Testing

**Create comprehensive database load test:**

```typescript
// tests/load/database-load-comprehensive.test.ts
import mongoose from 'mongoose';
import { UserModel } from '@domain/user/models/user.model';
import { ProductModel } from '@domain/product/models/product.model';
import { OrderModel } from '@domain/order/models/order.model';

describe('Database Load Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Write Performance', () => {
    it('should handle 10K concurrent user writes', async () => {
      const writes = Array.from({ length: 10000 }, (_, i) =>
        UserModel.create({
          name: `LoadTest User ${i}`,
          email: `loadtest${i}@example.com`,
          password: 'hashed_password',
          role: 'customer',
        })
      );

      const start = Date.now();
      await Promise.all(writes);
      const duration = Date.now() - start;

      console.log(`✓ 10K user writes completed in ${duration}ms`);
      console.log(`✓ Average: ${(duration / 10000).toFixed(2)}ms per write`);
      console.log(`✓ Throughput: ${(10000 / (duration / 1000)).toFixed(0)} writes/sec`);

      expect(duration).toBeLessThan(30000); // Should complete in < 30s
    });

    it('should handle 5K concurrent order writes', async () => {
      const writes = Array.from({ length: 5000 }, (_, i) =>
        OrderModel.create({
          userId: `user-${i}`,
          orderNumber: `ORD-${Date.now()}-${i}`,
          items: [
            {
              productId: `prod-${i}`,
              quantity: Math.floor(Math.random() * 5) + 1,
              price: Math.floor(Math.random() * 10000) + 100,
            },
          ],
          total: Math.floor(Math.random() * 50000) + 1000,
          status: 'pending',
        })
      );

      const start = Date.now();
      await Promise.all(writes);
      const duration = Date.now() - start;

      console.log(`✓ 5K order writes completed in ${duration}ms`);
      expect(duration).toBeLessThan(20000);
    });
  });

  describe('Read Performance', () => {
    it('should handle 50K concurrent product reads', async () => {
      // Pre-populate some products
      await ProductModel.insertMany(
        Array.from({ length: 1000 }, (_, i) => ({
          title: `Product ${i}`,
          description: `Description for product ${i}`,
          price: Math.floor(Math.random() * 10000) + 100,
          category: `Category ${i % 10}`,
          inventory: Math.floor(Math.random() * 1000),
        }))
      );

      const reads = Array.from({ length: 50000 }, () =>
        ProductModel.find().limit(20).lean()
      );

      const start = Date.now();
      await Promise.all(reads);
      const duration = Date.now() - start;

      console.log(`✓ 50K product reads completed in ${duration}ms`);
      console.log(`✓ Average: ${(duration / 50000).toFixed(2)}ms per read`);
      console.log(`✓ Throughput: ${(50000 / (duration / 1000)).toFixed(0)} reads/sec`);

      expect(duration).toBeLessThan(10000); // Should complete in < 10s
    });

    it('should handle complex aggregation queries under load', async () => {
      const aggregations = Array.from({ length: 1000 }, () =>
        OrderModel.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: '$userId', totalSpent: { $sum: '$total' } } },
          { $sort: { totalSpent: -1 } },
          { $limit: 10 },
        ])
      );

      const start = Date.now();
      await Promise.all(aggregations);
      const duration = Date.now() - start;

      console.log(`✓ 1K aggregation queries completed in ${duration}ms`);
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Mixed Workload', () => {
    it('should handle mixed read/write operations', async () => {
      const operations = [];

      // 70% reads, 30% writes
      for (let i = 0; i < 10000; i++) {
        if (Math.random() < 0.7) {
          // Read operation
          operations.push(ProductModel.find().limit(10).lean());
        } else {
          // Write operation
          operations.push(
            UserModel.create({
              name: `User ${i}`,
              email: `user${i}@example.com`,
              password: 'hashed',
            })
          );
        }
      }

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      console.log(`✓ 10K mixed operations completed in ${duration}ms`);
      expect(duration).toBeLessThan(25000);
    });
  });
});
```

### Step 5: Capacity Planning Calculations

**Create capacity planning tool:**

```typescript
// scripts/capacity-planning/calculator.ts

interface ServiceMetrics {
  currentRPS: number;
  currentPods: number;
  cpuPerPod: number; // cores
  memoryPerPod: number; // GB
  avgCPUUtilization: number; // percentage
  avgMemoryUtilization: number; // percentage
}

interface CapacityRequirements {
  targetRPS: number;
  requiredPods: number;
  bufferedPods: number;
  totalCPU: number;
  totalMemory: number;
  estimatedMonthlyCost: number;
  recommendations: string[];
}

export class CapacityPlanner {
  private readonly BUFFER_PERCENTAGE = 0.3; // 30% buffer
  private readonly TARGET_CPU_UTILIZATION = 0.70; // 70%
  private readonly TARGET_MEMORY_UTILIZATION = 0.75; // 75%
  
  // AWS pricing (ap-south-1)
  private readonly COST_PER_VCPU_HOUR = 0.0416; // t3.large
  private readonly COST_PER_GB_HOUR = 0.0052;

  calculateRequirements(
    current: ServiceMetrics,
    targetRPS: number
  ): CapacityRequirements {
    // Calculate RPS per pod
    const rpsPerPod = current.currentRPS / current.currentPods;
    
    // Calculate required pods for target RPS
    const requiredPodsForRPS = Math.ceil(targetRPS / rpsPerPod);
    
    // Calculate required pods based on CPU
    const cpuUtilizationRatio = current.avgCPUUtilization / 100;
    const requiredPodsForCPU = Math.ceil(
      (requiredPodsForRPS * cpuUtilizationRatio) / this.TARGET_CPU_UTILIZATION
    );
    
    // Calculate required pods based on memory
    const memoryUtilizationRatio = current.avgMemoryUtilization / 100;
    const requiredPodsForMemory = Math.ceil(
      (requiredPodsForRPS * memoryUtilizationRatio) / this.TARGET_MEMORY_UTILIZATION
    );
    
    // Take the maximum
    const requiredPods = Math.max(
      requiredPodsForRPS,
      requiredPodsForCPU,
      requiredPodsForMemory
    );
    
    // Add buffer
    const bufferedPods = Math.ceil(requiredPods * (1 + this.BUFFER_PERCENTAGE));
    
    // Calculate total resources
    const totalCPU = bufferedPods * current.cpuPerPod;
    const totalMemory = bufferedPods * current.memoryPerPod;
    
    // Calculate monthly cost
    const hoursPerMonth = 730;
    const monthlyCost =
      totalCPU * this.COST_PER_VCPU_HOUR * hoursPerMonth +
      totalMemory * this.COST_PER_GB_HOUR * hoursPerMonth;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      current,
      requiredPods,
      bufferedPods,
      targetRPS
    );

    return {
      targetRPS,
      requiredPods,
      bufferedPods,
      totalCPU,
      totalMemory,
      estimatedMonthlyCost: monthlyCost,
      recommendations,
    };
  }

  private generateRecommendations(
    current: ServiceMetrics,
    required: number,
    buffered: number,
    targetRPS: number
  ): string[] {
    const recommendations: string[] = [];

    // CPU recommendations
    if (current.avgCPUUtilization > 80) {
      recommendations.push(
        '⚠️ Current CPU utilization is high (>80%). Consider vertical scaling or optimizing code.'
      );
    } else if (current.avgCPUUtilization < 40) {
      recommendations.push(
        '💡 Current CPU utilization is low (<40%). Consider reducing pod resources to save costs.'
      );
    }

    // Memory recommendations
    if (current.avgMemoryUtilization > 85) {
      recommendations.push(
        '⚠️ Current memory utilization is high (>85%). Increase memory limits or optimize memory usage.'
      );
    }

    // Scaling recommendations
    const scalingFactor = buffered / current.currentPods;
    if (scalingFactor > 5) {
      recommendations.push(
        `⚠️ Significant scaling required (${scalingFactor.toFixed(1)}x). Consider gradual rollout.`
      );
    }

    // Cost recommendations
    const currentCost = this.calculateCurrentCost(current);
    const projectedCost = this.calculateProjectedCost(buffered, current);
    const costIncrease = ((projectedCost - currentCost) / currentCost) * 100;

    if (costIncrease > 100) {
      recommendations.push(
        `💰 Projected cost increase: ${costIncrease.toFixed(0)}%. Consider reserved instances or spot instances.`
      );
    }

    return recommendations;
  }

  private calculateCurrentCost(metrics: ServiceMetrics): number {
    const hoursPerMonth = 730;
    return (
      metrics.currentPods *
      metrics.cpuPerPod *
      this.COST_PER_VCPU_HOUR *
      hoursPerMonth +
      metrics.currentPods *
      metrics.memoryPerPod *
      this.COST_PER_GB_HOUR *
      hoursPerMonth
    );
  }

  private calculateProjectedCost(pods: number, metrics: ServiceMetrics): number {
    const hoursPerMonth = 730;
    return (
      pods * metrics.cpuPerPod * this.COST_PER_VCPU_HOUR * hoursPerMonth +
      pods * metrics.memoryPerPod * this.COST_PER_GB_HOUR * hoursPerMonth
    );
  }

  generateReport(current: ServiceMetrics, targetRPS: number): string {
    const requirements = this.calculateRequirements(current, targetRPS);

    return `
# Capacity Planning Report

## Current State
- RPS: ${current.currentRPS.toLocaleString()}
- Pods: ${current.currentPods}
- CPU per pod: ${current.cpuPerPod} cores
- Memory per pod: ${current.memoryPerPod} GB
- CPU Utilization: ${current.avgCPUUtilization}%
- Memory Utilization: ${current.avgMemoryUtilization}%

## Target State
- Target RPS: ${targetRPS.toLocaleString()}
- Required Pods: ${requirements.requiredPods}
- Buffered Pods (30% buffer): ${requirements.bufferedPods}
- Total CPU: ${requirements.totalCPU.toFixed(1)} cores
- Total Memory: ${requirements.totalMemory.toFixed(1)} GB
- Estimated Monthly Cost: $${requirements.estimatedMonthlyCost.toFixed(2)}

## Scaling Factor
- Pod scaling: ${(requirements.bufferedPods / current.currentPods).toFixed(1)}x
- RPS scaling: ${(targetRPS / current.currentRPS).toFixed(1)}x

## Recommendations
${requirements.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Instance Type Recommendations
Based on ${current.cpuPerPod} cores and ${current.memoryPerPod} GB memory per pod:
- AWS: t3.large (2 vCPU, 8 GB) - $${(0.0832 * 730).toFixed(2)}/month
- AWS: c5.xlarge (4 vCPU, 8 GB) - $${(0.17 * 730).toFixed(2)}/month
- AWS: m5.xlarge (4 vCPU, 16 GB) - $${(0.192 * 730).toFixed(2)}/month
`;
  }
}

// Example usage
const planner = new CapacityPlanner();

const currentMetrics: ServiceMetrics = {
  currentRPS: 10000,
  currentPods: 5,
  cpuPerPod: 0.5,
  memoryPerPod: 1,
  avgCPUUtilization: 65,
  avgMemoryUtilization: 70,
};

// Calculate for 100K RPS
console.log(planner.generateReport(currentMetrics, 100000));
```

### Step 6: Performance Benchmarking

**Create comprehensive benchmark suite:**

```bash
#!/bin/bash
# scripts/benchmarks/run-comprehensive-benchmarks.sh

set -e

echo "=== Running Comprehensive Performance Benchmarks ==="
echo ""

RESULTS_DIR="./benchmarks/results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# 1. API Endpoint Benchmarks
echo "1. API Endpoint Benchmarks"
echo "============================"

echo "Testing /api/products..."
ab -n 10000 -c 100 -g "$RESULTS_DIR/products.tsv" \
  https://api.yourdomain.com/api/products > "$RESULTS_DIR/products.txt"

echo "Testing /api/users/profile..."
ab -n 10000 -c 100 -H "Authorization: Bearer $TOKEN" \
  -g "$RESULTS_DIR/profile.tsv" \
  https://api.yourdomain.com/api/users/profile > "$RESULTS_DIR/profile.txt"

echo "Testing /api/orders..."
ab -n 5000 -c 50 -H "Authorization: Bearer $TOKEN" \
  -g "$RESULTS_DIR/orders.tsv" \
  https://api.yourdomain.com/api/orders > "$RESULTS_DIR/orders.txt"

# 2. Database Query Benchmarks
echo ""
echo "2. Database Query Benchmarks"
echo "============================"
node scripts/benchmarks/db-query-benchmark.js > "$RESULTS_DIR/db-queries.txt"

# 3. Cache Performance
echo ""
echo "3. Cache Performance Benchmarks"
echo "==============================="
node scripts/benchmarks/cache-benchmark.js > "$RESULTS_DIR/cache.txt"

# 4. Generate HTML Report
echo ""
echo "4. Generating HTML Report"
echo "========================="
node scripts/benchmarks/generate-html-report.js "$RESULTS_DIR"

echo ""
echo "✓ Benchmarks complete!"
echo "Results saved to: $RESULTS_DIR"
echo "Open $RESULTS_DIR/report.html to view results"
```

### Step 7: Real-Time Monitoring During Load Tests

**Create monitoring script:**

```typescript
// scripts/load-tests/monitor-during-test.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface Metrics {
  timestamp: Date;
  rps: number;
  p95Latency: number;
  errorRate: number;
  activePods: number;
  cpuUsage: number;
  memoryUsage: number;
}

export class LoadTestMonitor {
  private metrics: Metrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  async startMonitoring(intervalSeconds: number = 10): Promise<void> {
    console.log('Starting load test monitoring...');

    this.monitoringInterval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      this.metrics.push(metrics);
      this.displayMetrics(metrics);
      this.checkThresholds(metrics);
    }, intervalSeconds * 1000);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.generateReport();
    }
  }

  private async collectMetrics(): Promise<Metrics> {
    const [rps, latency, errors, pods, cpu, memory] = await Promise.all([
      this.getRPS(),
      this.getP95Latency(),
      this.getErrorRate(),
      this.getActivePods(),
      this.getCPUUsage(),
      this.getMemoryUsage(),
    ]);

    return {
      timestamp: new Date(),
      rps,
      p95Latency: latency,
      errorRate: errors,
      activePods: pods,
      cpuUsage: cpu,
      memoryUsage: memory,
    };
  }

  private async getRPS(): Promise<number> {
    const { stdout } = await execAsync(
      'kubectl exec -n monitoring prometheus-0 -- promtool query instant "rate(http_requests_total[1m])"'
    );
    return parseFloat(stdout) || 0;
  }

  private async getP95Latency(): Promise<number> {
    const { stdout } = await execAsync(
      'kubectl exec -n monitoring prometheus-0 -- promtool query instant "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))"'
    );
    return parseFloat(stdout) * 1000 || 0; // Convert to ms
  }

  private async getErrorRate(): Promise<number> {
    const { stdout } = await execAsync(
      'kubectl exec -n monitoring prometheus-0 -- promtool query instant "rate(http_request_errors_total[1m]) / rate(http_requests_total[1m])"'
    );
    return parseFloat(stdout) * 100 || 0; // Convert to percentage
  }

  private async getActivePods(): Promise<number> {
    const { stdout } = await execAsync(
      'kubectl get pods -n ecommerce-prod --field-selector=status.phase=Running --no-headers | wc -l'
    );
    return parseInt(stdout.trim()) || 0;
  }

  private async getCPUUsage(): Promise<number> {
    const { stdout } = await execAsync(
      'kubectl top pods -n ecommerce-prod --no-headers | awk \'{sum+=$2} END {print sum}\''
    );
    return parseFloat(stdout) || 0;
  }

  private async getMemoryUsage(): Promise<number> {
    const { stdout } = await execAsync(
      'kubectl top pods -n ecommerce-prod --no-headers | awk \'{sum+=$3} END {print sum}\''
    );
    return parseFloat(stdout) || 0;
  }

  private displayMetrics(metrics: Metrics): void {
    console.clear();
    console.log('='.repeat(80));
    console.log('LOAD TEST MONITORING DASHBOARD');
    console.log('='.repeat(80));
    console.log(`Time: ${metrics.timestamp.toLocaleTimeString()}`);
    console.log('');
    console.log(`RPS:              ${metrics.rps.toFixed(0).padStart(10)} req/sec`);
    console.log(`P95 Latency:      ${metrics.p95Latency.toFixed(2).padStart(10)} ms`);
    console.log(`Error Rate:       ${metrics.errorRate.toFixed(2).padStart(10)} %`);
    console.log(`Active Pods:      ${metrics.activePods.toString().padStart(10)}`);
    console.log(`CPU Usage:        ${metrics.cpuUsage.toFixed(0).padStart(10)} m`);
    console.log(`Memory Usage:     ${metrics.memoryUsage.toFixed(0).padStart(10)} Mi`);
    console.log('='.repeat(80));
  }

  private checkThresholds(metrics: Metrics): void {
    const warnings: string[] = [];

    if (metrics.p95Latency > 200) {
      warnings.push(`⚠️  P95 latency (${metrics.p95Latency.toFixed(0)}ms) exceeds 200ms threshold`);
    }

    if (metrics.errorRate > 0.1) {
      warnings.push(`⚠️  Error rate (${metrics.errorRate.toFixed(2)}%) exceeds 0.1% threshold`);
    }

    if (metrics.cpuUsage > 80) {
      warnings.push(`⚠️  CPU usage (${metrics.cpuUsage.toFixed(0)}%) exceeds 80% threshold`);
    }

    if (warnings.length > 0) {
      console.log('\nWARNINGS:');
      warnings.forEach(w => console.log(w));
    }
  }

  private generateReport(): void {
    console.log('\n\n=== LOAD TEST SUMMARY ===\n');
    
    const avgRPS = this.metrics.reduce((sum, m) => sum + m.rps, 0) / this.metrics.length;
    const avgLatency = this.metrics.reduce((sum, m) => sum + m.p95Latency, 0) / this.metrics.length;
    const avgErrorRate = this.metrics.reduce((sum, m) => sum + m.errorRate, 0) / this.metrics.length;
    const maxRPS = Math.max(...this.metrics.map(m => m.rps));
    const maxLatency = Math.max(...this.metrics.map(m => m.p95Latency));

    console.log(`Average RPS:        ${avgRPS.toFixed(0)}`);
    console.log(`Peak RPS:           ${maxRPS.toFixed(0)}`);
    console.log(`Average P95 Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Peak P95 Latency:    ${maxLatency.toFixed(2)}ms`);
    console.log(`Average Error Rate:  ${avgErrorRate.toFixed(3)}%`);
    console.log(`\nTotal data points:   ${this.metrics.length}`);
  }
}
```

---

## Testing

**Run complete load test suite:**

```bash
# 1. Run production simulation
artillery run load-tests/production-simulation.yml \
  --output results/production-$(date +%Y%m%d).json

# 2. Generate HTML report
artillery report results/production-$(date +%Y%m%d).json \
  --output results/production-$(date +%Y%m%d).html

# 3. Run stress test
artillery run load-tests/stress-test.yml \
  --output results/stress-$(date +%Y%m%d).json

# 4. Run database load tests
npm run test:load:database

# 5. Generate capacity planning report
node scripts/capacity-planning/calculator.js
```

---

## Deliverables

- [ ] Load test scenarios created (production + stress)
- [ ] 10M users simulation passed
- [ ] 100K RPS achieved
- [ ] Stress test completed (find breaking point)
- [ ] Database load tests passed
- [ ] Bottlenecks identified and documented
- [ ] Capacity planning calculations complete
- [ ] Performance benchmarks documented
- [ ] Cost analysis completed
- [ ] Monitoring during tests
- [ ] Comprehensive test reports
- [ ] Recommendations documented

---

## Performance Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Concurrent Users | 10M | ___ | ___ |
| RPS (Sustained) | 100K | ___ | ___ |
| P50 Latency | < 100ms | ___ | ___ |
| P95 Latency | < 200ms | ___ | ___ |
| P99 Latency | < 500ms | ___ | ___ |
| Error Rate | < 0.1% | ___ | ___ |
| CPU Utilization | 60-70% | ___ | ___ |
| Memory Utilization | 70-80% | ___ | ___ |
| Database Query (P95) | < 50ms | ___ | ___ |
| Cache Hit Rate | > 80% | ___ | ___ |

---

## Capacity Planning Summary

**Example Output:**

```
Current State: 10K RPS with 5 pods
Target State: 100K RPS

Required Resources:
- Pods: 50 (base) → 65 (with 30% buffer)
- CPU: 32.5 cores
- Memory: 65 GB
- Estimated Monthly Cost: $2,847

Recommendations:
1. Use c5.xlarge instances (4 vCPU, 8 GB)
2. Consider reserved instances for 40% cost savings
3. Implement HPA for automatic scaling
4. Monitor and adjust based on actual usage
```

---

## Next Steps

After completing this task:
1. Proceed to **Task 10: Production Readiness**
2. Implement recommended optimizations
3. Schedule regular load testing (monthly)
4. Monitor production metrics and adjust capacity

---

**Task Owner:** QA + DevOps + Performance Team  
**Reviewer:** Tech Lead + Architect  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
