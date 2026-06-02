# Disaster Recovery Plan

**System:** CI/CD Pipeline with Azure DevOps, GitOps, and AKS
**Last updated:** 2026-05-25

---

## DR Metrics

| Metric | Value | Rationale |
|--------|-------|-----------|
| **RTO** (Recovery Time Objective) | 2 hours | Time to rebuild AKS cluster + reinstall ArgoCD + re-sync all apps from Git |
| **RPO** (Recovery Point Objective) | 0 minutes (zero data loss) | All services are stateless. No database. Git is the single source of truth and is hosted externally on GitHub — unaffected by an AKS failure |
| **Recovery region** | Same region (UK South) | Project scope: single-region. Cross-region DR is a residual risk (documented below) |
| **Backup verification** | N/A for application state | No persistent state to back up. Infrastructure recreated from IaC (az CLI commands in setup-guide.md). Config backed up in GitHub |
| **Failover runbook last tested** | Not tested — required before demo | Follow Section 4 of this document |
| **Security controls in DR** | Same as production | DR environment is rebuilt from the same repository; the same manifests, NetworkPolicies, RBAC, and securityContexts are applied automatically by ArgoCD |

> **Critical note on security in DR:** A DR environment with weaker controls than the original
> is not a recovery environment — it is a second attack surface. This plan does not permit
> skipping security manifests to "speed up recovery." ArgoCD applies all of them on sync.

---

## What Can Fail and What Happens

| Component | Failure Mode | Impact | Recovery Path |
|-----------|-------------|--------|---------------|
| AKS node (1 of 3) | Node becomes NotReady | Kubernetes reschedules pods to remaining nodes — automatic, no intervention | Wait for auto-recovery; if node does not recover in 10 min, cordon + drain |
| AKS cluster (all nodes) | Full cluster outage | All three services unreachable | Section 3 — Full cluster recovery |
| ArgoCD pod | CrashLoopBackOff | Automatic deployments paused; running pods unaffected | Section 2 — ArgoCD recovery |
| Azure DevOps pipeline | Pipeline fails to run | No new deployments; running version continues serving traffic | Fix pipeline YAML; re-trigger manually |
| ACR unavailable | Image pull fails on new deployments | Existing running pods continue; new pods or restarts will fail ImagePullBackOff | Existing pods keep running until next restart event; wait for ACR recovery |
| GitHub unavailable | ArgoCD cannot sync | No new deployments; running pods unaffected; ArgoCD shows OutOfSync | ArgoCD continues running last-known state; wait for GitHub recovery |
| Azure Key Vault unavailable | CD pipeline cannot fetch secrets | New deployments blocked; running pods unaffected | Wait for Key Vault recovery; Key Vault SLA is 99.9% |
| Azure subscription suspended | Everything fails | Total loss | Resolve billing; full cluster recovery from Section 3 |

---

## Section 1 — Single Node Recovery

A single node failure is handled automatically by Kubernetes (pods rescheduled). No manual intervention is needed unless the node does not recover within 10 minutes.

```bash
# Check node status
kubectl get nodes

# If one node is NotReady for > 10 minutes, cordon it (stop new pods going there)
kubectl cordon <NODE_NAME>

# Drain existing pods safely off the node
kubectl drain <NODE_NAME> --ignore-daemonsets --delete-emptydir-data

# Check if Azure automatically replaced the node (AKS heals node pools)
az aks nodepool show \
  --resource-group rg-gitops-project \
  --cluster-name aks-gitops-project \
  --nodepool-name system

# Once replaced node appears Ready, uncordon it
kubectl uncordon <NEW_NODE_NAME>
```

**Verify:** `kubectl get pods -n microservices` — all pods should show Running.

---

## Section 2 — ArgoCD Recovery (Without Cluster Rebuild)

If ArgoCD itself crashes but the cluster is healthy:

```bash
# Check ArgoCD pod status
kubectl get pods -n argocd

# If pods are in CrashLoopBackOff or Error, restart the deployment
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-application-controller -n argocd
kubectl rollout restart deployment argocd-repo-server -n argocd

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  --all -n argocd --timeout=120s

# Verify sync resumes
ARGOCD_IP=$(kubectl get svc argocd-server -n argocd \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "ArgoCD UI: http://$ARGOCD_IP"
```

**Verify:** Open the ArgoCD UI → microservices-app should show Synced + Healthy within 3 minutes.

---

## Section 3 — Full Cluster Recovery (AKS Total Loss)

**Estimated time: 20–40 minutes**

This is the worst-case scenario. The entire AKS cluster is gone or unrecoverable.
Because all infrastructure is defined in Terraform and all application state is in GitHub,
recovery is a full rebuild via `terraform apply` — not a manual restore.

### Step 3.1 — Re-provision with Terraform

```bash
# Authenticate
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"

# Export the same secrets used originally
export TF_VAR_argocd_admin_password="<from Key Vault or your records>"
export TF_VAR_grafana_admin_password="<from Key Vault or your records>"
export TF_VAR_github_pat="<from Key Vault or your records>"
export TF_VAR_azdo_pat="<from your records>"

cd terraform
terraform init
terraform apply   # type yes — rebuilds all 33 resources
```

Terraform recreates: resource group, AKS cluster, ACR, Key Vault (and re-populates secrets),
NGINX Ingress, cert-manager, ArgoCD, Prometheus/Grafana, namespaces, and the ArgoCD Application.

### Step 3.2 — Connect kubectl and Get New IPs

```bash
az aks get-credentials --resource-group rg-gitops-project --name aks-gitops-project

# Get new IPs (they change on every rebuild)
kubectl get svc argocd-server -n argocd --no-headers | awk '{print "ArgoCD:", $4}'
kubectl get svc ingress-nginx-controller -n ingress-nginx --no-headers | awk '{print "Ingress:", $4}'
```

### Step 3.3 — Update IPs in the Repository

The ArgoCD and Ingress IPs will be different on every fresh deploy. Update them:

```bash
# Update cd-pipeline.yml ARGOCD_SERVER variable with new ArgoCD IP
# Update cd-pipeline.yml INGRESS_IP in the DAST stage with new Ingress IP
# Update k8s/ingress/ingress.yaml: replace the nip.io hostname with <new-ingress-ip>.nip.io

git add azure-pipelines/cd-pipeline.yml k8s/ingress/ingress.yaml
git commit -m "config: update IPs after cluster rebuild"
git push origin main
```

ArgoCD will automatically sync the updated manifests and deploy all four microservices.

### Step 3.4 — Re-register the Pipeline Agent

SSH into the agent VM (its IP is in Terraform output `agent_public_ip`) and re-register:

```bash
ssh azureuser@<AGENT_PUBLIC_IP>
az login
az aks get-credentials --resource-group rg-gitops-project --name aks-gitops-project
cd ~/agent
./config.sh --url https://dev.azure.com/gitops-cicd-org --auth pat \
  --token <AZDO_PAT> --pool Default --agent vm-devops-agent \
  --unattended --acceptTeeEula
sudo ./svc.sh install azureuser && sudo ./svc.sh start
```

### Step 3.5 — Verify Full Recovery

```bash
# All 8 pods should be Running (2 replicas × 4 services)
kubectl get pods -n microservices

# Get the new Ingress IP
INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test each service via Ingress
curl -k https://${INGRESS_IP}.nip.io/health          # frontend (200 = HTML)
curl -k https://${INGRESS_IP}.nip.io/api/students    # python-app
curl -k https://${INGRESS_IP}.nip.io/api/courses     # nodejs-app
curl -k https://${INGRESS_IP}.nip.io/api/reports     # dotnet-app
```

> **Note on ArgoCD login after rebuild:** Use `--grpc-web --insecure` flags — the cluster uses a self-signed certificate:
> ```bash
> argocd login <ARGOCD_IP> --username admin \
>   --password <TF_VAR_argocd_admin_password> \
>   --grpc-web --insecure
> ```

---

## Section 4 — DR Test Procedure

**This must be run before the project demo to verify the 2-hour RTO is realistic.**

1. Note the current external IPs of all three services
2. Run `scripts/non-prod-shutdown.sh stop` to stop the cluster (simulates outage)
3. Start a timer
4. Follow Section 3 completely, from scratch
5. Stop the timer when all three `/health` endpoints return `200 OK`
6. Record the actual recovery time in the table below
7. Update the **Last tested** date at the top of this document

| Test date | Tester | Actual recovery time | Notes |
|-----------|--------|---------------------|-------|
| (not yet tested) | — | — | — |

---

## Residual DR Risks (Accepted)

| Risk | Accepted Reason | Compensating Control |
|------|----------------|---------------------|
| Single-region deployment — a UK South region outage takes down everything | Cross-region AKS replication costs ~2× and is out of scope for an academic project | Document impact: full outage; recovery requires choosing a new region and rebuilding |
| No automated DR trigger — recovery is always manual | Automated failover (Azure Traffic Manager + multi-region AKS) is enterprise-grade and out of scope | Monitor Azure Service Health alerts; initiate manual recovery from this runbook |
| ACR images not replicated to a second region | Geo-replication is ~$45/month extra | On full cluster rebuild in a new region: re-run CI pipeline to push images to ACR in that region |
