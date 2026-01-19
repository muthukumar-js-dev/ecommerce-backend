# Chaos Engineering Guide

## Overview

This guide provides comprehensive documentation for chaos engineering practices using Chaos Mesh to proactively test system resilience and identify weaknesses through controlled failure injection.

---

## What is Chaos Engineering?

Chaos Engineering is the discipline of experimenting on a system to build confidence in the system's capability to withstand turbulent conditions in production.

### Principles

1. **Build a Hypothesis** - Define steady state and expected behavior
2. **Vary Real-World Events** - Inject realistic failures
3. **Run Experiments** - Execute in production or staging
4. **Automate** - Run continuously to catch regressions
5. **Minimize Blast Radius** - Start small, increase scope gradually

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Chaos Mesh                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Chaos        │  │ Chaos        │  │ Chaos        │  │
│  │ Controller   │  │ Daemon       │  │ Dashboard    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────┬────────────────┬────────────────┬──────────┘
             │                │                │
             ▼                ▼                ▼
    ┌────────────────┐┌────────────────┐┌────────────────┐
    │   Pod Chaos    ││ Network Chaos  ││ Stress Chaos   │
    │   - Kill       ││ - Delay        ││ - CPU          │
    │   - Failure    ││ - Partition    ││ - Memory       │
    └────────────────┘└────────────────┘└────────────────┘
             │                │                │
             └────────────────┴────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Target Pods     │
                    │  (ecommerce-prod)│
                    └──────────────────┘
```

---

## Installation

### Install Chaos Mesh

```bash
# Run installation script
npm run chaos:install

# Or manually:
bash scripts/chaos/install-chaos-mesh.sh
```

### Verify Installation

```bash
# Check pods
kubectl get pods -n chaos-testing

# Access dashboard
kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333
# Open: http://localhost:2333
```

---

## Chaos Experiments

### 1. Pod Chaos

**Purpose:** Test pod recovery and auto-healing

**Experiments:**
- **Pod Kill:** Terminates a pod to test recovery
- **Pod Failure:** Makes pods unavailable without killing them

**Usage:**
```bash
# Apply pod chaos
kubectl apply -f chaos-experiments/pod-chaos.yaml

# View status
kubectl get podchaos -n chaos-testing

# Delete experiment
kubectl delete -f chaos-experiments/pod-chaos.yaml
```

**Expected Behavior:**
- ✅ Pods should recover within 30 seconds
- ✅ Service should remain available (>99%)
- ✅ No data loss
- ✅ Auto-scaling should trigger if needed

### 2. Network Chaos

**Purpose:** Test network resilience and timeout handling

**Experiments:**
- **Network Delay:** Adds latency between services
- **Network Partition:** Simulates network split
- **Packet Loss:** Drops packets randomly

**Usage:**
```bash
# Apply network chaos
kubectl apply -f chaos-experiments/network-chaos.yaml

# Monitor latency
kubectl logs -n ecommerce-prod -l app=core-service --tail=50

# Delete experiment
kubectl delete -f chaos-experiments/network-chaos.yaml
```

**Expected Behavior:**
- ✅ Circuit breakers should activate
- ✅ Timeouts should be handled gracefully
- ✅ Error rate should stay <5%
- ✅ Retry mechanisms should work

### 3. Stress Chaos

**Purpose:** Test resource limits and auto-scaling

**Experiments:**
- **CPU Stress:** Increases CPU usage
- **Memory Stress:** Consumes memory
- **I/O Stress:** Stresses disk I/O

**Usage:**
```bash
# Apply stress chaos
kubectl apply -f chaos-experiments/stress-chaos.yaml

# Monitor resources
kubectl top pods -n ecommerce-prod

# Delete experiment
kubectl delete -f chaos-experiments/stress-chaos.yaml
```

**Expected Behavior:**
- ✅ Auto-scaling should trigger
- ✅ Resource limits should prevent OOM
- ✅ Performance degradation should be graceful
- ✅ System should recover after stress ends

---

## Automated Chaos Testing

### Run Chaos Test Suite

```bash
# Run all experiments
npm run chaos:test

# Output:
# 🔬 Running Chaos Experiment: Pod Kill
# 📊 Capturing baseline metrics...
# 💥 Applying chaos...
# ⏱️  Monitoring for 60s...
# 🔄 Waiting for system recovery...
# ✅ Experiment PASSED
```

### Chaos Runner Features

- **Baseline Capture:** Records metrics before chaos
- **Monitoring:** Tracks metrics during experiment
- **Validation:** Verifies system behavior
- **Recovery:** Waits for system to stabilize
- **Reporting:** Generates detailed reports

---

## Scheduled Chaos Testing

### Weekly Chaos Schedule

Chaos experiments run automatically every Monday at 2 AM.

**Schedule:**
```yaml
schedule: '0 2 * * 1'  # Every Monday at 2 AM
```

**Experiments:**
1. Pod Kill (5 min)
2. Recovery Wait (2 min)
3. Network Delay (10 min)
4. Recovery Wait (2 min)
5. CPU Stress (5 min)

**Deploy Schedule:**
```bash
kubectl apply -f chaos-experiments/chaos-schedule.yaml
```

**View Schedule:**
```bash
kubectl get schedule -n chaos-testing
```

---

## Best Practices

### Do's ✅

- **Start Small:** Begin with staging, then production
- **Define Hypothesis:** Know what you're testing
- **Monitor Everything:** Watch metrics during experiments
- **Automate:** Run chaos tests regularly
- **Document Results:** Keep track of findings
- **Communicate:** Inform team before running chaos
- **Limit Blast Radius:** Start with one pod, not all
- **Have Rollback Plan:** Be ready to stop experiments

### Don'ts ❌

- **Don't Run Without Monitoring:** Always watch metrics
- **Don't Skip Staging:** Test in staging first
- **Don't Ignore Failures:** Investigate all issues
- **Don't Run During Peak Hours:** Use off-peak times
- **Don't Forget to Cleanup:** Remove experiments after
- **Don't Run Multiple Experiments:** One at a time
- **Don't Disable Alerts:** Keep alerting active

---

## Experiment Procedures

### Before Running Experiments

1. ✅ Verify monitoring is working
2. ✅ Check alert channels (Slack, PagerDuty)
3. ✅ Inform team about chaos testing
4. ✅ Ensure backup/recovery procedures are ready
5. ✅ Review experiment configuration
6. ✅ Set up observation tools (Grafana, Kibana)

### During Experiments

1. 👀 Monitor dashboards continuously
2. 📊 Track key metrics (error rate, latency, availability)
3. 🚨 Watch for alerts
4. 📝 Document observations
5. 🛑 Be ready to stop experiment if needed

### After Experiments

1. 🧹 Cleanup chaos resources
2. 📊 Analyze results
3. 📝 Document findings
4. 🔧 Fix identified issues
5. 📢 Share learnings with team
6. 🔄 Update runbooks if needed

---

## Troubleshooting

### Issue: Experiment Not Starting

**Possible Causes:**
- Chaos Mesh not installed
- Incorrect namespace
- Invalid selector

**Solutions:**
```bash
# Check Chaos Mesh status
kubectl get pods -n chaos-testing

# Verify experiment YAML
kubectl apply -f chaos-experiments/pod-chaos.yaml --dry-run=client

# Check logs
kubectl logs -n chaos-testing -l app.kubernetes.io/component=controller-manager
```

### Issue: System Not Recovering

**Possible Causes:**
- Auto-healing not configured
- Resource limits too low
- Persistent failure

**Solutions:**
```bash
# Stop experiment immediately
kubectl delete podchaos,networkchaos,stresschaos --all -n chaos-testing

# Check pod status
kubectl get pods -n ecommerce-prod

# Restart deployments if needed
kubectl rollout restart deployment/core-service -n ecommerce-prod
```

### Issue: Metrics Not Available

**Possible Causes:**
- Prometheus not running
- Incorrect Prometheus URL
- Missing metrics

**Solutions:**
```bash
# Check Prometheus
kubectl get pods -n monitoring

# Test Prometheus query
curl "http://prometheus:9090/api/v1/query?query=up"

# Update PROMETHEUS_URL environment variable
export PROMETHEUS_URL=http://prometheus:9090
```

---

## Validation Criteria

### Pod Recovery
- ✅ Pods return to running state
- ✅ Pod count matches baseline
- ✅ Recovery time <5 minutes

### Service Availability
- ✅ Service remains reachable
- ✅ Request rate >0
- ✅ Availability >99%

### Error Rate
- ✅ Error rate <1% after recovery
- ✅ No cascading failures
- ✅ Circuit breakers activate

### Auto-Scaling
- ✅ HPA triggers when needed
- ✅ Pods scale up under stress
- ✅ Pods scale down after recovery

### Performance
- ✅ P95 latency <1s
- ✅ Graceful degradation
- ✅ No memory leaks

---

## Chaos Engineering Maturity

### Level 1: Manual Testing
- Run experiments manually
- Test in staging only
- Document results manually

### Level 2: Automated Testing
- Automated experiment execution
- Scheduled chaos tests
- Automated validation

### Level 3: Continuous Chaos
- Chaos in production
- Real-time validation
- Automated remediation

### Level 4: Chaos as a Service
- Self-service chaos platform
- Advanced failure scenarios
- ML-based anomaly detection

---

## Quick Reference

### Commands

```bash
# Install Chaos Mesh
npm run chaos:install

# Run chaos tests
npm run chaos:test

# Apply specific experiment
kubectl apply -f chaos-experiments/pod-chaos.yaml

# View all chaos experiments
kubectl get podchaos,networkchaos,stresschaos -A

# Delete all experiments
kubectl delete podchaos,networkchaos,stresschaos --all -n chaos-testing

# Access dashboard
kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333
```

### Files

- Installation: `scripts/chaos/install-chaos-mesh.sh`
- Chaos Runner: `scripts/chaos/chaos-runner.ts`
- Pod Chaos: `chaos-experiments/pod-chaos.yaml`
- Network Chaos: `chaos-experiments/network-chaos.yaml`
- Stress Chaos: `chaos-experiments/stress-chaos.yaml`
- Schedule: `chaos-experiments/chaos-schedule.yaml`

---

## Resources

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Netflix Chaos Engineering](https://netflixtechblog.com/tagged/chaos-engineering)

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
