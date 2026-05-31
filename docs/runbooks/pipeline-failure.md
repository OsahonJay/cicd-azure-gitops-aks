# Runbook: CI/CD Pipeline Failure

**Alert:** Manual — engineer notices pipeline failed in Azure DevOps, or ArgoCD alert fires because manifests were not updated
**Severity:** P2 — no immediate user impact, but new code is not reaching production
**SLO impact:** Deployment freshness SLO (< 5 min) is breached while the pipeline is blocked
**Escalation:** If the pipeline has been blocked > 1 hour and a critical fix is waiting to deploy, escalate and consider a manual deployment

---

## What This Alert Means

The CI or CD pipeline failed to complete. New code changes and image builds are blocked. The cluster continues to run the last successfully deployed version, so users are unaffected — but the team cannot ship.

---

## Step 1 — Find the Failed Stage

In Azure DevOps, go to **Pipelines → Runs**. Click the failed run. Identify which stage and job failed. The job name tells you what to investigate:

| Failed stage | What it means | Where to look |
|-------------|--------------|--------------|
| `Gate 1 — Secret Scanning (Gitleaks)` | A committed secret was detected | See Step 2 |
| `Gate 2 — IaC Scanning (Checkov)` | A K8s manifest has a security misconfiguration | See Step 3 |
| `Gate 3 — SAST (Semgrep)` | A code pattern matched a security rule | See Step 4 |
| `Build · Scan · Push — <app>` | Docker build failed, Trivy found CVEs, or ACR push failed | See Step 5 |
| `Fetch Runtime Secrets from Key Vault` | Key Vault unreachable or permission denied | See Step 6 |
| `Update K8s Manifests` | Git push to GitHub failed | See Step 7 |
| `ArgoCD Sync + Health Gate` | ArgoCD could not sync or pods not healthy after deploy | See `argocd-out-of-sync.md` |

---

## Step 2 — Gitleaks: Committed Secret

Gitleaks found a credential or token in the commit history.

```bash
docker run --rm \
  -v "$(pwd):/repo" \
  ghcr.io/gitleaks/gitleaks:v8.18.4 \
  detect --source /repo --redact
```

**Remove the secret from history:**

```bash
git filter-repo --path <file-with-secret> --invert-paths
```

**Rotate the secret immediately.** A secret that was committed — even briefly — must be considered compromised. Rotate it before pushing the cleaned history.

Store the new value in Key Vault and update the relevant secret reference.

---

## Step 3 — Checkov: K8s Misconfiguration

Read the Checkov output from the pipeline log. It shows the rule ID and the file.

Common failures after security hardening:

| Rule | What it checks | Fix |
|------|---------------|-----|
| `CKV_K8S_14` | `runAsNonRoot` not set | Already set — check if manifest was reverted |
| `CKV_K8S_30` | Container runs as root UID 0 | Change `runAsUser` to 1001 |
| `CKV_K8S_20` | `allowPrivilegeEscalation` not false | Already set — check for regression |
| `CKV_K8S_28` | `NET_RAW` capability not dropped | Add to `capabilities.drop` list |

Download the SARIF artifact from the failed pipeline run for full details.

---

## Step 4 — Semgrep: Insecure Code Pattern

Read the Semgrep findings from the SARIF artifact. Each finding includes the file, line, rule, and a link to the rule documentation.

For false positives, add a `nosemgrep` suppression comment with justification:

```python
data = pickle.loads(user_data)  # nosemgrep: python.lang.security.deserialization
```

Do not suppress findings without understanding them. If the finding is valid, fix the code before merging.

---

## Step 5 — Build or Trivy Failure

**Docker build failed:**
- Read the Docker build output in the pipeline log
- The most common cause is a dependency that cannot be installed (e.g. a PyPI package that does not support ARM64)
- Fix the `requirements.txt` or `Dockerfile` and push a new commit

**Trivy found CRITICAL/HIGH CVEs:**

```bash
# Reproduce locally (requires Trivy installed)
trivy image --severity CRITICAL,HIGH python-app:<FAILED_BUILD_TAG>
```

Options:
1. Update the base image in the Dockerfile to a newer version with the CVE patched
2. If the CVE is in an application dependency, update `requirements.txt` / `package.json` / `.csproj`
3. If the CVE affects a package your code does not use (false positive for your use case), add a Trivy ignore rule — document why

**ACR push failed (authentication):**

```bash
az acr login --name acrgitopsproject
docker push acrgitopsproject.azurecr.io/python-app:<TAG>
```

If this fails locally, check that the service principal still has `AcrPush`:

```bash
az role assignment list --scope $(az acr show -n acrgitopsproject --query id -o tsv)
```

---

## Step 6 — Key Vault Unreachable

```bash
az keyvault secret show --vault-name kv-gitops-project --name argocd-admin-password
```

If this fails, check:
1. The service principal still has the `Key Vault Secrets User` role
2. The Key Vault name in `cd-pipeline.yml` matches the actual vault name
3. The Key Vault is not in a soft-deleted state

---

## Step 7 — Git Push Rejected (Non-Fast-Forward)

The CD pipeline tries to push manifest updates to GitHub and is rejected because another commit happened between the checkout and the push.

This is handled automatically — the pipeline does `git fetch + git reset --hard origin/main` before modifying manifests. If it still fails:

1. Check if someone pushed directly to `main` without going through a PR (bypassing branch protection)
2. Check if the GitHub PAT has `repo` write scope

```bash
az keyvault secret show --vault-name kv-gitops-project --name github-pat --query value -o tsv
```

Test the PAT manually:

```bash
git remote set-url origin https://x-access-token:<PAT>@github.com/Ayooluwabami/cicd-azure-gitops-aks.git
git push origin main
```

---

## Manual Emergency Deployment (Last Resort)

If the pipeline is blocked and a critical fix cannot wait:

```bash
# Build and push the image manually
az acr login --name acrgitopsproject
docker build -t acrgitopsproject.azurecr.io/python-app:emergency-$(date +%s) microservices/python-app/
docker push acrgitopsproject.azurecr.io/python-app:emergency-$(date +%s)

# Update the manifest manually
sed -i "s|acrgitopsproject.azurecr.io/python-app:.*|acrgitopsproject.azurecr.io/python-app:emergency-<TAG>|" \
  k8s/deployments/python-app-deployment.yaml

# Push manifest change — ArgoCD will pick it up
git add k8s/deployments/python-app-deployment.yaml
git commit -m "emergency: manual image tag update [skip ci]"
git push origin main
```

Document every manual deployment in the incident log. Manual deployments bypass the security gate pipeline and must be reviewed and re-deployed through the normal pipeline as soon as it is unblocked.

---

## Post-Resolution Verification

```bash
# Confirm pipeline passes end-to-end
# In Azure DevOps: Pipelines → most recent run → all stages green

# Confirm the new version is deployed
kubectl get deployment python-app -n microservices -o jsonpath='{.spec.template.spec.containers[0].image}'
```
