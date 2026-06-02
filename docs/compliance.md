# Compliance and Control Evidence

**System:** CI/CD Pipeline with Azure DevOps, GitOps, and AKS
**Last reviewed:** 2026-05-31
**Compliance owner:** 
**Applicable frameworks:** The controls below map to the spirit of CIS Kubernetes Benchmark v1.8 and OWASP CI/CD Security Top 10.

> Before this system handles real user data, a compliance officer must review this document, confirm the applicable frameworks (GDPR, SOC2, ISO 27001, etc.), and sign off on each control. The "Compliance owner" field above must be a named person — not a team.

---

## Control Matrix

### Identity and Access Management

| Control | Requirement | Implementation | Evidence Location | Status |
|---------|-------------|----------------|-------------------|--------|
| IAC-1 | Credentials are never stored in code or pipeline variables | Secrets in Azure Key Vault; fetched at runtime via Service Principal | `azure-pipelines/cd-pipeline.yml` — AzureKeyVault@2 tasks | ✅ Implemented |
| IAC-2 | Service accounts follow least privilege | AKS ServiceAccounts are per-application with no cluster-wide permissions; CI SP has AcrPush + KV Get only | `k8s/rbac/*.yaml`; `terraform/modules/acr/main.tf` | ✅ Implemented |
| IAC-3 | No auto-mounted Kubernetes service account tokens | `automountServiceAccountToken: false` on all pods | `k8s/deployments/*.yaml` | ✅ Implemented |
| IAC-4 | ArgoCD deployment scope restricted to microservices namespace | AppProject `namespaceResourceWhitelist` and `destinations` | `argocd/project.yaml` | ✅ Implemented |
| IAC-5 | ArgoCD source restricted to authorised repository | `sourceRepos` pins to `github.com/Ayooluwabami/cicd-azure-gitops-aks.git` | `argocd/project.yaml` | ✅ Implemented |

### Container Security

| Control | Requirement | Implementation | Evidence Location | Status |
|---------|-------------|----------------|-------------------|--------|
| CS-1 | Containers run as non-root | `runAsNonRoot: true`; UID 1001 or 1000 | `k8s/deployments/*.yaml` | ✅ Implemented |
| CS-2 | Read-only root filesystem | `readOnlyRootFilesystem: true`; writable `/tmp` via emptyDir | `k8s/deployments/*.yaml` | ✅ Implemented |
| CS-3 | All Linux capabilities dropped | `capabilities.drop: ["ALL"]` | `k8s/deployments/*.yaml` | ✅ Implemented |
| CS-4 | Privilege escalation blocked | `allowPrivilegeEscalation: false` | `k8s/deployments/*.yaml` | ✅ Implemented |
| CS-5 | Seccomp profile applied | `seccompProfile.type: RuntimeDefault` | `k8s/deployments/*.yaml` | ✅ Implemented |
| CS-6 | Container images scanned for CVEs before deployment | Trivy scans all images (`--exit-code 0`); findings published as SARIF artifacts but do not block the build — results must be reviewed manually per run | `azure-pipelines/ci-pipeline.yml` — Trivy steps; artifacts: `trivy-*-results` | ⚠️ Implemented (non-blocking) |
| CS-7 | Images use immutable tags | Build ID tags (`python-app:12345`) — never `latest` | `azure-pipelines/ci-pipeline.yml` — IMAGE_TAG variable | ✅ Implemented |

### Network Security

| Control | Requirement | Implementation | Evidence Location | Status |
|---------|-------------|----------------|-------------------|--------|
| NS-1 | Default-deny network policy | All traffic denied unless explicitly allowed | `k8s/network-policies/default-deny-all.yaml` | ✅ Implemented |
| NS-2 | Per-service ingress restricted to ingress-nginx and monitoring namespaces | `from.namespaceSelector` on each policy | `k8s/network-policies/*-netpol.yaml` | ✅ Implemented |
| NS-3 | TLS enforced on public Ingress | `ssl-redirect: true`; cert-manager self-signed issuer; HTTPS at `https://<INGRESS-IP>.nip.io` | `k8s/ingress/ingress.yaml` | ✅ Implemented |
| NS-4 | CORS restricted to known origin | `ALLOWED_ORIGIN` env var; no wildcard | `microservices/*/app.py`, `app.ts`, `Program.cs` | ✅ Implemented |
| NS-5 | All public traffic routed through a single Ingress | NGINX Ingress controller is the only public entry point; individual services are ClusterIP | `k8s/ingress/ingress.yaml`, `k8s/services/*.yaml` | ✅ Implemented |

### CI/CD Pipeline Security (OWASP CI/CD Top 10)

| OWASP Control | Description | Implementation | Status |
|---------------|-------------|----------------|--------|
| CICD-SEC-1: Insufficient flow control | Every PR and push must pass security gates before merge | Gitleaks → Checkov → Semgrep → Trivy; all gates hard-fail | ✅ Implemented |
| CICD-SEC-2: Inadequate identity and access management | Pipeline credentials scoped to minimum operations | Service Principal: AcrPush + KV Get only | ✅ Implemented |
| CICD-SEC-3: Dependency chain abuse | Third-party tools pinned to exact versions | `gitleaks:v8.18.4`, `checkov==3.2.0`, `semgrep==1.72.0`, `trivy:0.70.0` | ✅ Implemented |
| CICD-SEC-4: Poisoned pipeline execution | Secret scanning blocks committed credentials before build | Gitleaks stage before any build step | ✅ Implemented |
| CICD-SEC-6: Insufficient credential hygiene | No credentials in YAML, environment variables, or logs | All secrets in Key Vault; `issecret=true` on pipeline variables | ✅ Implemented |

### Audit and Traceability

| Control | Requirement | Implementation | Evidence Location | Status |
|---------|-------------|----------------|-------------------|--------|
| AU-1 | Every deployment is traceable to a commit | CD pipeline commit message includes build ID, requester, and branch | `azure-pipelines/cd-pipeline.yml` — git commit step | ✅ Implemented |
| AU-2 | Secret access is logged | Azure Key Vault access logs in Azure Monitor | Azure Portal → Key Vault → Diagnostics | ✅ Implemented |
| AU-3 | ArgoCD sync events are logged | ArgoCD application events visible in UI and CLI | `argocd app history microservices-app` | ✅ Implemented |
| AU-4 | Pipeline execution history retained | Azure DevOps pipeline run history with actor, branch, commit, outcome | Azure DevOps → Pipelines → Runs | ✅ Implemented |

---

## Residual Control Gaps (Accepted for Academic Context)

| Gap | Risk | Acceptance Rationale | Required Before Production |
|-----|------|---------------------|---------------------------|
| No WAF or L7 rate limiting | DDoS and API abuse possible | No real users; no sensitive data | Azure Application Gateway WAF or Cloudflare |
| Shared ArgoCD admin account | Actions not attributable to individuals | Academic project; team is small | Azure AD OIDC SSO for ArgoCD |
| No automated secret rotation | Stale credentials if not manually rotated | Manual rotation policy documented in DR | Key Vault rotation policy + pipeline re-auth automation |
| No data residency enforcement | Data could be processed outside uksouth | No regulated data processed | Azure Policy + DenyAction on cross-region resource creation |
| No penetration test | Unknown application vulnerabilities | STRIDE model + DAST (ZAP) substitute for academic scope | Third-party pen test required before handling PII |

---

## Sign-off Requirements Before Production Use

Before this system handles real user data or is used in a regulated context, the following approvals are required:

| Approval | Required Approver | Date | Status |
|----------|------------------|------|--------|
| Security controls review | Named security engineer | — | Pending |
| Compliance framework identification | Named compliance officer | — | Pending |
| Data classification completed | Data owner | — | Pending |
| Penetration test result reviewed | CISO or delegate | — | Pending |
