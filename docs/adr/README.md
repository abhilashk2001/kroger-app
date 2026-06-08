# Architecture Decision Records

Short records of the cross-cutting decisions behind this project — the reasoning and
trade-offs, not just the result. Each was settled during the build (see the per-phase PRDs
under `.scratch/`).

- [ADR-0001](0001-express-and-polyglot-ml.md) — Express + TypeScript API, with offline Python ML (polyglot)
- [ADR-0002](0002-layered-architecture-and-seam-testing.md) — Layered architecture + HTTP-seam integration testing
- [ADR-0003](0003-jwt-auth-and-bcrypt.md) — JWT auth and bcrypt password hashing
- [ADR-0004](0004-offline-ml-precomputed-to-db.md) — Offline ML precomputed into the database
- [ADR-0005](0005-basket-analysis-rules-plus-gbm.md) — Basket analysis: association rules + a Gradient Boosting model
- [ADR-0006](0006-churn-cutoff-window-label.md) — Churn label: cutoff-window framing
- [ADR-0007](0007-single-production-image-and-azure-deploy.md) — Single production image + one-time Azure deploy
