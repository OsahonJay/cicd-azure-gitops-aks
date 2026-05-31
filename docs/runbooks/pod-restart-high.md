# Runbook: Pod Restart Count High (CrashLoopBackOff)

**Alert:** `alert-pod-restart-high`
**Severity:** P2
**SLO impact:** Possible — if all replicas are restarting, availability SLO is at risk
**Escalation:** If all replicas of a service are unavailable for > 5 minutes, escalate to P1

---

## What This Alert Means

A pod in the `microservices` namespace restarted more than 3 times in 5 minutes. This is the signature of `CrashLoopBackOff` — the container starts, crashes, and Kubernetes retries with exponential backoff.

The most likely cause is an application error that prevents startup. This is distinct from a pod that crashes occasionally during operation — this alert fires when the pod cannot stay running at all.

---

## Step 1 — Identify the Failing Pod

```bash
kubectl get pods -n microservices
```

Look for any pod with `CrashLoopBackOff` or `Error` in the STATUS column, or a RESTARTS count above 3.

```bash
# Which pod restarted most recently?
kubectl get pods -n microservices --sort-by='.status.containerStatuses[0].restartCount'
```

---

## Step 2 — Read the Last Crash Logs

```bash
# Replace python-app-xxxxx-yyyyy with the actual pod name from Step 1
kubectl logs -n microservices python-app-xxxxx-yyyyy --previous
```

The `--previous` flag reads the logs from the crashed container — not the current one trying to start. This is where the error will be.

Common error patterns:

| Log output | Likely cause |
|-----------|-------------|
| `ModuleNotFoundError` / `ImportError` | Bad container image — code defect or missing dependency |
| `Connection refused` / `ECONNREFUSED` | Dependency the app tries to connect to on startup is unavailable |
| `Permission denied` | File system or secrets issue |
| `OOMKilled` | Memory limit too low — the container was killed before it could log anything |
| No logs at all | Container exits before writing logs — check `kubectl describe` |

---

## Step 3 — Inspect Pod Events

```bash
kubectl describe pod -n microservices python-app-xxxxx-yyyyy
```

Scroll to the **Events** section at the bottom. Key events to look for:

- `OOMKilled` → memory limit is too low (see remediation 3)
- `ImagePullBackOff` / `ErrImagePull` → image does not exist or ACR credentials are stale (see remediation 4)
- `Liveness probe failed` → app is starting but not passing its health check within the timeout

---

## Step 4 — Check If This Is a New Deployment

```bash
kubectl rollout history deployment/python-app -n microservices
```

If the crash started after a recent deployment, roll back immediately:

```bash
kubectl rollout undo deployment/python-app -n microservices
kubectl rollout status deployment/python-app -n microservices
```

Verify the app recovers:

```bash
kubectl get pods -n microservices -w
```

---

## Remediations by Root Cause

### 1. Application crash (code defect in new image)

Roll back as shown in Step 4. Open an incident in the CI/CD pipeline — the Trivy or SAST gate may not have caught this class of runtime error.

### 2. Missing environment variable or secret

```bash
kubectl get secret api-key-secret -n microservices -o yaml
```

If the secret is missing, create it:

```bash
kubectl create secret generic api-key-secret \
  --from-literal=api-key="$(az keyvault secret show --vault-name kv-gitops-project --name api-key --query value -o tsv)" \
  --from-literal=allowed-origin="$(az keyvault secret show --vault-name kv-gitops-project --name allowed-origin --query value -o tsv)" \
  -n microservices
```

### 3. OOMKilled — memory limit too low

```bash
kubectl top pod -n microservices
```

If the pod is consistently using near its limit:

```bash
kubectl set resources deployment/python-app -n microservices \
  --limits=memory=256Mi --requests=memory=128Mi
```

Then raise the value in `k8s/deployments/python-app-deployment.yaml` and commit so ArgoCD does not revert the change.

### 4. ImagePullBackOff — stale ACR credentials

```bash
az aks update \
  --resource-group rg-gitops-project \
  --name aks-gitops-project \
  --attach-acr acrgitopsproject
```

---

## Post-Resolution Verification

```bash
kubectl get pods -n microservices
# All pods: Running, RESTARTS count is stable
curl https://<INGRESS_IP>/api/students/health
# Expected: {"status": "healthy"}
```

Check the error budget in Grafana — if the pod was down > 2 minutes, update `docs/slo.md` with the budget consumed.

---

## Related Runbooks

- `node-memory-high.md` — if OOMKilled is the cause
- `argocd-out-of-sync.md` — if rollback does not take effect
