variable "github_repo_url" { type = string }

variable "argocd_admin_password" {
  type      = string
  sensitive = true
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
}

variable "github_pat" {
  type      = string
  sensitive = true
}
