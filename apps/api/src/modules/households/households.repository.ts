// REPOSITORY layer: all database access for the household data pull. Owns the
// filter, the product join, the required multi-key sort, and pagination.

import { prisma } from "../../core/prisma";

/** Looks up a household by its number (used to distinguish 404 from empty). */
export function findHousehold(hshdNum: number) {
  return prisma.household.findUnique({ where: { hshdNum } });
}

/** The household's precomputed churn score, if one exists (null otherwise). */
export function findHouseholdChurn(hshdNum: number) {
  return prisma.householdChurn.findUnique({ where: { hshdNum } });
}

/** Counts a household's transaction lines (for pagination metadata). */
export function countHouseholdTransactions(hshdNum: number) {
  return prisma.transaction.count({ where: { hshdNum } });
}

/**
 * Returns one page of a household's transaction lines, each joined to its
 * product, sorted by the assignment's required keys:
 * household, basket, date, product, department, commodity.
 */
export function findHouseholdTransactions(
  hshdNum: number,
  skip: number,
  take: number,
) {
  return prisma.transaction.findMany({
    where: { hshdNum },
    include: { product: true },
    orderBy: [
      { hshdNum: "asc" },
      { basketNum: "asc" },
      { purchaseDate: "asc" },
      { productNum: "asc" },
      { product: { department: "asc" } },
      { product: { commodity: "asc" } },
    ],
    skip,
    take,
  });
}
