# PRD — Phase 6: Dashboard

Status: ready-for-agent

## Problem Statement

Assignment requirement #5 asks for a webpage with a dashboard that explores retail
challenges using selected factors from the "Examples of Questions to Address."
Today the app can authenticate, load data, and pull one household's transactions —
but it offers no aggregate view of the dataset. A hiring reviewer (and the
assignment) wants to see insight, not just CRUD: how engagement trends over time,
how demographics relate to spend, and how brand/organic preferences break down.

## Solution

A protected analytics endpoint that computes a set of aggregate metrics over the
loaded data in one pass, and a "Dashboard" web page that renders them as charts.
The dashboard answers four of the suggested retail questions with the data we have:

1. **Engagement over time** — total spend per calendar month across the two years.
2. **Spend by department** — which categories drive the most spend (top N).
3. **Brand & organic preference** — private vs national brand, and organic vs not.
4. **Demographics & engagement** — average spend per household by income range, and
   a loyalty-vs-non comparison.

Basket *combination* analysis is intentionally deferred to Phase 7 (the ML
requirement). The dashboard reads whatever data is currently loaded, so it reflects
uploads made through the Phase 5 Load Data page.

## User Stories

1. As a user, I want to see total spend per month, so that I can tell whether engagement is rising or falling over the two years.
2. As a user, I want to see which departments drive the most spend, so that I know where the money goes.
3. As a user, I want to see the split between private and national brands, so that I understand brand preference.
4. As a user, I want to see the split between organic and non-organic spend, so that I understand the appetite for organic.
5. As a user, I want to see average spend per household by income range, so that I can relate demographics to engagement.
6. As a user, I want to see how loyalty-program members compare to non-members on spend, so that I can gauge the program's association with engagement.
7. As a user, I want the dashboard behind login like the rest of the app, so that the analytics are not public.
8. As a user, I want the dashboard to reflect the most recently loaded data, so that it stays consistent with what I uploaded in Phase 5.
9. As a developer, I want a single analytics endpoint returning all panels, so that the page loads its data in one request.
10. As a developer, I want each metric computed by a focused, tested aggregation, so that the numbers are trustworthy.
11. As a developer, I want an empty dataset to yield empty panels (not an error), so that the page degrades gracefully before any data is loaded.

## Implementation Decisions

- **Endpoint:** `GET /api/dashboard` (protected by `requireAuth`), returning one JSON
  object with a named section per panel:
  - `spendOverTime`: `[{ period: "YYYY-MM", spend: number }]`, chronological.
  - `spendByDepartment`: `[{ department, spend }]`, top 10 by spend, descending.
  - `brandMix`: `[{ brandType: "PRIVATE" | "NATIONAL", spend }]`.
  - `organicMix`: `[{ organic: boolean, spend }]`.
  - `spendByIncome`: `[{ incomeRange, avgSpendPerHousehold, households }]` (null income
    grouped as "Unknown").
  - `loyalty`: `[{ loyal: boolean, avgSpendPerHousehold, households }]`.
- **Module:** a new `modules/dashboard/` feature (controller → service → repository),
  consistent with households/auth/ingest. The service runs the repository aggregations
  in parallel (`Promise.all`) and assembles the response; it knows no HTTP.
- **Aggregations:** use Prisma's typed `groupBy`/`aggregate` where a single table
  suffices; use parameterized `$queryRaw` for the metrics that need a join or
  `COUNT(DISTINCT hshd_num)` (department, brand, organic, per-household averages).
  Money columns are `Decimal`; sums are converted to `number` at the repository edge
  and rounded to cents, so the API returns plain numbers.
- **Per-household average:** `SUM(spend) / COUNT(DISTINCT hshd_num)` within each group,
  so a few heavy households don't distort a group with many light ones.
- **Empty data:** every panel returns an empty array (or zeroed entries) rather than
  erroring when no transactions are loaded.
- **Web:** a new authenticated "Dashboard" view, added as a third tab alongside Search
  and Load Data. It fetches `/api/dashboard` once on mount and renders each panel as a
  chart, with a loading state and an empty state ("No data loaded yet — use Load Data").
- **Charts:** `recharts` (declarative React charts) — see the open question below.
- **Performance:** aggregations run against the indexed transactions table; on the
  ~50k-row sample they are sub-second. No caching layer (out of scope); the endpoint
  recomputes per request.

## Testing Decisions

- A good test verifies **external behavior** at the **HTTP seam** — GET the dashboard
  with an authenticated request and assert the computed numbers against a known fixture.
- **Integration tests** (against the test database, authenticated):
  - With the standard fixtures loaded (3 transactions: BREAD ×1, MILK ×2 for hshd 10;
    BREAD ×1 for hshd 20), assert concrete values: department FOOD spend = 5.08; brand
    PRIVATE = 4.49 and NATIONAL = 0.59; organic = 0.59 and non-organic = 4.49; income
    "50-74K" avg-per-household = 4.08 and "Unknown" = 1.00; loyal avg = 4.08 and
    non-loyal = 1.00; spendOverTime has a single `2018-08` bucket = 5.08.
  - The endpoint requires auth (401 without a token).
  - Against an empty dataset, every panel is an empty array and the status is 200.
- Reuses the existing fixtures and the serial test-DB setup from earlier phases.

## Out of Scope

- Basket-combination / cross-sell analysis and any ML — that is Phase 7.
- Interactive filtering, date-range pickers, or drill-down (panels are fixed views).
- Caching, materialized views, or precomputed aggregate tables (recompute per request;
  precomputation is a Phase 7/8 concern if needed).
- Export (CSV/PNG) of charts.
- Forecasting or trend lines beyond the raw monthly series.

## Further Notes

- The four panels were chosen to cover distinct questions from the brief —
  engagement-over-time, demographics-and-engagement, brand preference — while staying
  answerable with straightforward SQL aggregation. Seasonal/regional cuts are easy
  follow-ons if time allows but are not required for the requirement.
- Raw SQL is used deliberately for the join/distinct-count metrics: it is the clearest
  way to express them and demonstrates SQL skill, while parameterization keeps it safe.
  Single-table metrics stay on Prisma's typed API for safety where that suffices.
