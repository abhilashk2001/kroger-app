// REPOSITORY layer: the only place that talks to the database for health checks.
// It knows *how* to reach the DB, but makes no decisions about what the result means.

import { prisma } from "../../core/prisma";

/** Returns true if the database answers a trivial query, false otherwise. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
