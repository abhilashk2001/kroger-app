# ADR-0007 — Single production image + one-time Azure deploy

Status: Accepted

## Context

Local dev runs three containers (db, API dev server, Vite dev server). Production needs an
internet-accessible deployment, and the project's delivery model is a one-time
**deploy → screenshot → tear down** proof on Azure free/student tiers — not always-on.

## Decision

- Build a **single multi-stage production image**: the React app is built and **Express
  serves it same-origin**, with database migrations run on container boot. The browser uses
  relative `/api/*` URLs in both dev and prod.
- Deploy to **Azure App Service for Containers** + **Azure Database for PostgreSQL**, all
  in **one resource group**, via `infra/azure/deploy.sh`; tear down with a single
  `az group delete`.

## Rationale

- One image = one deployable unit (no separate frontend host, no CORS, no build-time API
  URL). App Service is the canonical "web server in Azure" the assignment names and gives a
  managed HTTPS URL.
- One resource group makes teardown atomic, so the short-lived proof can't leave billable
  resources behind.

## Consequences

- The image is built locally and pushed (ACR Tasks are blocked on student subscriptions),
  cross-built for `linux/amd64`; the web stage builds on the native `$BUILDPLATFORM` to
  dodge the npm/rollup cross-arch bug.
- Student subscriptions restrict regions and Postgres availability — documented in
  `docs/deploy/azure.md`; the live proof ran in `centralus`.
- The API runs via `tsx` in the image (no ahead-of-time JS compile) — a conscious
  simplification, noted as a future hardening step.
