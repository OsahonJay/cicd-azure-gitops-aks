# Runbook: Node Memory High / OOMKill Risk

**Alert:** `alert-node-memory-high`
**Severity:** P2 (becomes P1 if pods begin OOMKilling)
**SLO impact:** OOMKilled pods reduce availability while Kubernetes restarts them
**Escalation:** If any pod enters `OOMKilled` state, escalate to P1 immediately

---

## What This Alert Means

One or more AKS nodes have memory usage above 85% of their working set capacity. The next step after this threshold is an OOMKill event — the Linux OOM killer terminates the process using the most memory, with no graceful shutdown, no log flush, and no response to in-flight requests.

The Standard_D2ps_v6 node has 4 GB RAM. At 85% that is 3.4 GB in use, leaving 600 MB before the OOM killer activates.

---

## Step 1 — Assess Severity

```bash
kubectl top nodes
```

If any node is > 95% memory, an OOMKill is imminent. Move immediately to Step 3.

```bash
kubectl top pods -n microservices --sort-by=memory
```

Identify the pod consuming the most memory.

---

## Step 2 — Check for Existing OOMKills

```bash
kubectl get pods -n microservices
```

Look for pods with `OOMKilled` in the status, or a RESTARTS count that increased since the last check.

```bash
kubectl describe pod -n microservices <POD_NAME>
```

In the Events section, look for: `OOMKilled`. In the container state, look for `Reason: OOMKilled`.

---

## Step 3 — Immediate Mitigation

### If memory is growing over time (likely leak):

Restart the highest-memory pod to release the leak:

```bash
kubectl rollout restart deployment/python-app -n microservices
```

This restores available memory on the node immediately. The leak will return if it is in the code.

### If a deployment just happened:

```bash
kubectl rollout undo deployment/python-app -n microservices
```

### If the cluster is genuinely undersized (all nodes > 85%):

```bash
az aks nodepool scale \
  --resource-group rg-gitops-project \
  --cluster-name aks-gitops-project \
  --name system \
  --node-count 4
```

---

## Step 4 — Identify Root Cause

**Is the memory growth in the application itself (leak) or the node (too many pods)?**

```bash
kubectl get pods -A --field-selector=spec.nodeName=<HIGH-MEMORY-NODE-NAME>
```

Count how many pods are on the high-memory node. If Kubernetes packed too many pods onto one node and the others are underutilised, consider adding a node or reviewing Pod Disruption Budgets.

**Is the Prometheus stack consuming excess memory?**

```bash
kubectl top pods -n monitoring --sort-by=memory
```

Prometheus stores metrics in memory. If retention is set too high or there are too many metrics being scraped, Prometheus itself can consume gigabytes. Check `k8s/monitoring/helm-values.yaml` — `retention: 12h` is already set conservatively.

---

## Step 5 — Raise Memory Limits If Load Is Legitimate

If the application genuinely needs more memory (new features, more data), update the deployment:

```bash
kubectl set resources deployment/python-app -n microservices \
  --limits=memory=256Mi --requests=memory=128Mi
```

Then commit the new values to `k8s/deployments/python-app-deployment.yaml`.

---

## Post-Resolution Verification

```bash
kubectl top nodes
# All nodes: Memory < 75%

kubectl get pods -n microservices
# No pods in OOMKilled or CrashLoopBackOff state
```

If an OOMKill occurred, calculate the downtime against the availability SLO in `docs/slo.md`.

---

## Related Runbooks

- `pod-restart-high.md` — if OOMKills are causing CrashLoopBackOff
- `container-resource-limit.md` — if a specific container is hitting its memory limit
