#!/usr/bin/env bash
#
# Tear down everything from the deploy by deleting the whole resource group.
# This is the one command that guarantees nothing is left running to accrue cost.
#
#     bash infra/azure/teardown.sh
#     RG=rg-kroger bash infra/azure/teardown.sh   # if you used a custom group
set -euo pipefail

RG="${RG:-rg-kroger}"

command -v az >/dev/null || { echo "ERROR: az CLI not found."; exit 1; }
az account show >/dev/null 2>&1 || { echo "ERROR: not logged in. Run 'az login'."; exit 1; }

if ! az group show --name "$RG" >/dev/null 2>&1; then
  echo "Resource group '$RG' not found — nothing to tear down."
  exit 0
fi

echo "Deleting resource group '$RG' and ALL resources in it..."
az group delete --name "$RG" --yes --no-wait
echo "Deletion started (running in the background)."
echo "Verify with:  az group list -o table"
