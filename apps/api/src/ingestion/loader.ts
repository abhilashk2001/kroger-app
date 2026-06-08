// Streaming CSV loader for the Kroger data. Loads households and products fully,
// then streams transactions in batches - skipping (and counting) any transaction
// whose household or product isn't present, so foreign keys always resolve.

import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  cleanOptionalText,
  cleanText,
  parseIntField,
  parseYesNo,
  parseMoney,
  parseOracleDate,
} from "./clean";

const BATCH_SIZE = 5000;

type CsvRow = Record<string, string>;

/** Opens a CSV as an async-iterable of row objects, with trimmed header keys. */
function csvRows(filePath: string): AsyncIterable<CsvRow> {
  return createReadStream(filePath).pipe(
    parse({
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
    }),
  );
}

export interface LoadReport {
  households: number;
  products: number;
  transactions: number;
  skippedTransactions: number;
}

async function loadHouseholds(
  prisma: PrismaClient,
  filePath: string,
): Promise<Set<number>> {
  const data: Prisma.HouseholdCreateManyInput[] = [];

  for await (const row of csvRows(filePath)) {
    data.push({
      hshdNum: parseIntField(row.HSHD_NUM),
      loyaltyFlag: parseYesNo(row.L),
      ageRange: cleanOptionalText(row.AGE_RANGE),
      marital: cleanOptionalText(row.MARITAL),
      incomeRange: cleanOptionalText(row.INCOME_RANGE),
      homeowner: cleanOptionalText(row.HOMEOWNER),
      hshdComposition: cleanOptionalText(row.HSHD_COMPOSITION),
      hhSize: cleanOptionalText(row.HH_SIZE),
      children: cleanOptionalText(row.CHILDREN),
    });
  }

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    await prisma.household.createMany({ data: data.slice(i, i + BATCH_SIZE) });
  }
  return new Set(data.map((d) => d.hshdNum));
}

async function loadProducts(
  prisma: PrismaClient,
  filePath: string,
): Promise<Set<number>> {
  const data: Prisma.ProductCreateManyInput[] = [];

  for await (const row of csvRows(filePath)) {
    data.push({
      productNum: parseIntField(row.PRODUCT_NUM),
      department: cleanText(row.DEPARTMENT),
      commodity: cleanText(row.COMMODITY),
      brandType: cleanText(row.BRAND_TY),
      isOrganic: parseYesNo(row.NATURAL_ORGANIC_FLAG),
    });
  }

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    await prisma.product.createMany({ data: data.slice(i, i + BATCH_SIZE) });
  }
  return new Set(data.map((d) => d.productNum));
}

async function loadTransactions(
  prisma: PrismaClient,
  filePath: string,
  householdIds: Set<number>,
  productIds: Set<number>,
): Promise<{ count: number; skipped: number }> {
  let count = 0;
  let skipped = 0;
  let batch: Prisma.TransactionCreateManyInput[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await prisma.transaction.createMany({ data: batch });
    count += batch.length;
    batch = [];
  };

  for await (const row of csvRows(filePath)) {
    const hshdNum = parseIntField(row.HSHD_NUM);
    const productNum = parseIntField(row.PRODUCT_NUM);

    // Skip orphans: a transaction whose household or product we don't have.
    if (!householdIds.has(hshdNum) || !productIds.has(productNum)) {
      skipped++;
      continue;
    }

    batch.push({
      basketNum: parseIntField(row.BASKET_NUM),
      hshdNum,
      productNum,
      purchaseDate: parseOracleDate(row["PURCHASE_"]),
      spend: parseMoney(row.SPEND),
      units: parseIntField(row.UNITS),
      storeRegion: cleanText(row["STORE_R"]),
      weekNum: parseIntField(row.WEEK_NUM),
      year: parseIntField(row.YEAR),
    });

    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  return { count, skipped };
}

export async function loadAll(
  prisma: PrismaClient,
  paths: { households: string; products: string; transactions: string },
): Promise<LoadReport> {
  // Idempotent: wipe and reset before loading, so re-runs don't duplicate.
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE transactions, households, products RESTART IDENTITY CASCADE",
  );

  const householdIds = await loadHouseholds(prisma, paths.households);
  const productIds = await loadProducts(prisma, paths.products);
  const { count, skipped } = await loadTransactions(
    prisma,
    paths.transactions,
    householdIds,
    productIds,
  );

  return {
    households: householdIds.size,
    products: productIds.size,
    transactions: count,
    skippedTransactions: skipped,
  };
}
