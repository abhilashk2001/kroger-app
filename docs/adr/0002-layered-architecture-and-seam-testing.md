# ADR-0002 — Layered architecture + HTTP-seam integration testing

Status: Accepted

## Context

The API needs a structure that stays clean as features accrue, and a testing approach that
gives real confidence without becoming brittle.

## Decision

- Every feature is a module with a strict **controller → service → repository** layering:
  controllers do HTTP only, services hold business logic, repositories own all DB access.
- Tests are **integration tests at the HTTP seam**: they drive the app over real HTTP
  (supertest) against a dedicated **test database**, asserting on status codes and
  response bodies.

## Rationale

- The layering keeps HTTP concerns, business rules, and persistence separable and
  individually readable — and makes the dependency direction obvious.
- Testing at the seam verifies **external behavior** (what a client observes), so tests
  survive internal refactors and exercise the real wiring (routing, auth middleware,
  validation, Prisma) end to end. Pure functions with real risk (the ETL cleaners) are
  additionally unit-tested.

## Consequences

- High confidence per test; the suite (49 tests) runs serially against `kroger_test`.
- Slightly slower than pure unit tests, and needs a database in CI/local — an acceptable
  trade for realism.
