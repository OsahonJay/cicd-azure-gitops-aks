terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "stgitopsstate01"
    container_name       = "tfstate"
    key                  = "cicd-gitops-aks/terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = module.aks.kube_config.host
    client_certificate     = base64decode(module.aks.kube_config.client_certificate)
    client_key             = base64decode(module.aks.kube_config.client_key)
    cluster_ca_certificate = base64decode(module.aks.kube_config.cluster_ca_certificate)
  }
}

provider "kubernetes" {
  host                   = module.aks.kube_config.host
  client_certificate     = base64decode(module.aks.kube_config.client_certificate)
  client_key             = base64decode(module.aks.kube_config.client_key)
  cluster_ca_certificate = base64decode(module.aks.kube_config.cluster_ca_certificate)
}

provider "kubectl" {
  host                   = module.aks.kube_config.host
  client_certificate     = base64decode(module.aks.kube_config.client_certificate)
  client_key             = base64decode(module.aks.kube_config.client_key)
  cluster_ca_certificate = base64decode(module.aks.kube_config.cluster_ca_certificate)
  load_config_file       = false
}

data "azurerm_client_config" "current" {}

locals {
  common_tags = {
    environment  = var.environment
    managed-by   = "terraform"
    deployed-by  = data.azurerm_client_config.current.object_id
    cost-centre  = var.cost_centre
    project      = "cicd-gitops-aks"
  }
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

module "acr" {
  source                = "./modules/acr"
  resource_group_name   = azurerm_resource_group.main.name
  location              = azurerm_resource_group.main.location
  acr_name              = var.acr_name
  aks_kubelet_object_id = module.aks.kubelet_identity_object_id
  pipeline_sp_object_id = var.pipeline_sp_object_id
  tags                  = local.common_tags
}

module "keyvault" {
  source                 = "./modules/keyvault"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  key_vault_name         = var.key_vault_name
  tenant_id              = data.azurerm_client_config.current.tenant_id
  terraform_object_id    = data.azurerm_client_config.current.object_id
  pipeline_sp_object_id  = var.pipeline_sp_object_id
  argocd_admin_password  = var.argocd_admin_password
  github_pat             = var.github_pat
  grafana_admin_password = var.grafana_admin_password
  api_key                = var.api_key
  allowed_origin         = var.allowed_origin
  tags                   = local.common_tags
}

module "aks" {
  source              = "./modules/aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  cluster_name        = var.cluster_name
  node_count          = var.node_count
  node_vm_size        = var.node_vm_size
  key_vault_id        = module.keyvault.key_vault_id
  tags                = local.common_tags
}

module "agent" {
  source               = "./modules/agent"
  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  admin_username       = var.agent_admin_username
  admin_ssh_public_key = var.agent_admin_ssh_public_key
  azdo_org_url         = var.azdo_org_url
  azdo_pat             = var.azdo_pat
  azdo_pool_name       = var.azdo_pool_name
  tags                 = local.common_tags
}

module "bootstrap" {
  source = "./modules/bootstrap"

  depends_on = [module.aks]

  providers = {
    kubernetes = kubernetes
    helm       = helm
    kubectl    = kubectl
  }

  argocd_admin_password  = var.argocd_admin_password
  grafana_admin_password = var.grafana_admin_password
  github_repo_url        = var.github_repo_url
  github_pat             = var.github_pat
  api_key                = var.api_key
  allowed_origin         = var.allowed_origin
}
