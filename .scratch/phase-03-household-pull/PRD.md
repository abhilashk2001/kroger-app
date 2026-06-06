# PRD — Phase 3: Household Data Pull & Search

Status: ready-for-agent

## Problem Statement

As a user of the app (and per assignment requirements #2–#4), I need to look up a
single household and see all of its purchases — joined across households,
transactions, and products, and sorted in a specific order — so that I can inspect
exactly what a household bought, the way the assignment's "Sample Data Pull for
HSHD #10" demonstrates, and search for any household by its number.

## Solution

A read API endpoint that returns one household's purchase lines, joining transactions
to their products, sorted by household number, basket number, date, product number,
department, and commodity, and paginated. A React search page lets a user enter a
household number and view the resulting sorted table, with loading, empty, and error
states and pagination controls. The endpoint and page together satisfy the HSHD #10
display and the search-by-household requirements (searching for 10 simply shows
household 10).

## User Stories

1. As a user, I want to enter a household number and see all that household's purchases, so that I can inspect its shopping behavior.
2. As a user, I want the results sorted by household number, basket number, date, product number, department, and commodity, so that the pull matches the assignment's required ordering and is easy to scan.
3. As a user, I want each row to show the basket, date, product, department, commodity, spend, units, and store region, so that I see the full purchase detail.
4. As a user, I want results paginated, so that a household with thousands of lines loads quickly and is navigable.
5. As a user, I want a clear "no results" message when a household number doesn't exist, so that I'm not confused by an empty screen.
6. As a user, I want a visible loading indicator while results fetch, so that I know the app is working.
7. As a user, I want an error message if the request fails, so that I understand something went wrong rather than seeing a blank page.
8. As a developer, I want the endpoint to return 404 for a household that doesn't exist, so that "not found" is distinguishable from "found but empty".
9. As a developer, I want the endpoint to validate the household number input, so that malformed requests are rejected cleanly rather than causing errors.
10. As a developer, I want the household lookup to use the existing index on the transactions' household column, so that search is fast.
11. As a developer, I want the join and multi-column sort expressed through the ORM, so that there is no hand-written SQL to maintain.
12. As a developer, I want the endpoint built in the established controller → service → repository layers, so that it stays consistent with the rest of the API.
13. As a developer, I want the response to include pagination metadata (page, page size, total), so that the UI can render pagination controls.

## Implementation Decisions

- **Endpoint:** `GET /api/households/:hshdNum/pull`, accepting `page` and `pageSize`
  query parameters. The response contains the household number, pagination metadata
  (page, page size, total row count), and the array of purchase-line rows.
- **Row shape:** each row represents one transaction line joined to its product, and
  exposes basket number, purchase date, product number, department, commodity, spend,
  units, store region, week number, and year.
- **Sort order** (fixed, per the assignment): household number, then basket number,
  then purchase date, then product number, then department, then commodity. Department
  and commodity are sorted via the related product, expressed through the ORM rather
  than raw SQL.
- **Pagination** with a sensible default page size, returning total count so the UI can
  page. Page and page size are validated and bounded.
- **Not found vs empty:** if the household number doesn't exist at all, the endpoint
  returns 404; a household that exists is returned with its (possibly paged) rows.
- **Input validation:** the household number and pagination parameters are validated;
  invalid input yields a 400 rather than a server error.
- **Layering:** a new household feature module with controller, service, and repository,
  following the Phase 1 pattern. The repository owns the ORM query (filter, join, sort,
  paginate, count).
- **Web:** the React app gains a household-search page (replacing the Phase 1
  placeholder) with an input, a submit action, a results table, pagination controls,
  and explicit loading / empty / error states. It calls the endpoint through the
  existing same-origin `/api` proxy.

## Testing Decisions

- A good test verifies **external behavior** at the **HTTP seam**: it sends a real
  request to `GET /api/households/:hshdNum/pull` and asserts on the response.
- **Integration tests** load a small fixture (a household with several baskets and
  products) into the test database, then assert: the rows are returned in the exact
  required sort order, the row shape is correct, pagination (page/pageSize/total)
  behaves, and an unknown household returns 404.
- The suite runs **against the dedicated test database** (the app's database
  connection is pointed at the test database during tests, with fixtures loaded in
  setup) and runs **serially**, because multiple test files share that single test
  database and must not run concurrently.
- Prior art: the Phase 1 health test (HTTP via supertest) and the Phase 2 loader test
  (fixtures in the test database) — this phase combines both patterns.

## Out of Scope

- Loading or refreshing data through the web app (Phase 5).
- Authentication / gating the page behind login (Phase 4).
- Dashboard visualizations and aggregate analytics (Phase 6).
- Machine learning (Phase 7).
- Any write operations — this phase is read-only.

## Further Notes

- The transactions index on the household column (created in Phase 2) is what keeps
  this lookup fast; no new index is required.
- The assignment's reference example is "HSHD #10"; the same endpoint serves any
  household number entered in the search box.
