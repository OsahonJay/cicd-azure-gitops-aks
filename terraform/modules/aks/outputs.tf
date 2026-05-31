output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "kubelet_identity_object_id" {
  description = "Object ID of the kubelet managed identity — used for AcrPull role assignment."
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "kube_config" {
  description = "Raw kube_config block — consumed by helm, kubernetes, and kubectl providers."
  value       = azurerm_kubernetes_cluster.main.kube_config[0]
  sensitive   = true
}
