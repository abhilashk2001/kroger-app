// REPOSITORY layer: reads the precomputed churn tables. The API serves rows written
// offline by ml/churn.py; it never runs the model.

import { prisma } from "../../core/prisma";

/** Households most likely to churn first. */
export function findAtRisk(limit: number) {
  return prisma.householdChurn.findMany({
    orderBy: { churnProbability: "desc" },
    take: limit,
  });
}

/** Count of households in each risk band. */
export function findBandCounts() {
  return prisma.householdChurn.groupBy({
    by: ["riskBand"],
    _count: { _all: true },
  });
}

/** The most recent churn-model evaluation summary. */
export function findLatestModelMetric() {
  return prisma.churnModelMetric.findFirst({ orderBy: { createdAt: "desc" } });
}
