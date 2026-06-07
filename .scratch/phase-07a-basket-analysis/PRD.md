# PRD — Phase 7a: Basket Analysis (ML)

Status: ready-for-agent

## Problem Statement

Assignment requirement #6 asks us to perform **basket analysis** — "what are the
commonly purchased product combinations, and how can they drive cross-selling
opportunities?" — and names Linear Regression / Random Forest / Gradient Boosting as
the model options. Basket analysis is classically *association-rule mining*, which is
not in that list, so we do both: association rules for the genuine cross-sell insight,
and a Gradient Boosting co-purchase classifier to satisfy the named-model requirement.
This is also the phase that introduces the **offline Python ML** pillar promised in the
README: models train offline and write results into DB tables that the existing Express
API serves — there is no live Python service at runtime.

## Solution

A new `ml/` Python project, run on demand in its own container, that reads the loaded
transactions from Postgres and writes two result sets back into Prisma-owned tables:

1. **Association rules** (FP-Growth, at the **commodity** level — products are too
   sparse at 67k SKUs). Each rule is `antecedents -> consequents` with support,
   confidence, and lift. Stored in `basket_rules`.
2. **Gradient Boosting co-purchase model**: for a target commodity, predict whether a
   basket contains it from the other commodities present. Report accuracy and ROC-AUC,
   and the top feature importances (the commodities that most drive co-purchase). A
   compact summary row per target is stored in `basket_model_metric`.

The Express API gains a `basket` module that serves the top rules (and the model
summary); the web app gains a "Basket Analysis" view that lists the strongest cross-sell
rules and shows the model's evaluation.

## User Stories

1. As a merchandiser, I want to see which commodities are bought together, ranked by lift, so that I can plan cross-sell placement.
2. As a merchandiser, I want each rule to show support and confidence, so that I can judge how common and how reliable it is.
3. As a reviewer, I want a named ML model (Gradient Boosting) applied to co-purchase, so that the assignment's model requirement is met.
4. As a reviewer, I want the model's accuracy and ROC-AUC reported, so that its quality is quantified, not asserted.
5. As a user, I want a Basket Analysis page in the app, so that the insight is visible alongside the dashboard.
6. As a developer, I want models to run offline and persist results to the database, so that the runtime stays a pure TypeScript API with no Python dependency.
7. As a developer, I want each model run to replace its previous output (truncate-and-reload), so that re-running is idempotent.
8. As a developer, I want the API to serve precomputed rows only, so that requests are fast and never invoke Python.
9. As a developer, I want the rule-encoding logic unit-tested, so that the basket -> itemset transform is trustworthy.

## Implementation Decisions

### Shared ML scaffolding (established here, reused by Phase 7b)

- **Location:** a top-level `ml/` directory: `requirements.txt`, `Dockerfile`, a shared
  `db.py` (connection + loaders), `basket_analysis.py` (this phase), and later
  `churn.py` (Phase 7b).
- **Dependencies:** `pandas`, `scikit-learn`, `mlxtend` (FP-Growth + association rules),
  `SQLAlchemy` + `psycopg2-binary` (DB I/O). Pinned in `requirements.txt`.
- **Container:** a `python:3.12-slim`-based image. Added to `docker-compose.yml` as an
  `ml` service under a Compose **profile** (`profiles: ["ml"]`) so it does **not** start
  with `docker compose up`. It is run on demand:
  `docker compose run --rm ml python basket_analysis.py`.
- **DB connection:** `db.py` builds the connection from `POSTGRES_USER/PASSWORD/DB` and
  host `db` (avoiding Prisma's `?schema=public` query param). It exposes helpers to load
  transactions joined to products/households into a pandas DataFrame, and to write a
  DataFrame to a table (truncate-then-insert) inside a transaction.

### Schema (Prisma-owned)

- New migration adding two tables, with camelCase models mapping to snake_case:
  - `BasketRule`: `id`, `antecedents String[]`, `consequents String[]`,
    `support Float`, `confidence Float`, `lift Float`, `createdAt`.
  - `BasketModelMetric`: `id`, `targetCommodity`, `accuracy Float`, `rocAuc Float`,
    `topDrivers String[]` (most important co-purchase commodities), `createdAt`.
- Prisma still owns the schema; Python only inserts rows. After adding the models we
  run a Prisma migration so both the API and the test DB have the tables.

### Models (`basket_analysis.py`)

- **Association rules:** group transactions by `basket_num` into commodity itemsets;
  one-hot encode; run **FP-Growth** with a tuned `min_support` (start ~0.01) and derive
  rules with `association_rules(metric="lift")`. Keep rules with `lift > 1` and a
  minimum confidence; sort by lift; cap to a sensible top-N. Write to `basket_rules`.
- **Gradient Boosting co-purchase:** pick a high-frequency target commodity; features =
  the one-hot basket matrix minus the target column; label = target present. Train/test
  split, fit `GradientBoostingClassifier`, evaluate accuracy + ROC-AUC, extract the top
  feature importances. Write one summary row per target to `basket_model_metric`.
- **Pure functions** (basket -> itemset list, itemsets -> one-hot frame) live in a small
  module so they can be unit-tested without a database.

### API + Web

- **API:** a `basket` module (controller -> service -> repository), routes mounted under
  `/api/basket`, protected by `requireAuth`:
  - `GET /api/basket/rules?limit=` -> top rules by lift.
  - `GET /api/basket/model` -> the model metric summaries.
- **Web:** a new "Basket Analysis" tab. Shows a table of top rules
  (`A (+ B) -> C`, with lift/confidence/support) and a small card with the GBM's
  accuracy, ROC-AUC, and top drivers. Empty state when no model has been run yet.

## Testing Decisions

- **Python unit tests** (pytest, run in the `ml` container): the pure encoding
  functions — a known set of baskets produces the expected itemsets and one-hot frame —
  so the feature construction is verified without a database or a full model run.
- **API integration tests** (HTTP seam, against the test DB): seed a few `basket_rules`
  and `basket_model_metric` rows directly via Prisma, then assert `GET /api/basket/rules`
  returns them ordered by lift and respects `limit`, and `GET /api/basket/model` returns
  the summary; both require auth (401 without a token); empty tables yield empty arrays.
- The model *quality* (exact rules/AUC) is not asserted in CI — that depends on the data
  and is validated by running the script against the sample and sanity-checking output.

## Out of Scope

- Churn prediction — that is Phase 7b (which reuses this scaffolding).
- Per-user personalized recommendations or a live recommender at request time.
- Hyperparameter search / model registry / scheduled retraining (run on demand).
- Product-level (SKU) rules — commodity level is used to keep itemsets dense and
  interpretable.

## Further Notes

- Commodity-level analysis is the standard choice for an interpretable market-basket
  study on a sparse catalog; it keeps support values meaningful on the ~50k-row sample.
- The Compose profile is the mechanism that enforces "no live Python service": the ML
  container exists for `docker compose run`, never for `up`. The README's claim that the
  runtime is a pure TS API stays true.
- Lift is the headline metric for cross-sell because it captures association beyond base
  rates; confidence and support are shown alongside for context.
