# PRD — Phase 1: Project Foundation & Skeleton

Status: ready-for-agent

## Problem Statement

As a developer building a resume-grade, backend-focused retail analytics project, I
have a set of locked architectural decisions but no running scaffold. I need a
reproducible foundation that a recruiter can clone and start with a single command,
and that I can build every later feature on, so that the project demonstrates
professional structure from the first commit and each subsequent phase has a clean
home.

## Solution

A TypeScript monorepo containing an Express API and a React (Vite) web client, backed
by PostgreSQL, all orchestrated locally with Docker Compose. The API is organized in a
layered (controller → service → repository) structure with Prisma as the data-access
layer. Configuration is environment-driven, and a health-check endpoint proves the
API↔DB wiring end to end. No business features yet — this phase delivers a skeleton
that boots, connects, and is runnable by anyone with Docker.

## User Stories

1. As a recruiter, I want to clone the repo and run a single `docker compose up`, so that I can see the app running without installing Node, Postgres, or Python.
2. As a recruiter, I want to hit a health endpoint and get a clear OK + DB-connected response, so that I can verify the system actually works, not just that a server is up.
3. As the developer, I want a monorepo that cleanly separates the API and the web client, so that backend and frontend concerns don't bleed into each other.
4. As the developer, I want the API organized into controller / service / repository layers, so that routing, business logic, and data access are independently understandable and testable.
5. As the developer, I want Prisma initialized against Postgres, so that later phases add schema and queries with type safety.
6. As the developer, I want all secrets and connection settings read from environment variables, so that nothing sensitive is hardcoded and the same code runs locally and in the cloud.
7. As the developer, I want a documented `.env.example`, so that anyone can configure the project without guessing.
8. As the developer, I want TypeScript configured in strict mode across the API, so that type errors are caught at compile time.
9. As the developer, I want hot-reload in development for both the API and the web client, so that I iterate quickly.
10. As the developer, I want the React app to boot to a placeholder page that calls the API health endpoint, so that the frontend↔backend connection is proven early.
11. As a maintainer, I want a README section explaining exactly how to run the project, so that the run process is unambiguous.
12. As the developer, I want a `.gitignore` that excludes node_modules, build output, env files, and the large data files, so that the repo stays clean and the 128 MB transactions file is never committed.
13. As the developer, I want a conventional, self-explanatory folder layout, so that a reviewer can navigate the codebase in seconds.

## Implementation Decisions

- **Monorepo, two applications:** an `api` application (Express + TypeScript) and a
  `web` application (React + Vite), tied together with npm workspaces. Rationale: clean
  separation with one clone and one install.
- **Layered API:** request flow is controller → service → repository. Controllers
  handle HTTP only; services hold business logic; repositories own all Prisma calls.
  This boundary is established now, before any feature, so it is never retrofitted.
- **Prisma + PostgreSQL** as the persistence stack. The Prisma client is initialized in
  this phase, but the schema is intentionally minimal (a placeholder only); real tables
  arrive in Phase 2.
- **Docker Compose services:** a `db` (PostgreSQL) service with a named volume for
  persistence, an `api` service, and a `web` service. The compose file is the single
  entry point for local runs.
- **Configuration:** all connection strings, ports, and secrets via environment
  variables, with a committed `.env.example` and a git-ignored `.env`.
- **Health-check contract:** a single endpoint that returns service status plus the
  result of a trivial DB round-trip, so it proves API↔DB connectivity, not just API
  liveness.
- **TypeScript strict mode** across the API.
- **No domain features** (households, products, transactions, auth, dashboard, ML) land
  in this phase.

## Testing Decisions

- A good test here verifies **external behavior**: that the health endpoint returns a
  success status and reports the database as reachable — not how the controller is
  wired internally.
- The `api` application is the module under test. We add one integration-style test for
  the health endpoint that exercises the real (containerized) database connection,
  establishing the testing seam that later phases reuse.
- **Highest seam:** we test at the HTTP endpoint rather than by calling internal
  functions, so the tests survive refactors of the internals.
- Prior art: none yet — this is the first phase, so this test also serves as the
  template for later controller/service tests.

## Out of Scope

- The database schema and any real tables (Phase 2).
- Loading the CSV data, data cleaning, and the 128 MB transactions handling (Phase 2).
- Authentication and password hashing (Phase 4).
- Any retail/business endpoints — the household data pull and search (Phase 3).
- Dashboard and charts (Phase 6).
- Machine learning (Phase 7).
- Azure provisioning and deployment (Phase 8).

## Further Notes

- **Data reality discovered during planning** (informs Phase 2, recorded here so the
  skeleton anticipates it): the source CSVs are heavily whitespace-padded (headers
  included), use the literal string `null` for missing demographics, zero-pad their
  identifiers, store money as values like `.59`, and use Oracle-style `DD-MON-YY` dates.
  `400_transactions.csv` is ~128 MB — it must never be committed; Phase 2 will commit a
  trimmed sample for local runs and document where the full file lives.
- The skeleton's `.gitignore` must exclude the data files from the very first commit to
  prevent an accidental 128 MB commit.
