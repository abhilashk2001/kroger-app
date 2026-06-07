# PRD — Phase 7b: Churn Prediction (ML)

Status: ready-for-agent
Depends on: Phase 7a (shared `ml/` scaffolding, DB helpers, Compose `ml` profile).

## Problem Statement

Assignment requirement #7 asks: "which customers are at risk of disengaging, and how
can retention strategies address this?" — supported by regression, correlation, and/or
graphical results. We want a per-household **churn risk score** computed offline and
surfaced in the app, so a user can see which households are most likely to disengage and
why. This reuses the offline-Python-to-DB pattern established in Phase 7a; no live Python
runs at request time.

## Solution

A new `ml/churn.py` script that reads the loaded transactions, frames a supervised churn
problem over the dataset's two-year window, engineers per-household features (recency,
frequency, monetary, tenure, and a recent-vs-earlier trend), trains a classifier, and
writes a per-household churn probability and the headline drivers into a
`household_churn` table. The Express API gains a `churn` module serving the ranked
at-risk households and a risk-distribution summary; the web app shows a churn view (a
ranked at-risk list plus a small distribution chart), and the household search surfaces a
household's own risk score.

## User Stories

1. As a retention analyst, I want each household scored 0–1 for churn risk, so that I can prioritize outreach.
2. As an analyst, I want the at-risk households ranked, so that I can act on the worst first.
3. As an analyst, I want to see the overall risk distribution, so that I understand how widespread disengagement is.
4. As an analyst, I want the main features that drove the model (e.g., recency), so that retention strategies can target the right behavior.
5. As a user, I want a household's churn score shown on its data pull, so that risk is visible in context.
6. As a developer, I want churn computed offline and stored, so that the runtime stays a pure TypeScript API.
7. As a developer, I want a clear, reproducible churn label definition, so that the model's target is defensible.
8. As a developer, I want re-running the script to replace prior scores (truncate-and-reload), so that runs are idempotent.
9. As a developer, I want the label and feature logic unit-tested, so that the target definition is trustworthy.

## Implementation Decisions

### Churn framing (the key modeling decision)

- **Observation vs outcome split:** define a cutoff near the end of the data window
  (e.g., the last 90 days). Features are computed only from transactions **before** the
  cutoff; the **label** is whether a household made any purchase **in** the final window.
  A household active before the cutoff but absent after is `churned = 1`.
- **Population:** households with at least one pre-cutoff purchase (so every row has
  features). Households active only in the final window are excluded from training.
- This is a clean, leak-free supervised setup and is easy to explain in the writeup.

### Features (per household, pre-cutoff)

- **Recency:** days since the household's last pre-cutoff purchase.
- **Frequency:** number of distinct baskets (shopping trips).
- **Monetary:** total and average spend.
- **Tenure:** days between first and last pre-cutoff purchase.
- **Trend:** spend in the most recent pre-cutoff window vs the earlier period (a decline
  signal). Plus loyalty flag and basic demographics where present.

### Model

- **Classifier:** `GradientBoostingClassifier` (consistent with Phase 7a; the assignment
  explicitly allows regression/RF/GBM here). Report accuracy and ROC-AUC on a held-out
  split; extract feature importances for the "why."
- **Output:** predict churn probability for **all** scored households. Write to
  `household_churn`: `hshdNum`, `churnProbability Float`, `riskBand` (Low/Medium/High by
  threshold), and a run-level set of `topDrivers`. Truncate-and-reload per run.
- A simple correlation/graphical artifact (feature vs churn) is produced to satisfy the
  "regression, correlation, graphical results" phrasing — saved under `ml/reports/`.

### Schema (Prisma-owned)

- New migration adding `HouseholdChurn`: `hshdNum Int @id`, `churnProbability Float`,
  `riskBand String`, `createdAt`, with a relation/FK to `Household`. (Drivers can be a
  separate one-row `ChurnModelMetric`, mirroring `BasketModelMetric`, holding accuracy,
  rocAuc, and `topDrivers String[]`.)

### API + Web

- **API:** a `churn` module (controller -> service -> repository) under `/api/churn`,
  protected by `requireAuth`:
  - `GET /api/churn/at-risk?limit=` -> households ranked by churn probability desc.
  - `GET /api/churn/summary` -> counts per risk band + model accuracy/ROC-AUC/top drivers.
  - The household pull response gains the household's `churnProbability`/`riskBand` when
    present (joined from `household_churn`).
- **Web:** a "Churn" tab — a ranked at-risk table and a small bar/donut of the risk-band
  distribution, plus the model's accuracy/ROC-AUC and top drivers. The household search
  view shows a risk badge for the looked-up household.

## Testing Decisions

- **Python unit tests** (pytest, `ml` container): the label function (given synthetic
  per-household purchase dates and a cutoff, the churned flag is correct) and a couple of
  feature calculations (recency, frequency) — verified without a DB or model fit.
- **API integration tests** (HTTP seam, test DB): seed `household_churn` (and
  `ChurnModelMetric`) rows via Prisma; assert `GET /api/churn/at-risk` returns them
  ranked by probability and honors `limit`; `GET /api/churn/summary` returns band counts
  and model metrics; the household pull includes the risk fields when a score exists and
  omits/normalizes them when it does not; all require auth (401 without a token).
- Model quality is validated by running against the sample and sanity-checking (e.g.,
  recency is the dominant driver, AUC clearly above 0.5), not asserted in CI.

## Out of Scope

- Basket analysis — Phase 7a.
- Automated retraining, drift monitoring, or a model registry (run on demand).
- Survival analysis / time-to-churn (a binary risk score is sufficient for the
  requirement); causal claims about retention levers.
- Acting on the scores (campaign tooling) — we surface risk, not outreach.

## Further Notes

- The cutoff-window label is the standard, defensible way to manufacture a churn target
  from transaction logs without an explicit "canceled" event; the window length is a
  tunable noted in the script.
- Reusing Phase 7a's `db.py`, Compose `ml` profile, and `*_model_metric` table shape
  keeps the two ML deliverables consistent and the diff for this phase small.
- Showing recency/frequency/trend as drivers connects the model back to concrete
  retention strategies (e.g., win-back offers for high-recency households), which is what
  the requirement asks for.
