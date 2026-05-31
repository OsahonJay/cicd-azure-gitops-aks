output "key_vault_id" {
  value = azurerm_key_vault.main.id
}

output "key_vault_uri" {
  description = "Vault URI — matches KEY_VAULT_NAME usage in cd-pipeline.yml AzureKeyVault@2 tasks."
  value       = azurerm_key_vault.main.vault_uri
}
