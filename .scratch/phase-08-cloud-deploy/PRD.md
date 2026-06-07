# PRD — Phase 8: Cloud Deploy (Azure)

Status: ready-for-agent

## Problem Statement

Assignment requirement #1 is to launch the app on an internet-accessible web server in
Azure. The project's delivery model is a **one-time deploy → screenshot → tear down**:
the durable deliverable is the repo (production image, deploy/teardown scripts, and
docs + screenshots), not an always-on hosted service. Today nothing is production-ready:
both Dockerfiles run dev servers, and Express does not serve the built React app, so
there is no single deployable unit.

## Solution

Two parts:

1. **Make the app production-ready (local, fully testable):** a multi-stage Docker image
   that builds the React app and bundles it into the API image, with Express serving the
   static build same-origin (so the browser keeps using relative `/api/*` calls, exactly
   as in dev). Database migrations run on container start. This image runs the whole app
   as one container and is verified locally before any cloud step.

2. **Deploy to Azure (scripted, user-driven):** push the image to Azure Container
   Registry, provision Azure Database for PostgreSQL (Flexible Server) and Azure App
   Service for Containers (Linux), all in one resource group. Seed data through the app's
   own Load Data page. Capture screenshots, then delete the resource group to tear down.

## User Stories

1. As a reviewer, I want the app reachable at a public Azure URL, so that requirement #1 is met.
2. As a reviewer, I want one HTTPS origin serving both the UI and the API, so that it behaves like a real deployment.
3. As the developer, I want a single image that runs the whole app, so that deployment is one unit, not three dev servers.
4. As the developer, I want migrations to run automatically on start, so that a fresh database is schema-ready without manual steps.
5. As the developer, I want to verify the production image locally before deploying, so that cloud debugging is minimized.
6. As the developer, I want one scripted command to provision everything and one to tear it all down, so that the proof is repeatable and cheap.
7. As the developer, I want to load the sample data through the deployed Load Data page, so that the live screenshots show real results.
8. As the developer, I want the steps, screenshot checklist, and cost/teardown notes documented, so that the deploy is reproducible and leaves no surprise bill.

## Implementation Decisions

### Production build (local)

- **Single multi-stage Dockerfile** (`apps/api/Dockerfile.prod` or repo-root
  `Dockerfile`): stage 1 builds the web app (`vite build` -> static assets); stage 2 is
  the Node runtime with the API source, production deps, generated Prisma client, and the
  web build copied in (e.g. to `/app/public`).
- **Express serves the build:** in production (`NODE_ENV=production`) the app serves the
  static directory and adds an SPA fallback for non-`/api` routes. API routes keep
  priority. Because the web already calls relative `/api/*`, no build-time API URL is
  needed — same-origin "just works".
- **Config:** `config.ts` gains `nodeEnv` and `staticDir`; no code outside config reads
  `process.env`.
- **Startup:** the container's command runs `prisma migrate deploy` and then starts the
  server, so a fresh database is migrated on first boot.
- **Port:** the app listens on `API_PORT`; App Service is told the port via
  `WEBSITES_PORT`.
- **Local verification:** a `docker-compose.prod.yml` (or documented `docker run`) runs
  the single prod image against a local Postgres; confirm login, search (HSHD 10),
  dashboard, and that deep links / refresh work (SPA fallback) and `/api/health` responds.

### Azure topology (one resource group: `rg-kroger`)

- **Azure Container Registry (Basic):** holds the image; App Service pulls from it.
- **Azure Database for PostgreSQL Flexible Server (Burstable B1ms):** the database, with
  SSL required (`?sslmode=require` in `DATABASE_URL`) and a firewall rule allowing Azure
  services (and, temporarily, the developer IP if seeding ML tables from local).
- **App Service (Linux, B1 plan) for Containers:** pulls the image, with app settings for
  `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_PORT`, `WEBSITES_PORT`,
  `NODE_ENV=production`. Provides the public HTTPS URL.
- **Scripts:** `infra/azure/deploy.sh` (provision + push + configure, parameterized, echos
  the final URL) and `infra/azure/teardown.sh` (`az group delete` — one command removes
  everything). Secrets (JWT, DB password) are generated/passed at run time, never
  committed.

### Data + screenshots

- **Seed via the app:** after deploy, register a user and upload the sample CSVs through
  the Load Data page (exercises the real upload path and makes a good screenshot).
- **ML tabs (optional):** to populate Basket/Churn for screenshots, run the ml jobs
  locally with `DATABASE_URL` pointed at the cloud DB (needs the temporary firewall rule).
- **Screenshot checklist** (saved under `docs/deploy/screenshots/`): Azure resource group;
  App Service overview (URL + running); the live app's auth page, a HSHD #10 pull, and the
  dashboard.

### Documentation

- `docs/deploy/azure.md`: prerequisites (install `az` CLI, `az login`), the exact deploy
  steps / script usage, the screenshot checklist, the **cost note** (B1 App Service +
  B1ms Postgres + ACR Basic is pennies for a short-lived proof — delete promptly), and the
  teardown command. README gains a short "Cloud deployment (one-time proof)" pointer.

## Testing Decisions

- The phase's verification is **running the production image locally** before the cloud:
  build the image, run it against a local Postgres, and confirm the UI is served, SPA
  routes survive refresh, `/api/health` is green, and a login + HSHD-10 pull works.
- The existing 49-test suite must still pass unchanged (no behavior regressions from the
  static-serving / config additions).
- The cloud deploy itself is validated manually (the screenshots are the evidence); it is
  not part of CI.

## Out of Scope

- Always-on hosting, custom domains, CI/CD pipelines, autoscaling, or zero-downtime
  deploys — this is a one-time proof.
- Managed secrets (Key Vault), private networking/VNet integration, or production
  hardening beyond SSL + generated secrets.
- Running the Python ML container in Azure as a service (ML stays offline; populating ML
  tables in the cloud is an optional local-run step).
- Compiling the API to JavaScript — running via `tsx` in the prod image is acceptable for
  the proof; an ahead-of-time build is a possible Phase 9 polish.

## Further Notes

- App Service for Containers was chosen over ACI because it is the canonical "web server
  in Azure" the assignment names, gives a managed HTTPS URL for a cleaner screenshot, and
  matches what the course teaches; the short-lived cost is negligible.
- One resource group is the key simplifier: teardown is a single `az group delete`, which
  guarantees nothing is left running to accrue cost.
- Keeping the web's API calls relative (already true) is what lets one origin serve both
  tiers with no environment-specific frontend build.
