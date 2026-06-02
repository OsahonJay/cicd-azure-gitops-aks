# Runbook: ArgoCD Out of Sync

**Alert:** `alert-argocd-out-of-sync`
**Severity:** P2
**SLO impact:** Deployment freshness SLO (< 5 min from push to healthy pods) is breached
**Escalation:** If the cluster is running a version > 30 minutes behind Git, escalate — the CD pipeline may have deployed to Git but not to the cluster

---

## What This Alert Means

ArgoCD has detected a difference between what is in the GitHub repository (`k8s/` directory) and what is running in the cluster, and has not successfully reconciled that difference in over 10 minutes.

This alert does NOT mean services are down — existing pods continue running. It means the cluster is running a stale version. If the last CD pipeline run deployed a new image tag, that new version is NOT running yet.

Two common causes:
1. ArgoCD itself is unhealthy (pod crashed, lost GitHub connectivity)
2. A sync failed due to a manifest error, resource conflict, or webhook timeout

---

## Step 1 — Check ArgoCD Status

```bash
ARGOCD_IP=$(kubectl get svc argocd-server -n argocd \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

argocd login $ARGOCD_IP \
  --username admin \
  --password "$(az keyvault secret show --vault-name kv-gitops-project --name argocd-admin-password --query value -o tsv)" \
  --grpc-web \
  --insecure

argocd app get microservices-app --grpc-web --insecure --insecure
```

Look at:
- **Health Status** — Healthy / Degraded / Missing
- **Sync Status** — Synced / OutOfSync
- **Last Sync Result** — succeeded or error message

---

## Step 2 — Check If ArgoCD Pods Are Healthy

```bash
kubectl get pods -n argocd
```

All pods should be Running. If any show CrashLoopBackOff or Error:

```bash
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout restart deployment/argocd-application-controller -n argocd
kubectl rollout restart deployment/argocd-repo-server -n argocd
kubectl wait --for=condition=ready pod --all -n argocd --timeout=120s
```

---

## Step 3 — Manually Trigger a Sync

If ArgoCD is healthy but hasn't synced:

```bash
argocd app sync microservices-app --force --prune --grpc-web --insecure
```

Watch for sync errors in the output. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Namespace "microservices" not found` | Namespace not yet created | `kubectl apply -f k8s/namespaces/` |
| `Invalid value: "": must be no more than 63 characters` | Label or name too long in a manifest | Fix the manifest, commit, re-sync |
| `cannot patch "X": Forbidden` | RBAC prevents ArgoCD from updating the resource | Check `argocd/project.yaml` `namespaceResourceWhitelist` |
| `context deadline exceeded` | GitHub unreachable | Wait and retry; check GitHub status at https://www.githubstatus.com |

---

## Step 4 — Check GitHub Repository Connectivity

```bash
argocd repo list --grpc-web --insecure
```

The status should show `Successful`. If it shows an error, the GitHub PAT may have expired:

```bash
GITHUB_PAT=$(az keyvault secret show \
  --vault-name kv-gitops-project \
  --name github-pat --query value -o tsv)

kubectl create secret generic github-repo-creds \
  --from-literal=type=git \
  --from-literal=url=https://github.com/Ayooluwabami/cicd-azure-gitops-aks.git \
  --from-literal=username=git \
  --from-literal=password="$GITHUB_PAT" \
  -n argocd \
  --dry-run=client -o yaml | kubectl apply -f -
```

Then re-trigger a sync (Step 3).

---

## Step 5 — Verify the CD Pipeline Ran Successfully

If ArgoCD is syncing correctly but the cluster is still running the old version, check whether the CD pipeline actually updated the manifest:

```bash
cat k8s/deployments/python-app-deployment.yaml | grep image:
```

Compare the image tag with the latest build in Azure DevOps. If the manifest still has an old tag, the CD pipeline failed silently — check the pipeline run logs.

---

## Post-Resolution Verification

```bash
argocd app get microservices-app --grpc-web --insecure
# Health Status: Healthy
# Sync Status: Synced

kubectl get pods -n microservices
# All pods Running with the expected image tag

kubectl get deployment python-app -n microservices -o jsonpath='{.spec.template.spec.containers[0].image}'
# Should match the latest build tag in ACR
```

---

## Related Runbooks

- `pod-restart-high.md` — if the sync succeeded but pods are crashing with the new image
- `pipeline-failure.md` — if the CD pipeline did not write the new manifest
