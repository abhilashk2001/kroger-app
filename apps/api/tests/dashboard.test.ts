// Integration test for the dashboard endpoint, at the HTTP seam. Loads the standard
// fixtures (3 transactions after the orphan row is skipped) and asserts the computed
// aggregates against hand-checked values. Also covers auth and the empty dataset.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/core/prisma";
import { loadAll } from "../src/ingestion/loader";

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixtures = {
  households: path.join(dir, "fixtures/households.csv"),
  products: path.join(dir, "fixtures/products.csv"),
  transactions: path.join(dir, "fixtures/transactions.csv"),
};

const app = createApp();
let authHeader: string;

async function register() {
  await prisma.user.deleteMany();
  const res = await request(app).post("/api/auth/register").send({
    username: "dash_tester",
    email: "dash_tester@example.com",
    password: "password123",
  });
  return `Bearer ${res.body.token}`;
}

describe("GET /api/dashboard", () => {
  describe("with fixtures loaded", () => {
    beforeAll(async () => {
      await loadAll(prisma, fixtures);
      authHeader = await register();
    });

    afterAll(async () => {
      await prisma.user.deleteMany();
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/dashboard");
      expect(res.status).toBe(401);
    });

    it("computes spend by department", async () => {
      const res = await request(app)
        .get("/api/dashboard")
        .set("Authorization", authHeader);
      expect(res.status).toBe(200);
      expect(res.body.spendByDepartment).toEqual([{ department: "FOOD", spend: 5.08 }]);
    });

    it("computes brand and organic mix", async () => {
      const { body } = await request(app)
        .get("/api/dashboard")
        .set("Authorization", authHeader);

      const brand = Object.fromEntries(
        body.brandMix.map((b: { brandType: string; spend: number }) => [
          b.brandType,
          b.spend,
        ]),
      );
      expect(brand).toEqual({ PRIVATE: 4.49, NATIONAL: 0.59 });

      const organic = Object.fromEntries(
        body.organicMix.map((o: { organic: boolean; spend: number }) => [
          String(o.organic),
          o.spend,
        ]),
      );
      expect(organic).toEqual({ true: 0.59, false: 4.49 });
    });

    it("computes average spend per household by income and loyalty", async () => {
      const { body } = await request(app)
        .get("/api/dashboard")
        .set("Authorization", authHeader);

      const income = Object.fromEntries(
        body.spendByIncome.map(
          (g: { incomeRange: string; avgSpendPerHousehold: number }) => [
            g.incomeRange,
            g.avgSpendPerHousehold,
          ],
        ),
      );
      expect(income).toEqual({ "50-74K": 4.08, Unknown: 1 });

      const loyalty = Object.fromEntries(
        body.loyalty.map((g: { loyal: boolean; avgSpendPerHousehold: number }) => [
          String(g.loyal),
          g.avgSpendPerHousehold,
        ]),
      );
      expect(loyalty).toEqual({ true: 4.08, false: 1 });
    });

    it("computes monthly spend over time", async () => {
      const res = await request(app)
        .get("/api/dashboard")
        .set("Authorization", authHeader);
      expect(res.body.spendOverTime).toEqual([{ period: "2018-08", spend: 5.08 }]);
    });
  });

  describe("with no data loaded", () => {
    beforeAll(async () => {
      await prisma.$executeRawUnsafe(
        "TRUNCATE TABLE transactions, households, products RESTART IDENTITY CASCADE",
      );
      authHeader = await register();
    });

    afterAll(async () => {
      await prisma.user.deleteMany();
      await prisma.$disconnect();
    });

    it("returns empty panels, not an error", async () => {
      const res = await request(app)
        .get("/api/dashboard")
        .set("Authorization", authHeader);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        spendOverTime: [],
        spendByDepartment: [],
        brandMix: [],
        organicMix: [],
        spendByIncome: [],
        loyalty: [],
      });
    });
  });
});
