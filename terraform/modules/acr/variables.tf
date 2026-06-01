variable "resource_group_name"   { type = string }
variable "location"              { type = string }
variable "acr_name"              { type = string }
variable "aks_kubelet_object_id" { type = string }
variable "pipeline_sp_object_id" { type = string }

variable "tags" {
  type    = map(string)
  default = {}
}
