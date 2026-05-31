# Incident Post-Mortem Template

Copy this file. Rename to `postmortem-YYYY-MM-DD-<short-title>.md`. Fill every section.
A post-mortem is not about blame. It is organisational memory. An incident not documented will repeat.

---

## Incident Summary

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-MM-DD-NNN |
| **Date and time (UTC)** | YYYY-MM-DD HH:MM |
| **Duration** | ___ hours ___ minutes |
| **Severity** | P1 (total outage) / P2 (degraded) / P3 (partial) |
| **Services affected** | python-app / nodejs-app / dotnet-app / all |
| **On-call engineer** | Name |
| **Incident commander** | Name |
| **Post-mortem author** | Name |
| **Review date** | Within 48 hours of resolution |

---

## Impact

**What did users experience?**
_Describe the user-visible impact in plain language. How many users? What could they not do?_

**SLO impact:**
- Availability: ___ minutes of downtime consumed against the 43.8-minute monthly budget
- Error rate: Peak error rate during incident: ___% (SLO: < 1%)
- Latency: Peak p99 during incident: ___ms (SLO: < 500ms)

**Error budget remaining after incident:** ___ minutes of the 43.8-minute monthly budget

---

## Timeline

All times in UTC. Be precise — vague timelines make root causes harder to find.

| Time (UTC) | Event |
|------------|-------|
| HH:MM | First alert fired: `<alert name>` |
| HH:MM | On-call engineer acknowledged |
| HH:MM | Initial investigation began |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Services restored to normal operation |
| HH:MM | All-clear confirmed |

**Detection time** (alert fire → engineer acknowledged): ___ minutes
**Time to mitigate** (alert fire → services restored): ___ minutes

---

## Root Cause

_One paragraph. Be specific. "Increased traffic" is not a root cause. "A missing rate limit caused the in-memory data store to be exhausted, causing the Flask worker to run out of threads and return 503s" is a root cause._

### Contributing Factors

- _Factor 1_
- _Factor 2_

### What Made This Harder to Detect or Fix?

- _E.g. No runbook for this alert; engineer had to investigate from scratch_
- _E.g. Log query was slow because of Log Analytics ingestion lag_

---

## Resolution

**What was done to restore service?**
_Step-by-step. These become the runbook if one does not exist._

```bash
# Paste the exact commands that resolved the incident
```

**Was this a mitigation or a fix?**
- [ ] Mitigation (root cause still present — temporary fix only)
- [ ] Fix (root cause resolved)

---

## What Went Well

_Things that helped — even small things. These reinforce good practice._

- _E.g. The ArgoCD alert fired 3 minutes before users noticed_
- _E.g. Rollback took < 2 minutes because ArgoCD history was clean_

---

## What Went Wrong

_Not who — what. System failures, process gaps, tooling failures._

- _E.g. The runbook for this alert did not exist_
- _E.g. The on-call engineer could not find the relevant dashboard_
- _E.g. The alert threshold was too sensitive — fired 12 times before being actionable_

---

## Action Items

Each action item must have an owner and a due date. An action item without an owner will not be completed.

| # | Action | Owner | Due date | Status |
|---|--------|-------|----------|--------|
| 1 | Write runbook for `<alert name>` | Name | YYYY-MM-DD | Open |
| 2 | Lower alert threshold from X to Y | Name | YYYY-MM-DD | Open |
| 3 | Add dashboard panel for `<metric>` | Name | YYYY-MM-DD | Open |

---

## Lessons Learned

_What should every engineer on this team know that they did not know before this incident?_

---

## Related Documents

- Runbook: `docs/runbooks/<relevant-runbook>.md`
- Alert that fired: `monitoring/setup-alerts.sh`
- SLO impact: `docs/slo.md`
