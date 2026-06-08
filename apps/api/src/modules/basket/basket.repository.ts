// REPOSITORY layer: reads the precomputed basket-analysis tables. The API never
// runs the model - it only serves rows written offline by ml/basket_analysis.py.

import { prisma } from "../../core/prisma";

/** Top association rules, strongest cross-sell (highest lift) first. */
export function findTopRules(limit: number) {
  return prisma.basketRule.findMany({
    orderBy: [{ lift: "desc" }, { confidence: "desc" }],
    take: limit,
  });
}

/** The co-purchase model evaluation summaries (most recent run first). */
export function findModelMetrics() {
  return prisma.basketModelMetric.findMany({
    orderBy: { createdAt: "desc" },
  });
}
