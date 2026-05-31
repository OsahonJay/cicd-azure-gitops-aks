# Runbook: High Error Rate (5xx)

**Alert:** Grafana alert — error rate > 0.5% over 5 minutes
**Severity:** P1 if error rate > 5%; P2 if 0.5%–5%
**SLO impact:** Direct — error rate SLO is < 1%; any sustained 5xx breaches the SLO and consumes error budget
**Escalation:** If error rate exceeds 5% for > 3 minutes, escalate to P1 immediately

---

## What This Alert Means

More than 0.5% of requests to one or more microservices are returning 5xx responses. Users are receiving errors. This could be caused by an application bug in a new deployment, a dependency failure, a resource exhaustion event, or cluster-level problems.

Unlike a latency alert (service is slow), a 5xx alert means the service is actively failing requests.

---

## Step 1 — Identify Which Service Is Failing

```bash
kubectl get pods -n microservices
```

Look for pods with elevated restarts or unhealthy status.

Check the Grafana dashboard: **Error rate by service** — which of python-app, nodejs-app, dotnet-app is the source?

Read application logs directly:

```bash
kubectl logs -n microservices -l app=python-app --since=5m --tail=100
kubectl logs -n microservices -l app=nodejs-app --since=5m --tail=100
kubectl logs -n microservices -l app=dotnet-app --since=5m --tail=100
```

---

## Step 2 — Correlate With a Deployment

```bash
kubectl rollout history deployment/python-app -n microservices
```

If the error rate started at the same time as a recent deployment, roll back immediately:

```bash
kubectl rollout undo deployment/python-app -n microservices
kubectl rollout status deployment/python-app -n microservices
```

Do not wait. If the deployment caused the error rate increase, rolling back is the fastest path to recovery. You can investigate the code defect after service is restored.

---

## Step 3 — Check Application-Level Errors

For specific HTTP error analysis in Log Analytics:

```kql
ContainerLog
| where TimeGenerated > ago(10m)
| where Namespace == "microservices"
| where LogEntry contains "500" or LogEntry contains "ERROR" or LogEntry contains "Exception"
| project TimeGenerated, ContainerName, LogEntry
| order by TimeGenerated desc
| take 50
```

Common patterns:

| Log pattern | Likely cause |
|-------------|-------------|
| `KeyError` / `TypeError` / `NullReferenceException` | Application bug — rolled out in a new image |
| `Connection refused` to an internal service | A downstream service is down or misconfigured |
| `Secret not found` / `env var not set` | Missing Kubernetes secret |
| `500 Internal Server Error` with no stack trace | Application is catching and suppressing exceptions — need more verbose logging |

---

## Step 4 — Check If the API Key Secret Is Present

If the error started after a cluster rebuild or namespace recreation, the `api-key-secret` may be missing:

```bash
kubectl get secret api-key-secret -n microservices
```

If it is missing, create it from Key Vault:

```bash
kubectl create secret generic api-key-secret \
  --from-literal=api-key="$(az keyvault secret show --vault-name kv-gitops-project --name api-key --query value -o tsv)" \
  --from-literal=allowed-origin="$(az keyvault secret show --vault-name kv-gitops-project --name allowed-origin --query value -o tsv)" \
  -n microservices
kubectl rollout restart deployment/python-app deployment/nodejs-app deployment/dotnet-app -n microservices
```

---

## Step 5 — Check Resource Exhaustion

If no application bug is obvious, check whether the container has been throttled or OOMKilled (resource exhaustion can cause 5xx responses):

```bash
kubectl top pods -n microservices
kubectl describe pods -n microservices | grep -A5 "OOMKilled\|Limits\|Requests"
```

See `node-memory-high.md` or `node-cpu-high.md` if resource exhaustion is confirmed.

---

## Post-Resolution Verification

```bash
# Verify error rate has returned to normal
# In Grafana: Error rate panel should show < 0.5%

# Test each health endpoint
INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -sk https://$INGRESS_IP/api/students | head -c 100
curl -sk https://$INGRESS_IP/api/courses | head -c 100
curl -sk https://$INGRESS_IP/api/reports/summary | head -c 100
```

Update the SLO error budget in `docs/slo.md` with the duration and error rate of the incident.

---

## Related Runbooks

- `pod-restart-high.md` — if pods are crashing and causing 5xx
- `argocd-out-of-sync.md` — if rollback does not take effect
- `node-cpu-high.md` / `node-memory-high.md` — if resource exhaustion is the cause
