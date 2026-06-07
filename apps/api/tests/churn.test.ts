// Integration test for the churn endpoints + the household-pull risk field, at the
// HTTP seam. The API serves precomputed rows, so the test seeds households and their
// churn scores directly via Prisma (standing in for an ml/churn.py run).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/core/prisma";

const app = createApp();
let authHeader: string;

async function register() {
  await prisma.user.deleteMany();
  const res = await request(app).post("/api/auth/register").send({
    username: "churn_tester",
    email: "churn_tester@example.com",
    password: "password123",
  });
  return `Bearer ${res.body.token}`;
}

// Clears everything (households cascade-delete their churn scores).
async function wipe() {
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE transactions, households, products RESTART IDENTITY CASCADE",
  );
  await prisma.churnModelMetric.deleteMany();
}

describe("GET /api/churn", () => {
  describe("with seeded scores", () => {
    beforeAll(async () => {
      await wipe();
      await prisma.household.createMany({
        data: [
          { hshdNum: 10, loyaltyFlag: true },
          { hshdNum: 20, loyaltyFlag: false },
          { hshdNum: 30, loyaltyFlag: true },
        ],
      });
      await prisma.householdChurn.createMany({
        data: [
          { hshdNum: 10, churnProbability: 0.92, riskBand: "High" },
          { hshdNum: 20, churnProbability: 0.1, riskBand: "Low" },
          { hshdNum: 30, churnProbability: 0.5, riskBand: "Medium" },
        ],
      });
      await prisma.churnModelMetric.create({
        data: {
          accuracy: 0.96,
          rocAuc: 0.99,
          churnRate: 0.092,
          topDrivers: "recency_days, tenure_days",
        },
      });
      authHeader = await register();
    });

    afterAll(async () => {
      await wipe();
      await prisma.user.deleteMany();
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/churn/at-risk");
      expect(res.status).toBe(401);
    });

    it("ranks at-risk households by churn probability", async () => {
      const res = await request(app)
        .get("/api/churn/at-risk")
        .set("Authorization", authHeader);
      expect(res.status).toBe(200);
      expect(res.body.households.map((h: { hshdNum: number }) => h.hshdNum)).toEqual([
        10, 30, 20,
      ]);
    });

    it("respects the limit parameter", async () => {
      const res = await request(app)
        .get("/api/churn/at-risk?limit=1")
        .set("Authorization", authHeader);
      expect(res.body.households).toHaveLength(1);
      expect(res.body.households[0].hshdNum).toBe(10);
    });

    it("summarizes risk bands and the model", async () => {
      const res = await request(app)
        .get("/api/churn/summary")
        .set("Authorization", authHeader);
      expect(res.body.bands).toEqual([
        { band: "High", count: 1 },
        { band: "Medium", count: 1 },
        { band: "Low", count: 1 },
      ]);
      expect(res.body.model).toEqual({
        accuracy: 0.96,
        rocAuc: 0.99,
        churnRate: 0.092,
        topDrivers: ["recency_days", "tenure_days"],
      });
    });

    it("includes the household's risk on its data pull", async () => {
      const res = await request(app)
        .get("/api/households/10/pull")
        .set("Authorization", authHeader);
      expect(res.status).toBe(200);
      expect(res.body.churn).toEqual({ probability: 0.92, band: "High" });
    });
  });

  describe("with no scores", () => {
    beforeAll(async () => {
      await wipe();
      authHeader = await register();
    });

    afterAll(async () => {
      await prisma.user.deleteMany();
      await prisma.$disconnect();
    });

    it("returns an empty at-risk list and zeroed bands", async () => {
      const atRisk = await request(app)
        .get("/api/churn/at-risk")
        .set("Authorization", authHeader);
      const summary = await request(app)
        .get("/api/churn/summary")
        .set("Authorization", authHeader);

      expect(atRisk.body.households).toEqual([]);
      expect(summary.body.bands).toEqual([
        { band: "High", count: 0 },
        { band: "Medium", count: 0 },
        { band: "Low", count: 0 },
      ]);
      expect(summary.body.model).toBeNull();
    });
  });
});
