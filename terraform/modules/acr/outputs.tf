output "acr_id" {
  value = azurerm_container_registry.main.id
}

output "login_server" {
  description = "ACR login server — matches ACR_LOGIN_SERVER in ci-pipeline.yml."
  value       = azurerm_container_registry.main.login_server
}
