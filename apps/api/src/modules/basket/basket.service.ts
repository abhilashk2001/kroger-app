// SERVICE layer: shapes the precomputed basket rows for the API. Splits the
// comma-joined commodity lists back into arrays for the client. Knows no HTTP.

import { findTopRules, findModelMetrics } from "./basket.repository";

export interface RuleView {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
}

export interface ModelView {
  targetCommodity: string;
  accuracy: number;
  rocAuc: number;
  topDrivers: string[];
}

const splitList = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

export async function getBasketRules(limit: number): Promise<RuleView[]> {
  const rules = await findTopRules(limit);
  return rules.map((r) => ({
    antecedents: splitList(r.antecedents),
    consequents: splitList(r.consequents),
    support: r.support,
    confidence: r.confidence,
    lift: r.lift,
  }));
}

export async function getBasketModels(): Promise<ModelView[]> {
  const metrics = await findModelMetrics();
  return metrics.map((m) => ({
    targetCommodity: m.targetCommodity,
    accuracy: m.accuracy,
    rocAuc: m.rocAuc,
    topDrivers: splitList(m.topDrivers),
  }));
}
