# Azure deployment (one-time proof)

This project's cloud story is a **one-time deploy → screenshot → tear down**, not an
always-on service. The durable deliverable is this repo — the production image, the
scripts below, and the screenshots you capture. Everything lives in a single resource
group so teardown is one command and nothing is left to accrue cost.

## Architecture

```
Resource group: rg-kroger
├── Azure Container Registry (Basic)        # holds the image (built in Azure)
├── Azure Database for PostgreSQL (B1ms)    # the database, SSL required
└── App Service (Linux, B1) for Containers  # pulls the image -> public HTTPS URL
        └── kroger-app image: Express serves the React build + the API (same origin)
```

The whole app runs as **one container** (built by `Dockerfile` at the repo root):
the React app is built and served by Express, which also exposes `/api/*`. Database
migrations run automatically on container boot.

## Prerequisites

- **Azure CLI** — already at `az version` ≥ 2.x on this machine.
- **An Azure subscription** (e.g. a student/course account).
- **Log in** (interactive — run it yourself):

  ```bash
  az login
  ```

## Try it locally first (optional, free)

Smoke-test the exact production image before going to the cloud:

```bash
docker compose -f docker-compose.prod.yml up --build
# open http://localhost:8080  (register, then upload the sample CSVs on Load Data)
docker compose -f docker-compose.prod.yml down -v
```

## Deploy

```bash
bash infra/azure/deploy.sh
```

This provisions the registry, builds the image in Azure (`az acr build` — no local
push), creates the Postgres server and the web app, wires the connection string and a
generated JWT secret, and prints the **public URL** plus the generated secrets (note
them down). Provisioning takes roughly 5–10 minutes, mostly the database.

Override defaults via environment variables if needed, e.g.:

```bash
LOCATION=westus2 RG=rg-kroger bash infra/azure/deploy.sh
```

## Seed data + capture screenshots

1. Open the printed `https://<app>.azurewebsites.net` (first load can take a minute
   while the container pulls and runs migrations).
2. **Register** a user, then on the **Load Data** tab upload the three sample CSVs from
   `data/sample/`. The Search and Dashboard tabs now reflect real data.
3. *(Optional)* To populate the **Basket Analysis** and **Churn** tabs, allow your IP
   on the Postgres firewall and run the ML jobs against the cloud database:

   ```bash
   az postgres flexible-server firewall-rule create --resource-group rg-kroger \
     --name <PG_NAME> --rule-name myip \
     --start-ip-address <your-ip> --end-ip-address <your-ip>

   # point the ml container at the cloud DB (use the URL the deploy script printed)
   POSTGRES_HOST=<PG_NAME>.postgres.database.azure.com ... # see ml/db.py env vars
   ```

   (For the core requirements, seeding via the Load Data page is sufficient.)

### Screenshot checklist (save under `docs/deploy/screenshots/`)

- Azure portal: the `rg-kroger` resource group showing the three resources.
- App Service overview: the URL and "Running" status.
- The live app: the auth page, a **HSHD #10** data pull, and the **Dashboard**.

## Tear down (do this when finished)

```bash
bash infra/azure/teardown.sh
```

Deletes the entire resource group (and everything in it). Verify with
`az group list -o table`.

## Student / free subscription notes

Azure for Students (and free) subscriptions impose restrictions that this setup already
works around — but they affect which region you can use:

- **Allowed regions only.** A policy (`sys.regionrestriction`) limits deployments to a
  curated region list. Check yours with:
  ```bash
  az policy assignment list --query "[?name=='sys.regionrestriction'].parameters" -o json
  ```
  Pass an allowed region as `LOCATION=...`. (`eastus` is commonly *not* allowed; the
  deploy was done in `centralus`.)
- **PostgreSQL availability.** A region can be allowed by policy yet still refuse Flexible
  Server provisioning (e.g. `eastus2`). Confirm B1ms is offered before deploying:
  ```bash
  az postgres flexible-server list-skus --location <region> \
    --query "[0].supportedServerEditions[?name=='Burstable'].supportedServerSkus[].name" -o tsv
  ```
- **ACR Tasks are blocked**, so the script builds the image locally and pushes it (needs
  Docker running) rather than using `az acr build`. The image is cross-built for
  `linux/amd64` so it runs on App Service from any host architecture.

## Cost note

App Service B1 + PostgreSQL B1ms + ACR Basic together cost on the order of a few US
cents per hour. Kept to the deploy-and-screenshot window and torn down promptly, the
total is negligible — but **always run teardown** so nothing lingers.
