// REPOSITORY layer: all database access for the dashboard. Each function is one
// focused aggregation. Sums are cast to float8 and counts to int in SQL, so they
// arrive in JS as plain numbers (not Prisma.Decimal / BigInt). Money sums are
// rounded to cents at this edge. The metrics that span tables or need a distinct
// household count use parameterized raw SQL; there is no user input in any of them.

import { prisma } from "../../core/prisma";

export interface PeriodSpend {
  period: string; // "YYYY-MM"
  spend: number;
}
export interface DepartmentSpend {
  department: string;
  spend: number;
}
export interface BrandSpend {
  brandType: string; // PRIVATE | NATIONAL
  spend: number;
}
export interface OrganicSpend {
  organic: boolean;
  spend: number;
}
export interface GroupEngagement {
  spend: number;
  households: number;
}
export interface IncomeEngagement extends GroupEngagement {
  incomeRange: string;
}
export interface LoyaltyEngagement extends GroupEngagement {
  loyal: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Total spend per calendar month, chronological. */
export async function spendOverTime(): Promise<PeriodSpend[]> {
  const rows = await prisma.$queryRaw<{ period: string; spend: number }[]>`
    SELECT to_char(purchase_date, 'YYYY-MM') AS period,
           SUM(spend)::float8 AS spend
    FROM transactions
    GROUP BY period
    ORDER BY period ASC
  `;
  return rows.map((r) => ({ period: r.period, spend: round2(r.spend) }));
}

/** Top departments by total spend (joins products). */
export async function spendByDepartment(limit = 10): Promise<DepartmentSpend[]> {
  const rows = await prisma.$queryRaw<{ department: string; spend: number }[]>`
    SELECT p.department AS department,
           SUM(t.spend)::float8 AS spend
    FROM transactions t
    JOIN products p ON p.product_num = t.product_num
    GROUP BY p.department
    ORDER BY spend DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ department: r.department, spend: round2(r.spend) }));
}

/** Private vs national brand spend. */
export async function brandMix(): Promise<BrandSpend[]> {
  const rows = await prisma.$queryRaw<{ brandType: string; spend: number }[]>`
    SELECT p.brand_type AS "brandType",
           SUM(t.spend)::float8 AS spend
    FROM transactions t
    JOIN products p ON p.product_num = t.product_num
    GROUP BY p.brand_type
    ORDER BY spend DESC
  `;
  return rows.map((r) => ({ brandType: r.brandType, spend: round2(r.spend) }));
}

/** Organic vs non-organic spend. */
export async function organicMix(): Promise<OrganicSpend[]> {
  const rows = await prisma.$queryRaw<{ organic: boolean; spend: number }[]>`
    SELECT p.is_organic AS organic,
           SUM(t.spend)::float8 AS spend
    FROM transactions t
    JOIN products p ON p.product_num = t.product_num
    GROUP BY p.is_organic
    ORDER BY organic DESC
  `;
  return rows.map((r) => ({ organic: r.organic, spend: round2(r.spend) }));
}

/** Spend and distinct-household count per income range (null -> "Unknown"). */
export async function spendByIncome(): Promise<IncomeEngagement[]> {
  const rows = await prisma.$queryRaw<
    { incomeRange: string; spend: number; households: number }[]
  >`
    SELECT COALESCE(h.income_range, 'Unknown') AS "incomeRange",
           SUM(t.spend)::float8 AS spend,
           COUNT(DISTINCT t.hshd_num)::int AS households
    FROM transactions t
    JOIN households h ON h.hshd_num = t.hshd_num
    GROUP BY COALESCE(h.income_range, 'Unknown')
    ORDER BY spend DESC
  `;
  return rows.map((r) => ({
    incomeRange: r.incomeRange,
    spend: round2(r.spend),
    households: r.households,
  }));
}

/** Spend and distinct-household count for loyalty members vs non-members. */
export async function spendByLoyalty(): Promise<LoyaltyEngagement[]> {
  const rows = await prisma.$queryRaw<
    { loyal: boolean; spend: number; households: number }[]
  >`
    SELECT h.loyalty_flag AS loyal,
           SUM(t.spend)::float8 AS spend,
           COUNT(DISTINCT t.hshd_num)::int AS households
    FROM transactions t
    JOIN households h ON h.hshd_num = t.hshd_num
    GROUP BY h.loyalty_flag
    ORDER BY loyal DESC
  `;
  return rows.map((r) => ({
    loyal: r.loyal,
    spend: round2(r.spend),
    households: r.households,
  }));
}
