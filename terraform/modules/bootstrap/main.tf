resource "kubernetes_namespace" "ingress_nginx" {
  metadata {
    name   = "ingress-nginx"
    labels = { "kubernetes.io/metadata.name" = "ingress-nginx" }
  }
}

resource "kubernetes_namespace" "cert_manager" {
  metadata {
    name = "cert-manager"
  }
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name   = "monitoring"
    labels = { "kubernetes.io/metadata.name" = "monitoring" }
  }
}

resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
  }
}

resource "kubernetes_namespace" "microservices" {
  metadata {
    name   = "microservices"
    labels = { "kubernetes.io/metadata.name" = "microservices" }
  }
}

resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  namespace  = kubernetes_namespace.ingress_nginx.metadata[0].name
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.10.1"

  set {
    name  = "controller.replicaCount"
    value = "2"
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = "v1.15.0"

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "61.2.0"

  values = [file("${path.root}/../../k8s/monitoring/helm-values.yaml")]

  set_sensitive {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "7.4.4"

  set_sensitive {
    name  = "configs.secret.argocdServerAdminPassword"
    value = bcrypt(var.argocd_admin_password)
  }

  set {
    name  = "server.insecure"
    value = "false"
  }

  set {
    name  = "server.service.type"
    value = "LoadBalancer"
  }
}

resource "kubernetes_secret" "argocd_github_repo" {
  metadata {
    name      = "github-repo-creds"
    namespace = kubernetes_namespace.argocd.metadata[0].name
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type     = "git"
    url      = var.github_repo_url
    username = "git"
    password = var.github_pat
  }

  depends_on = [helm_release.argocd]
}

resource "kubernetes_secret" "api_key" {
  metadata {
    name      = "api-key-secret"
    namespace = kubernetes_namespace.microservices.metadata[0].name
  }
  type = "Opaque"
  data = {
    "api-key"        = var.api_key
    "allowed-origin" = var.allowed_origin
  }
  depends_on = [kubernetes_namespace.microservices]
}

resource "kubectl_manifest" "cert_issuers" {
  yaml_body  = file("${path.root}/../../k8s/bootstrap/cert-issuers.yaml")
  depends_on = [helm_release.cert_manager]
}

resource "kubectl_manifest" "argocd_appproject" {
  yaml_body  = file("${path.root}/../../k8s/bootstrap/appproject.yaml")
  depends_on = [helm_release.argocd]
}

resource "kubectl_manifest" "argocd_application" {
  yaml_body  = file("${path.root}/../../argocd/application.yaml")
  depends_on = [kubectl_manifest.argocd_appproject]
}
