// CLI entry point for loading data. Run inside the api container:
//   docker compose exec api npm run load
//
// Defaults to the committed sample under /data/sample, but each file path can be
// overridden via env vars (e.g. to point at the full dataset).

import path from "node:path";
import { prisma } from "../core/prisma";
import { loadAll } from "../ingestion/loader";

const dataDir = process.env.DATA_DIR ?? "/data/sample";

const paths = {
  households: process.env.HOUSEHOLDS_CSV ?? path.join(dataDir, "households.csv"),
  products: process.env.PRODUCTS_CSV ?? path.join(dataDir, "products.csv"),
  transactions:
    process.env.TRANSACTIONS_CSV ?? path.join(dataDir, "transactions.csv"),
};

async function main() {
  console.log("Loading data from:");
  console.log(`  households:   ${paths.households}`);
  console.log(`  products:     ${paths.products}`);
  console.log(`  transactions: ${paths.transactions}`);
  console.log("");

  const start = Date.now();
  const report = await loadAll(prisma, paths);
  const seconds = ((Date.now() - start) / 1000).toFixed(1);

  console.log("Load complete:");
  console.table(report);
  console.log(`Took ${seconds}s`);
}

main()
  .catch((error) => {
    console.error("Load failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
