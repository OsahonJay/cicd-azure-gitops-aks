resource "azurerm_virtual_network" "agent" {
  name                = "vnet-devops-agent"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.10.0.0/24"]
}

resource "azurerm_subnet" "agent" {
  name                 = "snet-agent"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.agent.name
  address_prefixes     = ["10.10.0.0/24"]
}

resource "azurerm_network_security_group" "agent" {
  name                = "nsg-devops-agent"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "AllowSSHInbound"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.ssh_source_cidr
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "agent" {
  subnet_id                 = azurerm_subnet.agent.id
  network_security_group_id = azurerm_network_security_group.agent.id
}

resource "azurerm_public_ip" "agent" {
  name                = "pip-devops-agent"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "agent" {
  name                = "nic-devops-agent"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.agent.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.agent.id
  }
}

resource "azurerm_linux_virtual_machine" "agent" {
  name                            = "vm-devops-agent"
  location                        = var.location
  resource_group_name             = var.resource_group_name
  size                            = "Standard_D2ps_v6"
  admin_username                  = var.admin_username
  disable_password_authentication = true

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_public_key
  }

  network_interface_ids = [azurerm_network_interface.agent.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-arm64"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/cloud-init.yaml.tpl", {
    azdo_org_url   = var.azdo_org_url
    azdo_pat       = var.azdo_pat
    azdo_pool_name = var.azdo_pool_name
    admin_username = var.admin_username
  }))

  tags = merge(var.tags, { role = "devops-agent" })
}
