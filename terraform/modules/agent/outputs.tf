output "public_ip" {
  description = "Public IP of the self-hosted Azure DevOps agent VM."
  value       = azurerm_public_ip.agent.ip_address
}

output "vm_id" {
  value = azurerm_linux_virtual_machine.agent.id
}
