# Architectural Trade-off Matrices

**Project:** CI/CD Pipeline with Azure DevOps, GitOps, and AKS
**Date:** 2026-05-25

> Every significant architectural decision in this project was evaluated against
> at least three alternatives before a choice was made. This document is the
> evidence that choices were deliberate, not accidental.
>
> A non-technical stakeholder must be able to read the **Decision** line of each
> matrix and understand why the chosen option was selected.

---

## Decision 1 — Container Orchestration Platform

**Business problem:** We need a platform to run three independently deployable microservices
(Python, Node.js, .NET), support GitOps-based delivery via ArgoCD, and demonstrate
production-grade deployment automation as required by the project brief.

**Non-functional requirements driving this decision:**
- Must support ArgoCD or equivalent GitOps tooling
- Must support Kubernetes-native manifests (the project brief specifies K8s)
- Must scale beyond 3 services without architectural redesign
- Must be available on Azure (team's chosen cloud)

| Dimension | Weight | AKS — Azure Kubernetes Service ✅ | Azure Container Apps | Azure App Service (Containers) |
|-----------|--------|----------------------------------|---------------------|-------------------------------|
| **Monthly cost (3 services, 2 replicas each)** | High | ~$90–130 (3× B2s nodes) | ~$25–60 (consumption-based) | ~$45–90 (3× B2 plans) |
| **Implementation time** | Medium | High — K8s expertise required | Low — managed abstractions | Low — familiar web app model |
| **Operational complexity** | High | High — namespace, RBAC, NetworkPolicy, resource quotas | Low — Azure manages scaling, ingress, networking | Low — Azure manages most infra |
| **Scalability ceiling** | Medium | Unlimited — enterprise-grade horizontal + vertical | Good — up to 30 replicas per container | Limited — per App Service Plan |
| **GitOps / ArgoCD support** | Required | Native — ArgoCD deploys K8s manifests directly | Not supported — no K8s manifest layer | Not supported |
| **Attack surface introduced** | Required | Moderate — K8s API server, service accounts, etcd; all mitigated via RBAC + NetworkPolicy | Low — no cluster to manage, but less visibility into runtime security | Low — but no network isolation between services |
| **Project brief alignment** | Required | Exact match — brief specifies AKS | Partial — not mentioned in brief | Partial — not mentioned in brief |
| **Team existing expertise** | High | Low — learning opportunity; aligns with project goal | Medium | High — familiar web hosting model |
| **Compliance fit** | Required | Full control over network, RBAC, pod security | Limited control — Azure abstracts enforcement | Limited control |
| **10x traffic change** | Medium | Add node pool or enable cluster autoscaler — no redesign | Auto-scales by design | Requires plan upgrade or redesign |
| **If compromised: blast radius** | Required | One compromised pod cannot reach others (NetworkPolicy + RBAC) | Services share platform; isolation depends on Azure internals | Shared App Service Plan means shared process space |

**Decision: AKS chosen.**
The project brief explicitly requires AKS. Beyond compliance with the brief, AKS is the only option that supports ArgoCD natively and gives the team full control over network isolation and pod-level security hardening. The higher cost and complexity are the trade — and are justified by the learning outcome and production fidelity.

If cost were the primary constraint and GitOps was not required, Azure Container Apps would be reconsidered.

---

## Decision 2 — GitOps Delivery Tool

**Business problem:** Once a Docker image is pushed to ACR, something must detect the change
and update the running workload in AKS. We need a delivery mechanism that is auditable,
version-controlled, and does not require direct kubectl access from the CI pipeline.

**Non-functional requirements driving this decision:**
- Deployment state must be stored in Git (source of truth)
- Changes to the cluster must be traceable to a specific commit
- Self-healing: if someone manually changes a resource, it should be reverted automatically
- Must work without granting the CI pipeline direct write access to the K8s API server

| Dimension | Weight | ArgoCD ✅ | Flux CD | Plain kubectl in CD pipeline |
|-----------|--------|-----------|---------|------------------------------|
| **Monthly cost** | High | $0 (open source, runs in cluster) | $0 (open source, runs in cluster) | $0 (no additional component) |
| **Implementation time** | Medium | Medium — UI + CLI, well-documented | Medium — CLI-only, less beginner-friendly | Low — 3 lines of `kubectl apply` in pipeline |
| **Operational complexity** | High | Medium — dedicated ArgoCD namespace, separate admin credential | Medium — Flux runs as K8s controllers, no separate UI | Low — no extra component to maintain |
| **GitOps pull model** | Required | Yes — ArgoCD polls Git; cluster pulls changes | Yes — Flux polls Git; cluster pulls changes | No — pipeline pushes directly to cluster (CI/CD push model, not GitOps) |
| **Self-healing** | Required | Yes — `selfHeal: true` reverts manual cluster changes | Yes — built-in drift reconciliation | No — drift is not detected or corrected |
| **Audit trail** | Required | Full sync history in ArgoCD UI + logs | Full sync history in K8s events | Pipeline logs only — no cluster-side audit |
| **Attack surface introduced** | Required | ArgoCD admin UI on public IP (mitigated: password in Key Vault, AppProject scope) | No UI; lower surface area | Pipeline needs direct K8s API access — larger credential blast radius |
| **Rollback** | Required | One click or one CLI command per app | CLI command; no UI | Re-run previous pipeline build |
| **Multi-cluster support** | Medium | Yes — ArgoCD manages multiple clusters from one control plane | Yes | No — one pipeline per cluster |
| **Team existing expertise** | High | Low — new tool, but extensive documentation and the project guide uses it | Very Low — steeper learning curve | High — teams already know kubectl |
| **Beginner visibility** | Medium | High — web UI shows sync status, health, pod state in real time | Low — CLI and K8s events only | Low — only pipeline logs |

**Decision: ArgoCD chosen.**
ArgoCD implements a true GitOps pull model with self-healing, an accessible UI for demonstrating sync and deployment status, and is explicitly shown in the project reference video. It introduces a small additional attack surface (admin UI) which is mitigated by Key Vault-managed credentials and AppProject namespace scoping.

Flux would be a valid alternative in a team with stronger K8s expertise and a preference for minimal attack surface. Plain kubectl is rejected because it violates the GitOps requirement (push model, no drift detection, no self-healing).

---

## Decision 3 — CI/CD Pipeline Platform

**Business problem:** We need a platform to automatically build Docker images, run security
scans, and trigger deployment when code is pushed to the main branch.

**Non-functional requirements driving this decision:**
- Must integrate with Azure services (ACR, Key Vault, AKS) without additional connectors
- Must support YAML-defined pipelines stored in the same repository
- Must provide an audit log: who triggered what, on which commit, with what outcome
- Must support parallel stages (3 microservices build simultaneously)

| Dimension | Weight | Azure DevOps ✅ | GitHub Actions | Jenkins |
|-----------|--------|----------------|----------------|---------|
| **Monthly cost** | High | $0 (free tier: 5 users, 1800 min/month) | $0 (free tier: 2000 min/month for public repos) | $0 (self-hosted) but requires a VM (~$30/month) |
| **Implementation time** | Medium | Low — native Azure integration; tasks for ACR, Key Vault, AKS built-in | Low — large marketplace of actions | High — plugins, configuration, maintenance |
| **Azure integration** | Required | Native — Service Connections to Azure with one click | Good — uses Azure Login action | Manual — credentials managed outside pipeline |
| **Pipeline as code** | Required | Yes — YAML in repo | Yes — YAML in repo | Jenkinsfile in repo (or UI-configured, which is anti-pattern) |
| **Secret management** | Required | Azure Key Vault task built in | Requires azure/get-keyvault-secrets action | HashiCorp Vault plugin or environment variables |
| **Audit log** | Required | Full pipeline run history with who triggered, branch, commit, outcome; 12-month retention | Full run history in GitHub UI | Full history but on self-hosted server — team must manage retention |
| **Attack surface introduced** | Required | Azure service connection scoped to minimum roles; secrets in Key Vault | GitHub Actions tokens scoped per workflow; OIDC for Azure auth | Jenkins master is a long-lived server — hardening required; plugin supply chain risk |
| **Parallel stages** | Medium | Yes — `dependsOn: []` for parallel stages | Yes — matrix / parallel jobs | Yes — parallel stages in Jenkinsfile |
| **Team existing expertise** | High | Low — new tool | Medium — GitHub is familiar | Low — Jenkins has a steep learning curve |
| **Project brief alignment** | Required | Exact match — brief specifies Azure DevOps | Not specified | Not specified |
| **10x pipeline volume** | Medium | Increase Microsoft-hosted agent minutes or add self-hosted agents | Add self-hosted runners | Add Jenkins agents |

**Decision: Azure DevOps chosen.**
The project brief explicitly requires Azure DevOps. It is also the strongest choice for Azure-native workloads — built-in service connections, Key Vault tasks, and ACR integration reduce the pipeline configuration to a minimum. The free tier is sufficient for the project's build volume.

GitHub Actions would be the natural alternative if the project brief permitted it — the team already uses GitHub for the repository, and OIDC-based Azure authentication would eliminate the Service Principal entirely. This is noted as the preferred evolution path for a real production system.

---

## Decision 4 — Secret Management

**Business problem:** The CD pipeline needs the ArgoCD admin password and a GitHub PAT
at runtime. These cannot be stored in pipeline YAML or Azure DevOps variables (visible to
project admins). They need to be stored, accessed, and rotated independently of the pipeline.

| Dimension | Weight | Azure Key Vault ✅ | Azure DevOps Secret Variables | Hardcoded in YAML |
|-----------|--------|-------------------|------------------------------|-------------------|
| **Monthly cost** | High | < $1/month | $0 | $0 |
| **Visibility to admins** | Required | Not visible — access controlled by Azure RBAC separately from DevOps project | Visible to all Azure DevOps project administrators | Visible to anyone with repository read access |
| **Access logging** | Required | Every read is logged in Azure Monitor; anomalous access alerts possible | No access logging | No access logging |
| **Rotation without pipeline change** | Required | Yes — update secret in Key Vault; pipeline picks up new value on next run automatically | No — requires updating pipeline variable definition | No — requires code change and new commit |
| **Scope control** | Required | Specific secrets granted to specific Service Principals via Azure RBAC | All pipeline secrets accessible to all pipelines in the project | No scope — anyone with repo access has the secret |
| **Compliance evidence** | Required | Azure Monitor logs provide evidence of access controls | No audit trail | No audit trail |
| **Attack surface introduced** | Required | Key Vault access requires Azure RBAC role (Key Vault Secrets User) scoped to this vault only | Secret visible in UI to any DevOps admin — one compromised admin account = all secrets | Secret in git history permanently even after deletion |

**Decision: Azure Key Vault chosen.**
Hardcoded YAML is rejected outright — a secret committed to a public repository is immediately compromised and remains in git history permanently. Azure DevOps secret variables are an improvement but are visible to project administrators and have no access log. Key Vault provides the minimum acceptable secret management: access-controlled, rotation-independent, and auditable. The < $1/month cost is not a meaningful factor.

---

## Decision 5 — Infrastructure as Code Tool

**Business problem:** The AKS cluster, ACR, Key Vault, agent VM, and all supporting Azure resources must be provisioned in a repeatable, version-controlled way so that any team member can rebuild the environment from scratch without manual steps or institutional knowledge.

**Non-functional requirements driving this decision:**
- Infrastructure changes must be reviewed like code — not applied from someone's terminal
- State must be stored remotely so multiple engineers can collaborate without conflict
- Must support the full Azure resource set used in this project

| Dimension | Weight | Terraform ✅ | Azure Bicep / ARM | Pulumi |
|-----------|--------|-------------|-------------------|--------|
| **Monthly cost** | High | $0 (open source) | $0 (built into Azure) | $0 (open source) |
| **Implementation time** | Medium | Medium — provider ecosystem is large; HCL has a learning curve | Low — native Azure tooling; VS Code extension is excellent | High — requires a programming language (TypeScript/Python); more powerful but longer to bootstrap |
| **Operational complexity** | High | Medium — state file management, provider version pinning, module versioning | Low — no state file; ARM handles drift detection at the API level | High — state management similar to Terraform; language runtime adds another failure surface |
| **Multi-cloud / portability** | Medium | High — same tool works for AWS, GCP, and Azure | None — Azure only | High — any cloud, any API |
| **Remote state management** | Required | Yes — Azure Blob backend; state locking via lease | Not applicable — no state file | Yes — Pulumi Cloud or self-hosted backend |
| **Team existing expertise** | High | Low — new to all team members; industry standard means learning resources are abundant | Low — Azure-specific; fewer community resources | Very Low — requires programming language knowledge beyond HCL |
| **Module / reuse ecosystem** | Medium | High — Terraform Registry has production-grade Azure modules | Medium — AVM (Azure Verified Modules) is growing but newer | Medium — community components exist but smaller ecosystem |
| **Drift detection** | Required | Yes — `terraform plan` shows delta between state and reality | Yes — at the Azure API level via What-If | Yes — `pulumi preview` shows delta |
| **Compliance fit** | Required | Full — state can be stored in a compliant Azure Blob with encryption and RBAC | Full — native Azure; all controls apply automatically | Full — same as Terraform |
| **10x infrastructure growth** | Medium | Add modules; no redesign required | Add Bicep modules; no redesign required | Add components; no redesign required |

**Decision: Terraform chosen.**
Terraform is the industry-standard IaC tool for multi-cloud environments. Its HCL syntax is declarative and accessible to engineers who are new to IaC. The Azure provider is mature, well-maintained, and covers every resource used in this project. The learning investment is justified by portability — skills transfer to AWS, GCP, and any future cloud environment.

Bicep is the strongest alternative for an Azure-only team. Its native integration removes the state management burden entirely, and the Azure What-If functionality provides a safer change preview than `terraform plan`. If this project were expanding to production on Azure exclusively and with a team that intended to stay Azure-only, Bicep would be reconsidered.

Pulumi is rejected for this project because it requires proficiency in a general-purpose programming language on top of cloud knowledge — this increases the prerequisite bar without adding sufficient benefit at the current scale.

---

## Decision 6 — Compute Architecture (ARM64 vs x86-64)

**Business problem:** The AKS cluster nodes and the CI/CD agent VM must run Docker builds and serve application workloads. We need to choose a processor architecture that minimises cost, simplifies the build process, and avoids cross-compilation overhead.

**Non-functional requirements driving this decision:**
- Docker images must be built for the same architecture as the runtime nodes (to avoid performance overhead or emulation failures)
- Node cost must be manageable within the project budget
- Build times should be reasonable on a self-hosted agent

| Dimension | Weight | ARM64 — Standard_D2ps_v6 ✅ | x86-64 — Standard_D2s_v3 | Azure Spot (x86-64) |
|-----------|--------|----------------------------|--------------------------|---------------------|
| **Monthly cost (3 nodes + 1 agent)** | High | ~$140 (4 × Standard_D2ps_v6 at ~$0.048/hr) | ~$240 (4 × Standard_D2s_v3 at ~$0.096/hr) | ~$70 (3× spot B2s + 1 on-demand agent) — but interruptible |
| **Native linux/arm64 builds** | Required | Yes — no QEMU, no emulation overhead | No — requires QEMU (`multiarch/qemu-user-static`) which slows builds ~3–5× and occasionally fails | No |
| **Docker image compatibility** | Required | linux/arm64 only — images built on the agent run natively on cluster nodes | linux/amd64 — cross-compiled to arm64 with QEMU, or use separate multi-arch builds | linux/amd64 |
| **Cluster node stability** | Required | High — on-demand, consistent performance | High — on-demand, consistent performance | Low — spot VMs can be evicted with 2-minute notice; unacceptable for pipeline agents |
| **Agent VM stability** | Required | High — on-demand agent VM | High — on-demand agent VM | Low — spot VMs unsuitable for CI agents |
| **Operational complexity** | High | Low — single architecture throughout; no QEMU configuration | Medium — QEMU must be configured before every ARM64 build; occasional `exec format error` incidents | High — spot eviction handling, re-registration logic required |
| **Team existing expertise** | High | Low — ARM64 is less familiar but the tooling abstracts it | High — most engineers are familiar with x86-64 | Low — spot instance management adds operational burden |
| **10x traffic / build volume** | Medium | Add more Standard_D2ps_v6 nodes or scale the node pool | Same | Spot pool is cheaper but less reliable under sustained load |

**Decision: ARM64 (Standard_D2ps_v6) chosen.**
ARM64 nodes cost approximately 50% less than equivalent x86-64 SKUs on Azure. More importantly, using ARM64 throughout — both on the agent VM and the cluster nodes — eliminates the need for QEMU cross-compilation. QEMU build issues were a frequent source of pipeline failures in the x86-64 alternative: `exec format error` on the cluster when an amd64 image was accidentally pushed without a manifest list, and slow build times (~3–5× longer per image).

The trade-off is that engineers who do not have ARM64 hardware locally must be careful about running containers from this project on their own machines. This is a minor friction point for local development and is not a production concern.

Azure Spot is rejected for both the agent VM and cluster nodes. While the cost saving is significant (~50–70%), spot VMs are evicted without notice. A CI agent evicted mid-build produces a silent failure — the pipeline job times out rather than failing cleanly. For a reliability-first system, that tradeoff is not acceptable.

---

## Decision 7 — Cluster Monitoring Stack

**Business problem:** We need visibility into cluster health, application error rates, and resource usage so that on-call engineers can detect and diagnose problems before users are affected, and so that SLO compliance can be measured.

**Non-functional requirements driving this decision:**
- Must collect pod-level and node-level metrics automatically
- Must provide dashboards visible to all team members without sharing cluster credentials
- Must support the SLI queries defined in `docs/slo.md`
- Must produce actionable alerts — not noise

| Dimension | Weight | kube-prometheus-stack (Helm) ✅ | Azure Monitor + Container Insights only | Datadog |
|-----------|--------|--------------------------------|----------------------------------------|---------|
| **Monthly cost** | High | $0 (open source, runs in cluster) — only Log Analytics ($12/month for 5 GB/day) | ~$12/month Log Analytics + Azure Monitor metrics (included in AKS) | ~$15–23/host/month = ~$60–90/month for 4 VMs |
| **Implementation time** | Medium | Low — single `helm install` with values file | Very Low — enabled at cluster creation with `--enable-addons monitoring` | Medium — agent installation, API key management |
| **Operational complexity** | High | Medium — Prometheus, Alertmanager, Grafana running in cluster; must manage retention and memory | Low — Azure manages the stack | Low — SaaS, nothing to manage in cluster |
| **PromQL / SLI measurement** | Required | Yes — full PromQL support; all SLI queries in `docs/slo.md` run natively | Partial — KQL queries in Log Analytics, not PromQL; fewer out-of-the-box K8s metrics | Yes — DogQL and PromQL-compatible |
| **Grafana dashboards** | Required | Yes — full Grafana with community dashboard library; Kubernetes dashboards pre-installed | Partial — Azure Workbooks; fewer pre-built K8s dashboards | Yes — excellent pre-built dashboards |
| **Alert management** | Required | Yes — Alertmanager with routing, grouping, and silencing | Yes — Azure Monitor alerts; fewer routing options | Yes — best-in-class alert management |
| **Data residency** | Required | In-cluster — metrics never leave the AKS cluster | Azure data centres (UK South configured) | Datadog US or EU regions — must verify residency |
| **Vendor lock-in** | Medium | None — open source; exporters work with any PromQL-compatible backend | High — KQL is proprietary; moving away requires rewriting all queries | High — DogQL, proprietary agent, proprietary dashboards |
| **Team existing expertise** | High | Low — PromQL is new; Grafana is intuitive | Low — KQL is new | Very Low — paid training typically required |

**Decision: kube-prometheus-stack chosen.**
The kube-prometheus-stack gives full observability at zero incremental cost beyond the Log Analytics workspace already used by Azure Monitor. Every SLI defined in `docs/slo.md` can be measured with standard PromQL queries. The open-source Grafana dashboard library provides production-grade Kubernetes dashboards without configuration. Critically, metrics stay within the cluster — they do not transit to a third-party SaaS.

Azure Monitor alone is rejected because its KQL-based query model does not support the PromQL SLI expressions in `docs/slo.md`, and its Kubernetes dashboard coverage is weaker.

Datadog is the strongest alternative in terms of usability and alerting. For a production system with budget and a compliance requirement for supported SaaS tooling, Datadog would be reconsidered. At ~$90/month for this project's four VMs, the cost is not justified for an academic environment.
