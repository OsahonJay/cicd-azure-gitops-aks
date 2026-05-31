variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "uksouth"
}

variable "resource_group_name" {
  description = "Name of the main resource group."
  type        = string
  default     = "rg-gitops-project"
}

variable "cluster_name" {
  description = "Name of the AKS cluster."
  type        = string
  default     = "aks-gitops-project"
}

variable "node_count" {
  description = "Number of worker nodes (minimum 3 per project requirements)."
  type        = number
  default     = 3
}

variable "node_vm_size" {
  description = "VM size for AKS nodes."
  type        = string
  default     = "Standard_D2ps_v6"
}

variable "acr_name" {
  description = "Azure Container Registry name — globally unique, no hyphens."
  type        = string
  default     = "acrgitopsproject"
}

variable "key_vault_name" {
  description = "Azure Key Vault name."
  type        = string
  default     = "kv-gitops-project"
}

variable "pipeline_sp_object_id" {
  description = "Object ID of the Azure DevOps service principal. Grants AcrPush and Key Vault Get."
  type        = string
}

variable "argocd_admin_password" {
  description = "Initial ArgoCD admin password."
  type        = string
  sensitive   = true
}

variable "github_pat" {
  description = "GitHub PAT used by the CD pipeline to push manifest updates."
  type        = string
  sensitive   = true
}

variable "grafana_admin_password" {
  description = "Grafana admin password."
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "X-API-Key value for microservice authentication."
  type        = string
  sensitive   = true
}

variable "allowed_origin" {
  description = "CORS allowed origin for all microservices (e.g. https://your-domain.com)."
  type        = string
}

variable "github_repo_url" {
  description = "GitHub repository URL ArgoCD syncs from."
  type        = string
  default     = "https://github.com/Ayooluwabami/cicd-azure-gitops-aks.git"
}

variable "agent_admin_username" {
  description = "Admin username for the self-hosted agent VM."
  type        = string
  default     = "azureuser"
}

variable "agent_admin_ssh_public_key" {
  description = "SSH public key for the agent VM admin user."
  type        = string
}

variable "azdo_org_url" {
  description = "Azure DevOps organisation URL (e.g. https://dev.azure.com/myorg)."
  type        = string
}

variable "azdo_pat" {
  description = "Azure DevOps PAT for agent self-registration."
  type        = string
  sensitive   = true
}

variable "azdo_pool_name" {
  description = "Azure DevOps agent pool name."
  type        = string
  default     = "Default"
}

variable "environment" {
  description = "Deployment environment. Applied as a tag to every resource."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production."
  }
}

variable "cost_centre" {
  description = "Cost centre code for Azure Cost Management attribution. Required for all resources."
  type        = string
  default     = "cloud-training"
}
