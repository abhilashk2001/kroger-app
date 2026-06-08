# PRD — Phase 9: Polish

Status: ready-for-agent

## Problem Statement

The build is done (Phases 1–8: layered API, auth, search, upload, dashboard, two ML
models, and a verified one-time Azure deploy). But the repo still *reads* like an early
skeleton: the README describes a Phase-1 "health check" demo rather than the five-feature
analytics app that exists, the deployment screenshots aren't committed, the assignment
requirements aren't mapped to what was built, and the key engineering decisions + honest
caveats live only in per-phase PRDs and this session's history. For a resume project, the
repo *is* the deliverable — a reviewer landing on it cold should immediately grasp what it
is, what it demonstrates, and the judgment behind it.

## Solution

A documentation-and-presentation pass (no behavior changes): rewrite the README as the
front door, commit and embed the deployment screenshots, capture the cross-cutting
decisions as short ADRs and the dataset vocabulary as a `CONTEXT.md` glossary (the repo's
own documented conventions), and state the honest caveats plainly. Finish with a final
green-tests + clean-tree verification so the repo is presentable end to end.

## User Stories

1. As a reviewer, I want the README to tell me what the project is and what it demonstrates within the first screen, so that I can judge it quickly.
2. As a reviewer, I want to see the app working (screenshots), so that I trust it runs without standing it up myself.
3. As a grader, I want each assignment requirement mapped to where it is satisfied, so that completeness is obvious.
4. As a reviewer, I want the key engineering decisions and their trade-offs recorded, so that I can see the reasoning, not just the result.
5. As a reviewer, I want the project's known limitations stated honestly (destructive upload, the recency-driven churn framing), so that I read it as mature engineering, not overclaiming.
6. As a newcomer, I want a glossary of the dataset/domain terms, so that "commodity", "lift", "RFM", and "HSHD_NUM" are unambiguous.
7. As a maintainer, I want one command each to run the app, the tests, the ML jobs, and the deploy, so that everything is discoverable from the README.
8. As the author, I want the test suite green and the working tree clean at the end, so that the repo is in a finished state.

## Implementation Decisions

- **README rewrite** (the centerpiece), structured as:
  - One-paragraph what-it-is + "what this demonstrates" (backend, data, cloud, ML).
  - A **feature tour** of the five tabs (Search, Load Data, Dashboard, Basket Analysis,
    Churn) with embedded screenshots.
  - **Architecture**: the layered API (controller → service → repository), the
    offline-ML-to-DB pattern, and the single-image production build.
  - **Assignment requirements → implementation** mapping table (the 8 brief requirements).
  - **Engineering decisions & trade-offs** (brief, linking to ADRs).
  - **Honest limitations** section.
  - Run/test/ML/deploy commands (consolidated, corrected to current reality — the app is
    a full analytics UI, not a health-check demo).
- **Screenshots:** commit the captured images under `docs/deploy/screenshots/`, give them
  clear names, and embed the most representative ones in the README and the deploy doc.
- **ADRs** under `docs/adr/` (short, one decision each), capturing decisions already made
  and reasoned across the phases:
  - Express over NestJS; polyglot (offline Python ML) over Python-only.
  - Layered architecture + HTTP-seam integration testing.
  - JWT over httpOnly session cookies (with the XSS/CSRF trade-off); bcrypt over argon2id.
  - Commodity-level association rules + the GBM co-purchase model for basket analysis.
  - Cutoff-window churn label (and why the high AUC is recency-driven).
  - Single production image (Express serves React) + one-time Azure deploy model.
- **`CONTEXT.md` glossary:** the domain/dataset vocabulary (household/HSHD_NUM, basket,
  commodity vs product, brand type, loyalty, spend, lift/support/confidence, RFM, churn,
  risk band), using the exact terms the code and UI use.
- **Caveats stated where they live:** destructive truncate-and-reload upload (README +
  near the Load Data description), and the recency-driven churn framing (README + the
  churn ADR).
- **Loose ends:** ensure `.DS_Store` is ignored (it is); note the API-runs-via-tsx
  (no ahead-of-time compile) as a conscious, documented trade-off rather than changing it.

## Testing Decisions

- This phase changes documentation, not behavior, so the bar is **no regressions**: the
  full API suite (49 tests) still passes and the app still boots via `docker compose up`.
- Final check: `git status` clean (screenshots committed, no stray tracked artifacts) and
  a top-to-bottom read of the README against the actual commands to confirm they work.

## Out of Scope

- Any feature or behavior change (this is presentation only).
- Compiling the API to JavaScript, adding CI, or a license/contribution policy unless the
  author wants them (notable as possible follow-ups, not done here).
- Re-deploying to Azure (the one-time proof is complete and torn down).

## Further Notes

- The repo's own `docs/agents/domain.md` defines the `CONTEXT.md` + `docs/adr/` convention;
  Phase 9 is the natural point to populate them, now that the decisions are settled.
- ADRs are written from decisions already reasoned in the per-phase PRDs under `.scratch/`,
  so they document history rather than inventing new rationale.
- The honest-limitations section is deliberate: for a resume project, naming the
  trade-offs is a stronger signal than pretending there are none.
