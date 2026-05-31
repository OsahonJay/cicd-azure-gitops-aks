#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="rg-gitops-project"
CLUSTER_NAME="aks-gitops-cluster"
LOCATION="uksouth"
ACTION_GROUP_NAME="ag-gitops-alerts"

ALERT_EMAIL="${ALERT_EMAIL:-}"
if [[ -z "$ALERT_EMAIL" ]]; then
  read -rp "Enter email address for alert notifications: " ALERT_EMAIL
fi

echo ""
echo "=== Azure Monitor Alert Setup ==="
echo "Resource Group : $RESOURCE_GROUP"
echo "Cluster        : $CLUSTER_NAME"
echo "Alert Email    : $ALERT_EMAIL"
echo ""

echo "[1/8] Fetching resource IDs..."

AKS_RESOURCE_ID=$(az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --query id -o tsv)

LOG_ANALYTICS_WS_ID=$(az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --query addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID \
  -o tsv)

echo "  AKS ID              : $AKS_RESOURCE_ID"
echo "  Log Analytics WS ID : $LOG_ANALYTICS_WS_ID"

echo ""
echo "[2/8] Creating action group: $ACTION_GROUP_NAME"

az monitor action-group create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACTION_GROUP_NAME" \
  --short-name "GitOpsAlrt" \
  --action email "team-alert" "$ALERT_EMAIL" \
  --output none

ACTION_GROUP_ID=$(az monitor action-group show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACTION_GROUP_NAME" \
  --query id -o tsv)

echo "  Action group created: $ACTION_GROUP_ID"

echo ""
echo "[3/8] Creating alert: Pod Restart Count"

az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "alert-pod-restart-high" \
  --description "Pod restarted more than 3 times in 5 minutes — possible CrashLoopBackOff" \
  --resource "$AKS_RESOURCE_ID" \
  --metric "restartingContainerCount" \
  --namespace "Insights.Container/pods" \
  --aggregation "Average" \
  --condition "avg restartingContainerCount > 3" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Created: alert-pod-restart-high"

echo ""
echo "[4/8] Creating alert: Node CPU > 80%"

az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "alert-node-cpu-high" \
  --description "Node CPU usage exceeded 80% for 5 minutes — risk of pod throttling" \
  --resource "$AKS_RESOURCE_ID" \
  --metric "cpuUsagePercentage" \
  --namespace "Insights.Container/nodes" \
  --aggregation "Average" \
  --condition "avg cpuUsagePercentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Created: alert-node-cpu-high"

echo ""
echo "[5/8] Creating alert: Node Memory > 85%"

az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "alert-node-memory-high" \
  --description "Node memory usage exceeded 85% — risk of OOMKill terminating pods" \
  --resource "$AKS_RESOURCE_ID" \
  --metric "memoryWorkingSetPercentage" \
  --namespace "Insights.Container/nodes" \
  --aggregation "Average" \
  --condition "avg memoryWorkingSetPercentage > 85" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Created: alert-node-memory-high"

echo ""
echo "[6/8] Creating alert: Container CPU > 90% of limit"

az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "alert-container-cpu-limit" \
  --description "Container CPU exceeded 90% of its configured limit — performance degradation likely" \
  --resource "$AKS_RESOURCE_ID" \
  --metric "cpuThrottledPercentage" \
  --namespace "Insights.Container/containers" \
  --aggregation "Average" \
  --condition "avg cpuThrottledPercentage > 90" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Created: alert-container-cpu-limit"

echo ""
echo "[7/8] Creating alert: Container Memory > 90% of limit"

az monitor metrics alert create \
  --resource-group "$RESOURCE_GROUP" \
  --name "alert-container-memory-limit" \
  --description "Container memory exceeded 90% of its configured limit — OOMKill imminent" \
  --resource "$AKS_RESOURCE_ID" \
  --metric "memoryWorkingSetPercentage" \
  --namespace "Insights.Container/containers" \
  --aggregation "Average" \
  --condition "avg memoryWorkingSetPercentage > 90" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --output none

echo "  Created: alert-container-memory-limit"

echo ""
echo "[8/8] Creating alert: ArgoCD out-of-sync for > 10 minutes"

az monitor scheduled-query create \
  --resource-group "$RESOURCE_GROUP" \
  --name "alert-argocd-out-of-sync" \
  --description "ArgoCD microservices-app has been OutOfSync for more than 10 minutes" \
  --scopes "$LOG_ANALYTICS_WS_ID" \
  --condition-query "
    ContainerLog
    | where LogEntry contains \"OutOfSync\"
    and LogEntry contains \"microservices-app\"
    | where TimeGenerated > ago(10m)
    | summarize count()
  " \
  --condition "count > 2" \
  --window-duration PT10M \
  --evaluation-frequency PT5M \
  --severity 2 \
  --action-groups "$ACTION_GROUP_ID" \
  --output none

echo "  Created: alert-argocd-out-of-sync"

echo ""
echo "=== Alert Setup Complete ==="
echo ""
echo "6 alert rules created:"
echo "  alert-pod-restart-high       — Pod restarts > 3 in 5 min"
echo "  alert-node-cpu-high          — Node CPU > 80%"
echo "  alert-node-memory-high       — Node memory > 85%"
echo "  alert-container-cpu-limit    — Container CPU throttled > 90%"
echo "  alert-container-memory-limit — Container memory > 90% of limit"
echo "  alert-argocd-out-of-sync     — ArgoCD OutOfSync > 10 min"
echo ""
echo "Notifications will be sent to: $ALERT_EMAIL"
echo ""
echo "View alerts: Azure Portal → Monitor → Alerts"
