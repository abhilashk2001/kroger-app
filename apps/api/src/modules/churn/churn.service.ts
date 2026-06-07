// SERVICE layer: shapes the precomputed churn rows for the API. Knows no HTTP.

import {
  findAtRisk,
  findBandCounts,
  findLatestModelMetric,
} from "./churn.repository";

export interface AtRiskRow {
  hshdNum: number;
  churnProbability: number;
  riskBand: string;
}

export interface ChurnSummary {
  bands: { band: string; count: number }[];
  model: {
    accuracy: number;
    rocAuc: number;
    churnRate: number;
    topDrivers: string[];
  } | null;
}

// Show the bands in severity order, including any with a zero count.
const BAND_ORDER = ["High", "Medium", "Low"];

export async function getAtRisk(limit: number): Promise<AtRiskRow[]> {
  const rows = await findAtRisk(limit);
  return rows.map((r) => ({
    hshdNum: r.hshdNum,
    churnProbability: r.churnProbability,
    riskBand: r.riskBand,
  }));
}

export async function getChurnSummary(): Promise<ChurnSummary> {
  const [counts, model] = await Promise.all([
    findBandCounts(),
    findLatestModelMetric(),
  ]);

  const countByBand = new Map(counts.map((c) => [c.riskBand, c._count._all]));
  const bands = BAND_ORDER.map((band) => ({
    band,
    count: countByBand.get(band) ?? 0,
  }));

  return {
    bands,
    model: model
      ? {
          accuracy: model.accuracy,
          rocAuc: model.rocAuc,
          churnRate: model.churnRate,
          topDrivers: model.topDrivers
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        }
      : null,
  };
}
