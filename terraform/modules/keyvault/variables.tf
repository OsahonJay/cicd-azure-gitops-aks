variable "resource_group_name"   { type = string }
variable "location"              { type = string }
variable "key_vault_name"        { type = string }
variable "tenant_id"             { type = string }
variable "terraform_object_id"   { type = string }
variable "pipeline_sp_object_id" { type = string }

variable "argocd_admin_password" {
  type      = string
  sensitive = true
}

variable "github_pat" {
  type      = string
  sensitive = true
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
}

variable "api_key" {
  type      = string
  sensitive = true
}

variable "allowed_origin" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
