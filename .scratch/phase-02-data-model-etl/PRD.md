# PRD — Phase 2: Data Model & ETL

Status: ready-for-agent

## Problem Statement

As a developer, I have a running skeleton but no data in it. I need a well-designed
relational schema for the Kroger households, products, and transactions, plus a loader
that ingests the real (messy) source CSVs into that schema — cleaning their many
quirks along the way — so that every later phase (the household data pull, search,
dashboard, and ML) has clean, queryable, referentially-correct data to build on.

## Solution

A Prisma schema defining three related tables — `households`, `products`, and
`transactions` — with real primary keys, foreign keys, correct column types, and
indexes on the columns later phases query. A migration creates these tables in
PostgreSQL. A data-loading script reads the source CSVs, cleans each field (trims
whitespace, converts the literal string `"null"` to real `NULL`, parses
`DD-MON-YY` dates, maps `Y`/`N` to booleans, stores money as decimal), loads the
small tables fully and the large transactions file in batches, skips and reports
rows whose foreign keys can't be satisfied, and is safe to re-run. A trimmed sample
of the data is committed so the project loads out-of-the-box; the full 128 MB
transactions file stays out of version control.

## User Stories

1. As a developer, I want a `households` table keyed by household number, so that every household is uniquely identifiable and joinable.
2. As a developer, I want a `products` table keyed by product number, so that products can be referenced by transactions.
3. As a developer, I want a `transactions` table with a surrogate primary key, so that individual purchase lines are uniquely identified even though no natural column combination is reliably unique.
4. As a developer, I want transactions to carry real foreign keys to households and products, so that the database enforces referential integrity rather than holding disconnected rows.
5. As a developer, I want indexes on the transaction columns used for lookups (household number, basket number, product number), so that household search and basket analysis are fast.
6. As a developer, I want demographic columns to be nullable, so that households with missing demographics are represented honestly as NULL rather than the text "null".
7. As a developer, I want household size and children stored as text, so that range values like "5+" and "3+" are preserved instead of being lost to integer coercion.
8. As a developer, I want money stored as a decimal, so that spend totals are exact and never suffer floating-point rounding.
9. As a developer, I want loyalty and organic flags stored as booleans, so that filters and aggregations are clean and unambiguous.
10. As a developer, I want a migration that creates these tables, so that the schema is versioned and reproducible by anyone who clones the repo.
11. As a developer, I want a loader that trims the pervasive whitespace padding from every field and header, so that values and column names are clean.
12. As a developer, I want the loader to convert the literal string "null" into real NULL, so that missing demographics query correctly.
13. As a developer, I want the loader to parse the Oracle-style `DD-MON-YY` purchase dates into real date values, so that time-based analysis works.
14. As a developer, I want the loader to read the large transactions file in a streaming, batched way, so that it loads ~128 MB without exhausting memory.
15. As a developer, I want the loader to load households and products before transactions, so that foreign-key references resolve.
16. As a developer, I want the loader to skip and count transactions whose product or household isn't present, so that orphan rows are handled transparently and reported, not silently dropped or fatal.
17. As a developer, I want the loader to be idempotent (safe to re-run), so that re-running it produces the same result rather than duplicates.
18. As a recruiter, I want a trimmed sample dataset committed to the repo, so that `docker compose up` plus the load command populates a working database with no external download.
19. As a developer, I want the full dataset loadable by pointing the loader at the original files, so that the same code works for the complete data when available.

## Implementation Decisions

- **Three tables.** The data model (this schema encodes the core decisions of the phase):
  - `households`: `hshd_num` (integer primary key); `loyalty_flag` (boolean); `age_range`, `marital`, `income_range`, `homeowner`, `hshd_composition` (nullable text); `hh_size`, `children` (nullable text, because values are ranges like "5+").
  - `products`: `product_num` (integer primary key); `department`, `commodity`, `brand_type` (text); `is_organic` (boolean).
  - `transactions`: `id` (auto-increment surrogate primary key); `basket_num`, `hshd_num`, `product_num` (integers); `purchase_date` (date/time); `spend` (decimal(10,2)); `units` (integer); `store_region` (text); `week_num`, `year` (integers).
- **Foreign keys.** `transactions.hshd_num` references `households`, and `transactions.product_num` references `products`.
- **Indexes.** On `transactions.hshd_num`, `transactions.basket_num`, and `transactions.product_num`, to serve later search, sorting, and basket queries.
- **Surrogate key on transactions** because no natural single- or multi-column key is reliably unique.
- **Cleaning rules** applied by the loader: trim all values and headers; map the literal `"null"` to `NULL`; parse `DD-MON-YY` to a date; map `Y`/`N` to boolean for loyalty and organic flags; parse spend (e.g. `.59`) to decimal; cast padded numeric identifiers to integers.
- **Load order** is households, then products, then transactions, so foreign keys resolve.
- **Orphan handling.** Transactions referencing a missing household or product are skipped and counted, and the counts are reported at the end of a load.
- **Streaming + batched inserts** for the large transactions file, to bound memory use.
- **Idempotency.** Re-running the loader does not create duplicates (achieved by clearing the target tables before a full load, or equivalent upsert semantics).
- **Sample data committed; full data git-ignored.** A trimmed transactions sample (with the full households and products catalogs) is committed so the app loads with no external download; the original 128 MB file is loaded by pointing the loader at it.
- **Users table is out of scope** for this phase; it arrives with authentication in Phase 4.

## Testing Decisions

- A good test verifies **external behavior**: the cleaned values that land in (or would land in) the database — not the internal control flow of the loader.
- **Unit tests** cover the pure cleaning/transform functions, which are where bugs hide: whitespace trimming, `"null"` → `NULL`, `DD-MON-YY` → date, `Y`/`N` → boolean, and money string → decimal. These are deterministic and stable across refactors.
- **Integration test** loads a tiny fixture CSV into the database and then queries via Prisma to assert: the expected row counts, that a missing demographic is stored as `NULL`, and that a date parsed correctly. This exercises the full load → database round-trip.
- Prior art: the Phase 1 health integration test established the pattern of asserting on real results from a containerized database.

## Out of Scope

- The HSHD #10 data-pull display and the search-by-household feature (Phase 3).
- Any HTTP endpoints exposing this data (Phase 3 onward).
- The users table and authentication (Phase 4).
- Uploading new datasets through the web app (Phase 5).
- Dashboard and machine learning (Phases 6–7).

## Further Notes

- The source CSV quirks this phase must absorb were discovered during Phase 1 planning:
  whitespace-padded headers and values, literal `"null"` strings for missing
  demographics, zero-padded identifiers, money written like `.59`, and Oracle-style
  `DD-MON-YY` dates.
- The loader needs read access to the data files from wherever it runs; the sample data
  is mounted/available to the environment that executes the load.
- Cleaning and loading messy real-world data transparently (with reported orphan counts)
  is itself a deliberate engineering signal for this resume project.
