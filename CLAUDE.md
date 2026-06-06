# Kroger Retail Analytics — Agent Guide

A backend-focused retail analytics project built on the 84.51°/Kroger "Complete
Journey" dataset. Stack: **Express + TypeScript** API, **React + Vite** web client,
**PostgreSQL** via **Prisma**, with **Python** for offline machine learning. Developed
as a resume project demonstrating software-engineering, cloud, and ML skills.

Local development runs entirely through Docker Compose. Cloud deployment targets Azure
free tiers as a one-time proof step (deploy → screenshot → tear down); the repo itself
is the durable deliverable.

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role strings, unchanged from the defaults. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
