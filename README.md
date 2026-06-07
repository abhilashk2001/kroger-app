# Kroger Retail Analytics

A backend-focused retail analytics application built on the 84.51°/Kroger
"Complete Journey" dataset (household demographics, products, and ~2 years of
transactions). It demonstrates end-to-end engineering: a layered TypeScript API,
a PostgreSQL data model, a React dashboard, and offline machine learning for
basket analysis and churn prediction.

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| API      | Node.js · Express · TypeScript (layered)     |
| Database | PostgreSQL · Prisma ORM                      |
| Web      | React · Vite                                 |
| ML       | Python · scikit-learn (offline, results → DB)|
| Dev/Infra| Docker Compose · Azure (one-time deploy)     |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

That's it — Node, Postgres, and Python all run inside containers. Nothing else
to install.

## Quick start

```bash
# 1. Create your local env file from the template
cp .env.example .env

# 2. Build and start the whole stack (database + API + web)
docker compose up --build
```

Then open:

- **Web app:** http://localhost:5173 — shows a live frontend → API → database health check
- **API health:** http://localhost:3000/api/health — returns JSON status

Stop everything with `Ctrl+C`, or `docker compose down` (the database data
persists in a Docker volume).

## Project structure

```
.
├── apps/
│   ├── api/                 # Express + TypeScript API
│   │   ├── src/
│   │   │   ├── core/        # config + shared Prisma client
│   │   │   ├── modules/     # features, each: controller -> service -> repository
│   │   │   ├── app.ts       # builds the Express app (imported by tests)
│   │   │   └── server.ts    # starts the HTTP listener
│   │   ├── prisma/          # Prisma schema + migrations
│   │   └── tests/           # integration tests (high-seam, via HTTP)
│   └── web/                 # React + Vite frontend
├── docs/                    # agent config + design docs
├── .scratch/                # per-phase PRDs (the planning trail)
├── docker-compose.yml       # one-command local environment
└── .env.example             # configuration template
```

The API follows a strict **layered architecture**: controllers handle HTTP only,
services hold business logic, and repositories own all database access.

## Running the API tests

```bash
docker compose exec api npm test
```

## Cloud deployment (one-time proof)

The app deploys to Azure as a one-time **deploy → screenshot → tear down** proof, not
an always-on service. A single production image (Express serving the React build) runs
on Azure App Service for Containers against Azure Database for PostgreSQL, all in one
resource group. Scripts: `infra/azure/deploy.sh` and `infra/azure/teardown.sh`. Full
walkthrough: [docs/deploy/azure.md](docs/deploy/azure.md).

Smoke-test the production image locally first:

```bash
docker compose -f docker-compose.prod.yml up --build   # http://localhost:8080
```

## Development notes

- Source folders are bind-mounted into the containers, so edits hot-reload
  automatically (no rebuild needed for code changes).
- The web dev server proxies `/api/*` to the API container, so the browser makes
  same-origin requests (no CORS) — identical to how production serves them.
