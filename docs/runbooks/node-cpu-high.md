# Runbook: Node CPU High

**Alert:** `alert-node-cpu-high`
**Severity:** P2
**SLO impact:** Pods are throttled when CPU hits 100% of limit — latency SLO at risk
**Escalation:** If p99 latency exceeds 500ms for > 5 minutes, escalate to P1

---

## What This Alert Means

One or more AKS nodes have sustained CPU usage above 80% for 5 minutes. At 80%, pods approach their CPU limit ceiling. When a pod hits its CPU limit, the container runtime throttles it — requests queue up, latency increases, and the service degrades. This alert fires before throttling occurs, giving a remediation window.

This is different from a brief spike. Sustained high CPU indicates a genuine resource pressure problem.

---

## Step 1 — Identify Which Node and Pod Is Responsible

```bash
kubectl top nodes
```

Note which node has the highest CPU usage.

```bash
kubectl top pods -n microservices --sort-by=cpu
```

Identify which pod is consuming the most CPU. If it is disproportionately high, it is likely the source.

---

## Step 2 — Check If This Is a Traffic Spike or a Leak

Look at the Grafana dashboard: **CPU usage over time** for the affected pod.

- **Gradual increase over hours → memory or CPU leak in the application.** The pod needs to be restarted and the defect investigated.
- **Sudden spike correlated with a deployment → the new version has a performance regression.** Roll back.
- **Spike correlated with an external event (scheduled job, demo traffic) → expected, may not need action.** Monitor.

Check the CPU throttle rate:

```bash
kubectl top pod -n microservices --containers
```

---

## Step 3 — Immediate Mitigation Options

### Option A: Restart the throttled pod (if it is a runaway process)

```bash
kubectl rollout restart deployment/python-app -n microservices
```

This is a mitigation, not a fix — if the leak is in the code, it will recur.

### Option B: Roll back a recent deployment

```bash
kubectl rollout undo deployment/python-app -n microservices
```

### Option C: Temporarily increase CPU limit (buys time to investigate)

Do this only if the traffic load is legitimate and expected to be temporary.

```bash
kubectl set resources deployment/python-app -n microservices \
  --limits=cpu=500m --requests=cpu=100m
```

Commit the new value to `k8s/deployments/python-app-deployment.yaml` so ArgoCD does not revert it.

---

## Step 4 — If All Nodes Are High (Cluster-Level Pressure)

```bash
kubectl get nodes
kubectl describe node <NODE_NAME>
```

Look at the "Allocated resources" section. If total allocated CPU exceeds 80% of capacity across all nodes, the cluster is undersized for the current workload.

**Short-term:** Scale the node pool:

```bash
az aks nodepool scale \
  --resource-group rg-gitops-project \
  --cluster-name aks-gitops-project \
  --name system \
  --node-count 4
```

**Long-term:** Update `terraform/variables.tf` `node_count` and apply, or enable cluster autoscaler.

---

## Post-Resolution Verification

```bash
kubectl top nodes
# All nodes: CPU < 70%

kubectl top pods -n microservices
# No single pod consuming > 200m CPU
```

Check p99 latency in Grafana — confirm it returned below 500ms within 5 minutes of remediation.

---

## Related Runbooks

- `pod-restart-high.md` — if a specific pod is consuming all CPU and crashing
- `container-resource-limit.md` — if the pod is being throttled at its CPU limit
