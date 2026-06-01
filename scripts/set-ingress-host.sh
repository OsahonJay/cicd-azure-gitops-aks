#!/usr/bin/env bash
set -euo pipefail

INGRESS_IP="${1:-}"
if [[ -z "$INGRESS_IP" ]]; then
  echo "[INFO] No IP passed — fetching from cluster..."
  INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
fi

if [[ -z "$INGRESS_IP" ]]; then
  echo "[ERROR] Could not determine Ingress IP. Pass it as an argument: $0 <IP>"
  exit 1
fi

INGRESS_HOST="${INGRESS_IP//./-}.nip.io"
MANIFEST="k8s/ingress/ingress.yaml"

echo "[INFO] Setting Ingress host to: $INGRESS_HOST"
sed -i.bak "s|INGRESS_HOST|${INGRESS_HOST}|g" "$MANIFEST"
rm -f "${MANIFEST}.bak"

echo "[INFO] Updated $MANIFEST"
grep "host:" "$MANIFEST"

echo ""
echo "Access the application at: https://${INGRESS_HOST}"
echo "API key required for mutating operations (POST/PUT/DELETE)."
echo "GET endpoints are open. Health checks: https://${INGRESS_HOST}/health (per service)"
