# ADR-0001 — Express + TypeScript API, with offline Python ML (polyglot)

Status: Accepted

## Context

This is a backend-focused resume project on a retail dataset that also calls for machine
learning. Two framing choices had to be made up front: the API framework, and whether to
build a Python-only stack or a polyglot one.

## Decision

- Use **Express + TypeScript** for the API (not NestJS).
- Build a **polyglot** stack: the TypeScript API owns the runtime; **Python does the ML
  offline**, writing results into the database for the API to serve.

## Rationale

- **Express over NestJS:** Express is transparent — routing, middleware, and the layering
  are written explicitly rather than supplied by a framework's DI/decorators. For a
  learning/portfolio project that wants to *show* the architecture, that transparency is
  worth more than NestJS's conventions.
- **Polyglot over Python-only:** a TypeScript backend is the stronger backend-engineering
  signal for the roles this project targets, while Python remains the right tool for the
  ML. Keeping ML offline (see [ADR-0004](0004-offline-ml-precomputed-to-db.md)) means the
  two languages meet only at the database, not in a fragile request-time bridge.

## Consequences

- The layering and middleware are hand-written and visible (a plus for review).
- Two toolchains to maintain; mitigated by the clean offline-ML boundary.
- No framework-provided DI/validation; addressed with explicit modules and `zod`.
