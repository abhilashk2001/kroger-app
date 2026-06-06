// SERVICE layer: assembles the household "data pull". Decides what a row looks
// like and returns null when the household doesn't exist (so the controller can
// answer 404). Knows nothing about HTTP.

import {
  findHousehold,
  countHouseholdTransactions,
  findHouseholdTransactions,
} from "./households.repository";

export interface PullRow {
  basketNum: number;
  purchaseDate: Date;
  productNum: number;
  department: string;
  commodity: string;
  spend: string;
  units: number;
  storeRegion: string;
  weekNum: number;
  year: number;
}

export interface HouseholdPull {
  hshdNum: number;
  page: number;
  pageSize: number;
  total: number;
  rows: PullRow[];
}

export async function getHouseholdPull(
  hshdNum: number,
  page: number,
  pageSize: number,
): Promise<HouseholdPull | null> {
  const household = await findHousehold(hshdNum);
  if (!household) return null;

  const skip = (page - 1) * pageSize;
  const [transactions, total] = await Promise.all([
    findHouseholdTransactions(hshdNum, skip, pageSize),
    countHouseholdTransactions(hshdNum),
  ]);

  const rows: PullRow[] = transactions.map((t) => ({
    basketNum: t.basketNum,
    purchaseDate: t.purchaseDate,
    productNum: t.productNum,
    department: t.product.department,
    commodity: t.product.commodity,
    spend: t.spend.toString(),
    units: t.units,
    storeRegion: t.storeRegion,
    weekNum: t.weekNum,
    year: t.year,
  }));

  return { hshdNum, page, pageSize, total, rows };
}
