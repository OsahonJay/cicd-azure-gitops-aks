# Production-Grade CI/CD Pipeline — Azure DevOps, GitOps & AKS

A fully automated, security-gated CI/CD pipeline built as part of a collaborative DevOps engineering project. Every component — from infrastructure provisioning to live security scanning — is defined as code and version-controlled. A `git push` is the only manual action required to get code running in production.

> **Stack:** Azure DevOps · AKS · ArgoCD · Terraform · Azure Key Vault · ACR · Prometheus/Grafana · Gitleaks · Checkov · Semgrep · Trivy · OWASP ZAP

---

## What This Project Does

Three microservices (Python/Flask, Node.js/Express, ASP.NET Core) run as containers in a 3-node AKS cluster. A React frontend sits behind an NGINX Ingress Controller. All infrastructure is Terraform-provisioned. All secrets live in Azure Key Vault.

A developer pushes code. Azure DevOps runs five security gates across two pipelines. ArgoCD detects the manifest change and deploys it to the cluster. The pipeline only declares success after the application is confirmed healthy and has passed a live DAST scan. No console access. No `kubectl apply`. No single person holding the deployment process in their head.

---

## Architecture

```
Developer
    │  git push
    ▼
GitHub (source of truth)
    │  webhook trigger
    ▼
Azure DevOps CI Pipeline
    ├── Gate 1: Gitleaks       (secret scanning — fails fast)
    ├── Gate 2: Checkov        (IaC misconfiguration scan)
    ├── Gate 3: Semgrep        (SAST — runs in parallel with Gate 2)
    ├── Build Docker images    (linux/arm64, all services in parallel)
    ├── Gate 4: Trivy          (container CVE scan — CRITICAL/HIGH)
    └── Push to ACR            (immutable build-ID tag)
         │
         ▼
Azure DevOps CD Pipeline
    ├── Fetch secrets from Azure Key Vault (runtime injection, never on disk)
    ├── Update k8s deployment manifests   (sed image tag → new build ID)
    ├── Commit manifest change to GitHub  ([skip ci] prevents loop)
    ├── ArgoCD sync + wait for healthy    (fails pipeline if pods don't come up)
    └── Gate 5: OWASP ZAP                 (DAST scan against live endpoints)
         │
         ▼ (GitOps pull — ArgoCD reads Git, not the pipeline)
ArgoCD (selfHeal: true — auto-corrects cluster drift within 3 minutes)
    │
    ▼
AKS Cluster — 3 nodes, Standard_D2ps_v6 (ARM64), UK South
    ├── python-app   (Flask,        Port 5000)
    ├── nodejs-app   (Express,      Port 3000)
    └── dotnet-app   (ASP.NET Core, Port 8080)
         │
         ▼
NGINX Ingress Controller
    ├── /python/  → python-app-svc
    ├── /nodejs/  → nodejs-app-svc
    └── /dotnet/  → dotnet-app-svc
```

---

## Why ARM64?

The cluster runs `Standard_D2ps_v6` nodes — ARM64 architecture. Cost is approximately 50% less than equivalent x86-64 nodes on Azure. The self-hosted Azure DevOps agent VM also runs ARM64, which means images are built natively (`linux/arm64`) without QEMU emulation overhead. This eliminates the `exec format error` failures that happen when an amd64 image accidentally gets deployed to an arm64 node.

---

## Security Gates

The pipeline enforces five automated security gates. Code doesn't reach the cluster until it passes all five, every time, on every push.

| Gate | Tool | What It Catches |
|------|------|-----------------|
| 1 | Gitleaks | Secrets, tokens, API keys committed to source code |
| 2 | Checkov | Kubernetes misconfigurations (root containers, missing limits, permissive RBAC) |
| 3 | Semgrep | Insecure code patterns — hardcoded credentials, SQLi, path traversal |
| 4 | Trivy | CRITICAL and HIGH CVEs in container images |
| 5 | OWASP ZAP | XSS, injection, insecure headers — scanned against the live running app |

Gates 2 and 3 run in parallel. Gates 1 through 4 run before any image is pushed. Gate 5 runs after deployment — the only way to test real HTTP behaviour is against a running application.

---

## Why GitOps? (And What It Actually Changes)

The CD pipeline never writes directly to the Kubernetes API. It commits a manifest change to GitHub. ArgoCD, running inside the cluster, detects that change and applies it. This is pull-based delivery — the defining property of GitOps.

The practical security implication: if the pipeline is compromised, an attacker can push to a repository. They cannot directly modify running workloads. The cluster only accepts changes through ArgoCD's watched path, not through any external write access.

`selfHeal: true` means any manual change to the cluster — scaling a deployment, editing a ConfigMap, deleting a pod — gets reverted within three minutes. The cluster is always a reflection of Git, nothing more.

---

## Infrastructure (Terraform)

All Azure resources are defined in Terraform. The environment is reproducible from scratch with `terraform apply`. Nothing was created manually in the portal.

Resources provisioned:
- AKS cluster (3 nodes, ARM64, UK South)
- Azure Container Registry (private, cluster identity attached — no image pull secrets needed)
- Azure Key Vault (ArgoCD password, GitHub PAT, API keys)
- Self-hosted agent VM (ARM64)
- NGINX Ingress Controller (via Helm)
- ArgoCD
- Prometheus + Grafana (via Helm)

```bash
# One-time remote state setup
az group create -n rg-tfstate -l uksouth
az storage account create -n stgitopsstate01 -g rg-tfstate --sku Standard_LRS
az storage container create -n tfstate --account-name stgitopsstate01

# Provision everything
cd terraform
cp terraform.tfvars.example terraform.tfvars

export TF_VAR_argocd_admin_password="<strong-password>"
export TF_VAR_github_pat="ghp_xxxxxxxxxxxxxxxxxxxx"
export TF_VAR_grafana_admin_password="<strong-password>"

terraform init
terraform plan
terraform apply
# Takes 10–15 minutes. Cluster, registry, and ArgoCD are running when it finishes.
```

---

## Container Security Hardening

Every container in the cluster runs with these controls enforced at the pod spec level:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

Verify on a running pod:

```bash
# Confirm non-root
kubectl exec -n microservices \
  $(kubectl get pod -n microservices -l app=python-app -o name | head -1) -- id
# uid=1001(appuser) gid=1001(appgroup)

# Confirm read-only filesystem
kubectl exec -n microservices \
  $(kubectl get pod -n microservices -l app=python-app -o name | head -1) -- touch /test-file
# touch: cannot touch '/test-file': Read-only file system
```

NetworkPolicies enforce default-deny between services. A compromised Python pod cannot initiate connections to Node.js or the database. Each service accepts traffic only on its specific port. NGINX Ingress is the only external entry point.

---

## Secrets Management

Secrets have one home: Azure Key Vault. They are never stored in pipeline YAML, variable groups, or environment files.

The pipeline retrieves them at runtime using the `AzureKeyVault@2` task:

```yaml
- task: AzureKeyVault@2
  inputs:
    azureSubscription: "AZURE_SERVICE_CONNECTION"
    KeyVaultName: "kv-gitops-project"
    SecretsFilter: "argocd-admin-password,github-pat"
```

Values are injected as in-memory environment variables. They are masked in build logs. They never touch the filesystem.

---

## Repository Structure

```
.
├── azure-pipelines/
│   ├── ci-pipeline.yml        # Security gates → build → CVE scan → push
│   └── cd-pipeline.yml        # Secrets → manifest update → ArgoCD sync → DAST
├── microservices/
│   ├── python-app/            # Flask REST API  (Port 5000)
│   ├── nodejs-app/            # Express REST API (Port 3000)
│   └── dotnet-app/            # ASP.NET Core REST API (Port 8080)
├── k8s/
│   ├── bootstrap/             # One-time manual apply (ArgoCD AppProject)
│   ├── deployments/           # Image tags updated by CD pipeline
│   ├── services/              # ClusterIP services
│   ├── ingress/               # NGINX path-based routing
│   ├── rbac/                  # Per-app ServiceAccounts
│   ├── network-policies/      # Default-deny + per-service allow
│   ├── hpa/                   # HorizontalPodAutoscalers
│   ├── pdb/                   # PodDisruptionBudgets
│   ├── quotas/                # ResourceQuota + LimitRange
│   └── monitoring/            # Helm values for kube-prometheus-stack
├── argocd/
│   ├── application.yaml       # ArgoCD Application definition
│   └── project.yaml           # ArgoCD AppProject definition
├── terraform/                 # All infrastructure as code
├── docs/
│   ├── setup-guide.md         # Step-by-step setup (start here)
│   ├── trade-off-matrix.md    # Architecture decision records (ADR 1–7)
│   ├── threat-model.md        # STRIDE threat analysis
│   ├── slo.md                 # SLIs, SLOs, error budget policy
│   ├── compliance.md          # CIS Kubernetes + OWASP CI/CD control matrix
│   ├── cost-estimate.md       # Azure cost breakdown
│   ├── disaster-recovery.md   # DR runbook with RTO/RPO
│   └── runbooks/
│       ├── pod-restart-high.md
│       ├── node-cpu-high.md
│       ├── argocd-out-of-sync.md
│       ├── high-error-rate.md
│       └── pipeline-failure.md
├── monitoring/
│   ├── log-queries.md         # KQL and PromQL reference queries
│   └── setup-alerts.sh
└── scripts/
    └── non-prod-shutdown.sh   # Stop/start AKS cluster to manage cost
```

---

## Quick Start

Full instructions are in **[docs/setup-guide.md](docs/setup-guide.md)**.

### Prerequisites

| Tool | Install |
|------|---------|
| Azure CLI | `brew install azure-cli` |
| kubectl | `az aks install-cli` |
| Helm | `brew install helm` |
| Docker | [docker.com/get-docker](https://docker.com/get-docker) |
| Terraform | `brew install terraform` |

### Verify a live deployment

```bash
# All pods should show Running
kubectl get pods -n microservices

# Get the Ingress external IP
kubectl get ingress -n microservices

# Hit the endpoints
curl http://<INGRESS_IP>/python/
curl http://<INGRESS_IP>/nodejs/
curl http://<INGRESS_IP>/dotnet/
```

### Test GitOps self-healing

```bash
# Manually break something
kubectl scale deployment python-app --replicas=0 -n microservices

# Wait 90 seconds, then check
kubectl get pods -n microservices
# ArgoCD restores to 2/2 Running — drift corrected automatically
```

---

## Monitoring and SLOs

Prometheus + Grafana are deployed via Helm (`kube-prometheus-stack`). Metrics are scraped every 15 seconds from all pods and nodes.

| SLO | Target |
|-----|--------|
| Availability | 99.9% (43.8 min downtime budget/month) |
| p99 response time | < 500ms |
| Error rate | < 1% of requests |
| Deployment freshness | Code live within 5 minutes of push |

Alerts fire at 99.5% availability and 400ms p99 latency — before the error budget is consumed, not after.

```bash
# Access Grafana
kubectl get svc -n monitoring kube-prometheus-stack-grafana
# Default credentials: admin / admin
```

---

## Cost Management

ARM64 node SKU (`Standard_D2ps_v6`) costs approximately 50% less than equivalent x86-64 nodes. To stop the cluster when not in use:

```bash
bash scripts/non-prod-shutdown.sh stop
bash scripts/non-prod-shutdown.sh start
```

Full cost breakdown: [docs/cost-estimate.md](docs/cost-estimate.md)

---

## Docs

| Document | What's In It |
|----------|-------------|
| [Setup Guide](docs/setup-guide.md) | Step-by-step from zero to deployed |
| [Architecture Decisions](docs/trade-off-matrix.md) | Why each tool was chosen over alternatives |
| [Threat Model](docs/threat-model.md) | STRIDE analysis of the full system |
| [SLOs](docs/slo.md) | Service level indicators, objectives, and error budget policy |
| [Compliance](docs/compliance.md) | CIS Kubernetes Benchmark + OWASP CI/CD Top 10 control matrix |
| [Disaster Recovery](docs/disaster-recovery.md) | RTO/RPO targets and recovery runbook |

---

## Related

- [Ayobami Edun's Medium post](https://medium.com/@ayobamiedun) — detailed technical walkthrough of the full pipeline
- [Live project repository (group)](https://github.com/Ayooluwabami/cicd-azure-gitops-aks)
