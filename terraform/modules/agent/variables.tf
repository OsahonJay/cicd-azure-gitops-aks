variable "resource_group_name"  { type = string }
variable "location"             { type = string }
variable "admin_username"       { type = string }
variable "admin_ssh_public_key" { type = string }
variable "azdo_org_url"         { type = string }
variable "azdo_pool_name"       { type = string }

variable "azdo_pat" {
  type      = string
  sensitive = true
}

variable "ssh_source_cidr" {
  description = "CIDR allowed to SSH into the agent VM. Restrict to your IP in production."
  type        = string
  default     = "*"
}

variable "tags" {
  type    = map(string)
  default = {}
}
