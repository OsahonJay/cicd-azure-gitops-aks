#cloud-config
package_update: true
package_upgrade: true

packages:
  - docker.io
  - curl
  - git
  - python3-pip
  - jq
  - unzip
  - apt-transport-https
  - ca-certificates
  - gnupg

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker ${admin_username}

  - curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl"
  - install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  - rm kubectl

  - curl -sL https://aka.ms/InstallAzureCLIDeb | bash

  - |
    TF_VERSION="1.9.3"
    curl -Lo /tmp/terraform.zip "https://releases.hashicorp.com/terraform/$${TF_VERSION}/terraform_$${TF_VERSION}_linux_arm64.zip"
    unzip -o /tmp/terraform.zip -d /usr/local/bin
    rm /tmp/terraform.zip

  - pip3 install checkov==3.2.0 semgrep==1.72.0

  - mkdir -p /home/${admin_username}/agent

  - |
    AZP_AGENT_VERSION=$(curl -s "https://api.github.com/repos/microsoft/azure-pipelines-agent/releases/latest" | jq -r '.tag_name' | sed 's/v//')
    curl -Lo /tmp/agent.tar.gz "https://vstsagentpackage.azureedge.net/agent/$${AZP_AGENT_VERSION}/vsts-agent-linux-arm64-$${AZP_AGENT_VERSION}.tar.gz"
    tar zxf /tmp/agent.tar.gz -C /home/${admin_username}/agent
    rm /tmp/agent.tar.gz

  - chown -R ${admin_username}:${admin_username} /home/${admin_username}/agent

  - |
    sudo -u ${admin_username} /home/${admin_username}/agent/config.sh \
      --unattended \
      --url "${azdo_org_url}" \
      --auth pat \
      --token "${azdo_pat}" \
      --pool "${azdo_pool_name}" \
      --agent "devops-agent-$(hostname)" \
      --acceptTeeEula

  - /home/${admin_username}/agent/svc.sh install ${admin_username}
  - /home/${admin_username}/agent/svc.sh start
