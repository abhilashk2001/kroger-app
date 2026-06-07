#!/usr/bin/env bash
#
# One-time Azure deploy of the Kroger app (App Service for Containers + Azure
# Database for PostgreSQL), all inside a single resource group so teardown is one
# command. Builds the image in Azure Container Registry (no local docker push),
# wires up the database, and prints the public URL.
#
# Prereqs: az CLI installed and `az login` done. Run from anywhere:
#     bash infra/azure/deploy.sh
#
# Override any default by exporting it first, e.g.:
#     LOCATION=westus2 RG=rg-kroger bash infra/azure/deploy.sh
#
# When finished (after screenshots): bash infra/azure/teardown.sh
set -euo pipefail

# ── Settings (override via environment) ──────────────────────────────────────
LOCATION="${LOCATION:-eastus}"
RG="${RG:-rg-kroger}"
SUFFIX="${SUFFIX:-$RANDOM}"                     # keeps globally-unique names unique
ACR_NAME="${ACR_NAME:-krogeracr${SUFFIX}}"      # 5-50 lowercase alphanumeric
PLAN_NAME="${PLAN_NAME:-kroger-plan}"
APP_NAME="${APP_NAME:-kroger-app-${SUFFIX}}"    # -> https://<APP_NAME>.azurewebsites.net
PG_NAME="${PG_NAME:-kroger-pg-${SUFFIX}}"
PG_ADMIN="${PG_ADMIN:-krogeradmin}"
DB_NAME="${DB_NAME:-kroger}"
IMAGE="kroger-app:latest"

# Generated secrets (URL-safe; printed once below). Override to reuse known values.
PG_PASSWORD="${PG_PASSWORD:-A$(openssl rand -hex 16)z7}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ── Sanity checks ────────────────────────────────────────────────────────────
command -v az >/dev/null || { echo "ERROR: az CLI not found. Install it first."; exit 1; }
az account show >/dev/null 2>&1 || { echo "ERROR: not logged in. Run 'az login'."; exit 1; }

echo "Deploying to resource group '$RG' in '$LOCATION' (suffix=$SUFFIX)..."

# ── Resource group ───────────────────────────────────────────────────────────
az group create --name "$RG" --location "$LOCATION" --output none

# ── Container registry + remote image build ──────────────────────────────────
echo "Creating ACR '$ACR_NAME' and building the image in Azure..."
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none
az acr build --registry "$ACR_NAME" --image "$IMAGE" --file "$REPO_ROOT/Dockerfile" "$REPO_ROOT"

ACR_USER="$(az acr credential show --name "$ACR_NAME" --query username -o tsv)"
ACR_PASS="$(az acr credential show --name "$ACR_NAME" --query 'passwords[0].value' -o tsv)"
ACR_SERVER="$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)"

# ── PostgreSQL Flexible Server ───────────────────────────────────────────────
echo "Creating PostgreSQL Flexible Server '$PG_NAME' (Burstable B1ms)..."
az postgres flexible-server create \
  --resource-group "$RG" --name "$PG_NAME" --location "$LOCATION" \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 --database-name "$DB_NAME" \
  --public-access 0.0.0.0 --yes --output none

DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASSWORD}@${PG_NAME}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

# ── App Service plan + Web App for Containers ────────────────────────────────
echo "Creating App Service plan + web app '$APP_NAME'..."
az appservice plan create --resource-group "$RG" --name "$PLAN_NAME" --is-linux --sku B1 --output none
az webapp create --resource-group "$RG" --plan "$PLAN_NAME" --name "$APP_NAME" \
  --deployment-container-image-name "${ACR_SERVER}/${IMAGE}" --output none

az webapp config container set --resource-group "$RG" --name "$APP_NAME" \
  --container-image-name "${ACR_SERVER}/${IMAGE}" \
  --container-registry-url "https://${ACR_SERVER}" \
  --container-registry-user "$ACR_USER" \
  --container-registry-password "$ACR_PASS" --output none

az webapp config appsettings set --resource-group "$RG" --name "$APP_NAME" --output none --settings \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  JWT_EXPIRES_IN="7d" \
  API_PORT="3000" \
  WEBSITES_PORT="3000" \
  NODE_ENV="production"

az webapp restart --resource-group "$RG" --name "$APP_NAME" --output none

# ── Summary ──────────────────────────────────────────────────────────────────
cat <<SUMMARY

────────────────────────────────────────────────────────────────────────
Deploy complete.

  App URL:        https://${APP_NAME}.azurewebsites.net
  Resource group: ${RG}
  Postgres host:  ${PG_NAME}.postgres.database.azure.com
  PG admin / pwd: ${PG_ADMIN} / ${PG_PASSWORD}
  JWT secret:     ${JWT_SECRET}

Notes:
  - First load may take a minute (container pull + migrate deploy on boot).
  - Seed data by registering a user in the app and uploading the sample CSVs
    on the Load Data tab.
  - To populate the Basket/Churn tabs, add your IP to the Postgres firewall and
    run the ml jobs locally with DATABASE_URL pointed at the cloud server.

When done (after screenshots), tear everything down:
    RG=${RG} bash infra/azure/teardown.sh
────────────────────────────────────────────────────────────────────────
SUMMARY
