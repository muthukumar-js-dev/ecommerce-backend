# On-Call Rotation Guide

## Overview

Guide for on-call engineers covering responsibilities, escalation procedures, and common tasks.

## On-Call Schedule

### Rotation
- **Duration:** 1 week (Monday 9 AM to Monday 9 AM)
- **Primary:** Handles all incidents
- **Secondary:** Backup for primary
- **Handoff:** Monday 9 AM via Slack

### Responsibilities

**Primary On-Call:**
- Respond to PagerDuty alerts (15 min SLA)
- Monitor system health
- Perform deployments
- Update status page
- Document incidents

**Secondary On-Call:**
- Backup for primary
- Assist with complex incidents
- Review incident reports

## Alert Response

### Alert Priorities

**P1 - Critical (15 min response)**
- Complete service outage
- Data loss
- Security breach

**P2 - High (1 hour response)**
- Major feature down
- High error rate (>5%)
- Performance degradation

**P3 - Medium (4 hours response)**
- Minor feature issue
- Moderate error rate (1-5%)

**P4 - Low (24 hours response)**
- Cosmetic issues
- Non-critical warnings

### Response Procedure

1. **Acknowledge Alert (0-5 min)**
   ```bash
   # Acknowledge in PagerDuty
   # Post in #incidents channel
   ```

2. **Assess Severity (5-10 min)**
   ```bash
   # Check dashboards
   # Review recent changes
   # Determine impact
   ```

3. **Create Incident (10-15 min)**
   ```bash
   # Create incident channel: #incident-YYYY-MM-DD
   # Update status page
   # Notify stakeholders if P1/P2
   ```

4. **Investigate & Mitigate (ongoing)**
   ```bash
   # Follow runbooks
   # Implement fixes
   # Monitor effectiveness
   ```

5. **Resolve & Document (post-incident)**
   ```bash
   # Update status page
   # Write incident report
   # Schedule postmortem
   ```

## Common Alerts

### High Error Rate

**Alert:** `error_rate > 5%`

**Runbook:**
1. Check recent deployments
2. Review error logs
3. Rollback if deployment-related
4. Scale if load-related
5. Check dependencies

### High Response Time

**Alert:** `p95_response_time > 500ms`

**Runbook:**
1. Check database query time
2. Check cache hit rate
3. Check CPU/memory usage
4. Scale if needed
5. Optimize slow queries

### Pod Crashes

**Alert:** `pod_crash_rate > 0`

**Runbook:**
1. Check pod logs
2. Check resource limits
3. Check recent changes
4. Increase resources if OOMKilled
5. Fix configuration issues

### Database Connection Errors

**Alert:** `db_connection_errors > 10`

**Runbook:**
1. Check MongoDB status
2. Check connection pool
3. Restart mongos if needed
4. Scale mongos routers
5. Check network policies

## Escalation Path

### Level 1: On-Call Engineer
- Handles all initial alerts
- Follows runbooks
- Resolves common issues

### Level 2: Engineering Lead
- Escalate if not resolved in 30 min (P1)
- Escalate if not resolved in 2 hours (P2)
- Complex technical issues

### Level 3: CTO
- Escalate if P1 not resolved in 1 hour
- Major business impact
- Executive decision needed

### Level 4: CEO
- Escalate if major business impact
- Public relations needed
- Legal implications

## Tools & Access

### Required Access
- AWS Console (read/write)
- Kubernetes cluster (admin)
- PagerDuty
- Slack
- GitHub
- Datadog/Grafana
- Status page admin

### Essential Tools
```bash
# Install required tools
brew install kubectl
brew install aws-cli
brew install helm
npm install -g artillery
```

### Quick Links
- Grafana: https://grafana.yourdomain.com
- Prometheus: https://prometheus.yourdomain.com
- Status Page: https://status.yourdomain.com
- PagerDuty: https://yourdomain.pagerduty.com
- Runbooks: https://docs.yourdomain.com/runbooks

## Handoff Procedure

### Outgoing On-Call

**Monday 9 AM:**
1. Post handoff message in #oncall
2. Share incident summary
3. Highlight ongoing issues
4. Transfer PagerDuty schedule
5. Update on-call calendar

**Template:**
```
🔄 On-Call Handoff - Week of [DATE]

Incidents This Week:
- [P1] Database outage - Resolved in 45 min
- [P2] High error rate - Resolved in 2 hours

Ongoing Issues:
- None

Notes:
- Deployment scheduled for Tuesday
- Certificate renewal due Friday

@next-oncall you're up! 🚀
```

### Incoming On-Call

**Checklist:**
- [ ] Read handoff message
- [ ] Review open incidents
- [ ] Check PagerDuty schedule
- [ ] Test alert notifications
- [ ] Review recent changes
- [ ] Check upcoming maintenance

## Best Practices

1. **Respond Quickly** - Acknowledge within SLA
2. **Communicate Clearly** - Update stakeholders
3. **Document Everything** - Incident reports
4. **Follow Runbooks** - Don't improvise
5. **Escalate Early** - Don't wait too long
6. **Update Status Page** - Keep customers informed
7. **Learn from Incidents** - Postmortems
8. **Stay Calm** - Think clearly
9. **Ask for Help** - Use secondary on-call
10. **Take Breaks** - Don't burn out

## Incident Report Template

```markdown
# Incident Report: [Title]

**Date:** [Date]
**Severity:** [P1/P2/P3/P4]
**Duration:** [Start - End]
**Impact:** [Description]

## Summary
[Brief overview]

## Timeline
- [Time] - [Event]
- [Time] - [Action taken]

## Root Cause
[Detailed explanation]

## Resolution
[How it was fixed]

## Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

## Lessons Learned
[What we learned]
```

## Postmortem Schedule

**Within 48 hours of P1/P2 incidents:**
1. Schedule postmortem meeting
2. Invite all participants
3. Review timeline
4. Identify root cause
5. Create action items
6. Share learnings

## Compensation

- **Weekday On-Call:** $200/week
- **Weekend On-Call:** $300/week
- **Incident Response:** $50/hour (after hours)
- **Time Off:** 1 day off after week on-call

## Support

- **Questions:** #oncall-support channel
- **Emergency:** Call engineering lead
- **Mental Health:** Employee assistance program
