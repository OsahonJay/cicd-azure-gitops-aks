output "aks_cluster_name" {
  description = "Name of the AKS cluster."
  value       = module.aks.cluster_name
}

output "aks_resource_group" {
  description = "Resource group containing the AKS cluster."
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server (used in pipeline variables)."
  value       = module.acr.login_server
}

output "key_vault_uri" {
  description = "Key Vault URI (used by AzureKeyVault@2 task in pipelines)."
  value       = module.keyvault.key_vault_uri
}

output "agent_public_ip" {
  description = "Public IP of the self-hosted Azure DevOps agent VM."
  value       = module.agent.public_ip
}

output "get_credentials_command" {
  description = "Run this to fetch AKS kubeconfig locally."
  value       = "az aks get-credentials --resource-group ${azurerm_resource_group.main.name} --name ${module.aks.cluster_name}"
}
