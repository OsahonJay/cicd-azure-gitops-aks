# Service Level Objectives

**System:** CI/CD Pipeline with Azure DevOps, GitOps, and AKS
**Last reviewed:** 2026-05-31
**Owner:** 

---

## Why This Document Exists

An SLO is a promise to users. An error budget is what happens when that promise is broken repeatedly. Without SLOs, there is no objective basis for deciding whether a new feature is more important than a reliability fix. This document defines both before the first deployment.

---

## Service Level Indicators and Objectives

| SLI | Target (SLO) | Measurement Method | Window |
|-----|-------------|-------------------|--------|
| **Availability** — health endpoint returns 2xx | 99.9% | `sum(rate(http_requests_total{status=~"2.."}[5m])) / sum(rate(http_requests_total[5m]))` | 30-day rolling |
| **Latency p99** — end-to-end response time | < 500ms | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` | 5-minute rolling |
| **Error rate** — non-4xx errors as % of total | < 1% | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` | 5-minute rolling |
| **Deployment freshness** — time from git push to healthy pods | < 5 minutes | ArgoCD sync timestamp vs git commit timestamp | Per deployment |
| **Pipeline success rate** — CI/CD runs that complete without failure | ≥ 95% | Failed pipeline runs / total runs | 7-day rolling |

> **Latency note:** 500ms p99 reflects the ARM64 compute tier (Standard_D2ps_v6, 2 vCPU) and in-memory data store. Targets for a production system with a real database would be tighter.

---

## Error Budget Calculation

| SLO | Allowed failure rate | Monthly error budget (30 days) | Weekly budget |
|-----|---------------------|-------------------------------|---------------|
| 99.9% availability | 0.1% | **43.8 minutes downtime** | 10.1 minutes |
| < 1% error rate | 1% of requests | 1 in every 100 requests | — |
| < 500ms p99 latency | 1% of requests may exceed 500ms | — | — |

### Error Budget Policy

When the 30-day availability error budget reaches **50% consumed** (21.9 minutes):
- Engineering lead is notified.
- New feature work is paused until the budget recovers above 75%.

When the budget reaches **100% consumed** (43.8 minutes):
- Feature freeze. All engineering effort moves to reliability.
- A post-mortem is required within 48 hours regardless of whether a specific incident caused the exhaustion.
- No new deployments to production until the root cause is identified and a fix is in place.

This policy is not a suggestion. It exists to prevent the team from trading reliability for features until users lose trust.

---

## Measurement and Alerting

### Prometheus Queries (Grafana Dashboards)

**Availability (30-day rolling):**
```promql
sum_over_time(
  (sum(rate(http_requests_total{namespace="microservices",status=~"2.."}[5m])) /
   sum(rate(http_requests_total{namespace="microservices"}[5m])))[30d:5m]
) / count_over_time(vector(1)[30d:5m])
```

**p99 latency:**
```promql
histogram_quantile(0.99,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{namespace="microservices"}[5m])
  )
)
```

**5xx error rate:**
```promql
sum(rate(http_requests_total{namespace="microservices",status=~"5.."}[5m])) /
sum(rate(http_requests_total{namespace="microservices"}[5m]))
```

### Alert Thresholds (Fire Before SLO Is Breached)

Alerts fire at a tighter threshold than the SLO to give the on-call engineer time to respond before the budget is consumed.

| SLO | Alert threshold | Alert latency |
|-----|----------------|--------------|
| 99.9% availability | < 99.5% over 5 minutes | 1 minute |
| < 500ms p99 | > 400ms p99 over 5 minutes | 1 minute |
| < 1% error rate | > 0.5% over 5 minutes | 1 minute |

---

## Services in Scope

| Service | Port | Health Endpoint | Owner |
|---------|------|----------------|-------|
| python-app (student-service) | 5000 | `/health` | Group 2 |
| nodejs-app (course-service) | 3000 | `/health` | Group 2 |
| dotnet-app (reporting-service) | 8080 | `/health` | Group 2 |

---

## Out of Scope

- The CI/CD pipeline itself (Azure DevOps SLA: 99.9% — Microsoft's responsibility)
- ArgoCD internal health (monitored separately via `alert-argocd-out-of-sync`)
- Azure infrastructure (AKS SLA: 99.95% for zones, 99.9% for single region)

---

## Review Cadence

| Trigger | Action |
|---------|--------|
| Monthly | Review prior month's error budget consumption |
| After any SLO breach | Post-mortem required — see docs/incident-postmortem-template.md |
| Architecture change | SLO targets re-evaluated before deployment |
| Traffic grows > 5x | Re-baseline latency targets with new load profile |
