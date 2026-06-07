// SERVICE layer: runs an uploaded dataset through the Phase 2 loader, then always
// cleans up the temporary files multer wrote — whether the load succeeds or fails.
// Knows nothing about HTTP. Reuses loadAll unchanged, so the web upload and the CLI
// (`npm run load`) share one ingestion path and can't drift.

import { unlink } from "node:fs/promises";
import { prisma } from "../../core/prisma";
import { loadAll, type LoadReport } from "../../ingestion/loader";

export interface DatasetPaths {
  households: string;
  products: string;
  transactions: string;
}

export async function ingestDatasets(paths: DatasetPaths): Promise<LoadReport> {
  try {
    // loadAll truncates and reloads, so an upload replaces the dataset.
    return await loadAll(prisma, paths);
  } finally {
    // Discard the temp uploads. allSettled so one failed unlink can't mask the
    // load's own error (or stop the others from being removed).
    await Promise.allSettled([
      unlink(paths.households),
      unlink(paths.products),
      unlink(paths.transactions),
    ]);
  }
}
