// Integration test for the loader, run against a SEPARATE test database so it
// never touches dev data. Loads a tiny fixture, then asserts on what landed in
// the database — including that missing demographics become NULL, dates parse,
// and an orphan transaction (referencing a missing product) is skipped.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { loadAll } from "../src/ingestion/loader";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set — refusing to run loader tests against the dev database.",
  );
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixtures = {
  households: path.join(dir, "fixtures/households.csv"),
  products: path.join(dir, "fixtures/products.csv"),
  transactions: path.join(dir, "fixtures/transactions.csv"),
};

const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });

describe("loadAll (integration)", () => {
  beforeAll(async () => {
    await loadAll(prisma, fixtures);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("loads the expected row counts and skips orphans", async () => {
    const [households, products, transactions] = await Promise.all([
      prisma.household.count(),
      prisma.product.count(),
      prisma.transaction.count(),
    ]);

    expect(households).toBe(2);
    expect(products).toBe(2);
    // 4 rows in the file; the one referencing product 999 (absent) is skipped.
    expect(transactions).toBe(3);
  });

  it("stores missing demographics as NULL, not the string 'null'", async () => {
    const household = await prisma.household.findUnique({ where: { hshdNum: 20 } });
    expect(household?.ageRange).toBeNull();
    expect(household?.incomeRange).toBeNull();
  });

  it("parses Oracle-style dates correctly", async () => {
    const tx = await prisma.transaction.findFirst({
      where: { hshdNum: 10, productNum: 100 },
    });
    expect(tx?.purchaseDate.toISOString()).toBe("2018-08-17T00:00:00.000Z");
  });
});
