// SERVICE layer: assembles the dashboard summary. Runs the independent aggregations
// in parallel, and turns each demographic group's (spend, households) into an average
// spend per household. Knows nothing about HTTP.

import {
  spendOverTime,
  spendByDepartment,
  brandMix,
  organicMix,
  spendByIncome,
  spendByLoyalty,
  type PeriodSpend,
  type DepartmentSpend,
  type BrandSpend,
  type OrganicSpend,
} from "./dashboard.repository";

export interface IncomePanel {
  incomeRange: string;
  avgSpendPerHousehold: number;
  households: number;
}
export interface LoyaltyPanel {
  loyal: boolean;
  avgSpendPerHousehold: number;
  households: number;
}

export interface DashboardSummary {
  spendOverTime: PeriodSpend[];
  spendByDepartment: DepartmentSpend[];
  brandMix: BrandSpend[];
  organicMix: OrganicSpend[];
  spendByIncome: IncomePanel[];
  loyalty: LoyaltyPanel[];
}

const avgPerHousehold = (spend: number, households: number) =>
  households > 0 ? Math.round((spend / households) * 100) / 100 : 0;

export async function getDashboard(): Promise<DashboardSummary> {
  const [overTime, byDepartment, brands, organic, byIncome, byLoyalty] =
    await Promise.all([
      spendOverTime(),
      spendByDepartment(),
      brandMix(),
      organicMix(),
      spendByIncome(),
      spendByLoyalty(),
    ]);

  return {
    spendOverTime: overTime,
    spendByDepartment: byDepartment,
    brandMix: brands,
    organicMix: organic,
    spendByIncome: byIncome.map((g) => ({
      incomeRange: g.incomeRange,
      avgSpendPerHousehold: avgPerHousehold(g.spend, g.households),
      households: g.households,
    })),
    loyalty: byLoyalty.map((g) => ({
      loyal: g.loyal,
      avgSpendPerHousehold: avgPerHousehold(g.spend, g.households),
      households: g.households,
    })),
  };
}
