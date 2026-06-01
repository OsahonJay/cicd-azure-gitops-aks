variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "cluster_name"        { type = string }
variable "node_count"          { type = number }
variable "node_vm_size"        { type = string }
variable "key_vault_id"        { type = string }

variable "tags" {
  type    = map(string)
  default = {}
}
