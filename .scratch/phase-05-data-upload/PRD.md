# PRD — Phase 5: Data Loading Web App

Status: ready-for-agent

## Problem Statement

Assignment requirement #4 asks for a web app that lets a user load the latest
Transactions, Households, and Products datasets, and then confirms that the
interactive search (Phase 3, requirement #3) reflects the updated data. Today data
only enters the database through an offline CLI (`npm run load`) run inside the API
container against files on disk. There is no way for a logged-in user to refresh the
dataset from the browser.

## Solution

A protected ingest endpoint that accepts the three CSVs as a multipart upload, runs
the existing Phase 2 streaming loader against them, and returns a load report (rows
loaded per table, plus skipped orphan transactions). The existing `loadAll` already
truncates and reloads atomically, so an upload replaces the dataset — matching "load
the latest datasets." On the web, an authenticated "Load Data" page offers three file
inputs and a submit button, shows the resulting counts (or a clear error), and lets
the user then run a household search to confirm the new data is live.

## User Stories

1. As a logged-in user, I want to upload households, products, and transactions CSV files from the browser, so that I can refresh the dataset without server access.
2. As a user, I want to see how many rows were loaded into each table after an upload, so that I can confirm the load succeeded.
3. As a user, I want to see how many transactions were skipped as orphans, so that I understand any gaps between the files I uploaded.
4. As a user, I want a clear error if I forget one of the three files, so that I can correct the upload.
5. As a user, I want a clear error if a file is malformed (bad column or value), so that I know the load did not silently corrupt the data.
6. As a user, I want to run a household search right after loading, so that I can verify requirement #3 still works against the updated data.
7. As a developer, I want the upload route protected by the same auth as the rest of the app, so that only authenticated users can replace the dataset.
8. As a developer, I want the endpoint to reuse the Phase 2 loader unchanged, so that browser uploads and the CLI share one ingestion path.
9. As a developer, I want uploaded files written to a temporary location and always cleaned up, so that the server does not accumulate files.

## Implementation Decisions

- **Endpoint:** `POST /api/ingest` (protected by `requireAuth`), `multipart/form-data`
  with three named file parts: `households`, `products`, `transactions`. Returns 200
  with the `LoadReport` (`{ households, products, transactions, skippedTransactions }`).
- **Upload handling:** `multer` with **disk storage** to an OS temp directory. Disk
  storage (not memory) preserves the existing loader's streaming design — the loader
  reads from file paths via `createReadStream`, so we pass it the temp paths and never
  hold a whole file in memory. Files are deleted in a `finally` after the load.
- **Reuse:** the controller/service calls the existing `loadAll(prisma, paths)` from
  `src/ingestion/loader.ts` unchanged. That function already `TRUNCATE ... RESTART
  IDENTITY CASCADE`s before loading, so an upload cleanly replaces the dataset.
- **Module:** a new `modules/ingest/` feature (controller + service) consistent with
  the household and auth modules. The multer middleware is wired in the controller.
- **Validation / errors:** all three files required — missing any returns 400. A
  parse or clean error from the loader (bad column, unparseable value) returns 400
  with the error message; temp files are still cleaned up. Auth missing/invalid → 401
  (from existing middleware).
- **Upload limits:** a per-file size limit generous enough for the full 84.51 files
  (transactions ~128 MB) but bounded, via multer's `limits.fileSize`; over-limit
  returns 400.
- **Web:** a new authenticated "Load Data" view with three labeled file inputs and a
  submit button, posting `FormData` with the bearer token. On success it renders the
  per-table counts and skipped total; on failure, the server's error message. A simple
  in-app nav switches between "Search" and "Load Data" (both gated behind login).
- **Configuration:** no new config required; the temp directory comes from the OS.

## Testing Decisions

- A good test verifies **external behavior** at the **HTTP seam** — POST the multipart
  upload and assert on the response, then read the data back through the household pull
  endpoint to prove the search reflects the upload.
- **Integration tests** (against the dedicated test database, authenticated with a
  registered user's bearer token):
  - Uploading the three fixture CSVs returns 200 with the expected per-table counts and
    skipped total.
  - After an upload, `GET /api/households/:n/pull` returns the newly loaded rows (the
    requirement #4 → #3 round trip).
  - Omitting one of the three files returns 400.
  - An unauthenticated upload returns 401.
- Reuses the existing fixtures under `apps/api/tests/fixtures/` (supertest's
  `.attach()` sends them as file parts). Suite continues to run serially against the
  test database, as established in Phase 3.

## Out of Scope

- Incremental / append loads or per-row upserts (an upload replaces the dataset, by
  design — matching the loader's existing truncate-and-reload behavior).
- Background/async job processing or progress streaming for very large uploads (the
  request completes the load synchronously).
- Column-mapping UI, file-format auto-detection, or previewing before commit.
- Storing uploaded files durably (e.g. in object storage); temp files are discarded
  after load. Cloud object storage is a Phase 8 concern if needed.
- The dashboard (Phase 6) and ML (Phase 7).

## Further Notes

- Disk storage over memory storage was chosen specifically to keep the loader's
  streaming/batched design intact for the full 128 MB transactions file; buffering that
  in memory per request would be wasteful and fragile.
- Reusing `loadAll` unchanged keeps a single source of truth for ingestion: the CLI
  (`npm run load`) and the web upload cannot drift in how they clean and validate data.
- The truncate-and-reload semantics mean uploads are destructive by design; this is
  acceptable for a single-user resume project and will be noted in the README.
