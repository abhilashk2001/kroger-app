# ADR-0004 - Offline ML precomputed into the database

Status: Accepted

## Context

The project needs machine learning (basket analysis and churn), but the runtime is a
TypeScript API. The question is how Python ML and the TS runtime should relate.

## Decision

Run the ML **offline, on demand**, in its own Python container (behind a Docker Compose
`ml` profile so it never starts with `docker compose up`). Each job reads transactions from
Postgres, trains its model, and writes results into **Prisma-owned tables**
(`basket_rules`, `basket_model_metric`, `household_churn`, `churn_model_metric`). The API
only ever serves those precomputed rows.

## Rationale

- Keeps the **runtime a pure TypeScript service** - no live Python process, no
  request-time language bridge, fast responses.
- One source of truth for ingestion and results (the database); the CLI loader and the ML
  jobs share the same data path.
- Matches how this kind of analytics is done in practice: batch-train, serve precomputed
  scores/rules.

## Consequences

- Results are as fresh as the last job run (acceptable; re-running is one command).
- Prisma owns the schema; Python only inserts (array-ish fields are stored as
  comma-joined text, which `to_sql` writes reliably and the API splits back).
- Managed-Postgres connections need SSL - supported via `POSTGRES_SSLMODE`.
