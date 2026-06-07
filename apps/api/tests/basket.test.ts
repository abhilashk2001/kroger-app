// Integration test for the basket-analysis endpoints, at the HTTP seam. The API only
// serves precomputed rows, so the test seeds the basket tables directly via Prisma
// (standing in for an ml/basket_analysis.py run) and asserts the serving behavior.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/core/prisma";

const app = createApp();
let authHeader: string;

async function register() {
  await prisma.user.deleteMany();
  const res = await request(app).post("/api/auth/register").send({
    username: "basket_tester",
    email: "basket_tester@example.com",
    password: "password123",
  });
  return `Bearer ${res.body.token}`;
}

describe("GET /api/basket", () => {
  describe("with seeded results", () => {
    beforeAll(async () => {
      await prisma.basketRule.deleteMany();
      await prisma.basketModelMetric.deleteMany();
      await prisma.basketRule.createMany({
        data: [
          { antecedents: "BREAD", consequents: "MILK", support: 0.02, confidence: 0.3, lift: 1.5 },
          { antecedents: "PASTA, PASTA SAUCE", consequents: "PARMESAN", support: 0.01, confidence: 0.4, lift: 4.2 },
          { antecedents: "EGGS", consequents: "BACON", support: 0.015, confidence: 0.25, lift: 2.1 },
        ],
      });
      await prisma.basketModelMetric.create({
        data: {
          targetCommodity: "GROCERY STAPLE",
          accuracy: 0.81,
          rocAuc: 0.72,
          topDrivers: "PRODUCE, DAIRY, FROZEN FOOD",
        },
      });
      authHeader = await register();
    });

    afterAll(async () => {
      await prisma.basketRule.deleteMany();
      await prisma.basketModelMetric.deleteMany();
      await prisma.user.deleteMany();
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/basket/rules");
      expect(res.status).toBe(401);
    });

    it("returns rules ordered by lift, with lists split into arrays", async () => {
      const res = await request(app)
        .get("/api/basket/rules")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.rules.map((r: { lift: number }) => r.lift)).toEqual([4.2, 2.1, 1.5]);
      expect(res.body.rules[0]).toMatchObject({
        antecedents: ["PASTA", "PASTA SAUCE"],
        consequents: ["PARMESAN"],
        confidence: 0.4,
      });
    });

    it("respects the limit parameter", async () => {
      const res = await request(app)
        .get("/api/basket/rules?limit=1")
        .set("Authorization", authHeader);
      expect(res.body.rules).toHaveLength(1);
      expect(res.body.rules[0].lift).toBe(4.2);
    });

    it("returns the model summary with drivers split into an array", async () => {
      const res = await request(app)
        .get("/api/basket/model")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.models).toEqual([
        {
          targetCommodity: "GROCERY STAPLE",
          accuracy: 0.81,
          rocAuc: 0.72,
          topDrivers: ["PRODUCE", "DAIRY", "FROZEN FOOD"],
        },
      ]);
    });
  });

  describe("with no precomputed results", () => {
    beforeAll(async () => {
      await prisma.basketRule.deleteMany();
      await prisma.basketModelMetric.deleteMany();
      authHeader = await register();
    });

    afterAll(async () => {
      await prisma.user.deleteMany();
      await prisma.$disconnect();
    });

    it("returns empty arrays, not an error", async () => {
      const rules = await request(app)
        .get("/api/basket/rules")
        .set("Authorization", authHeader);
      const model = await request(app)
        .get("/api/basket/model")
        .set("Authorization", authHeader);

      expect(rules.status).toBe(200);
      expect(rules.body.rules).toEqual([]);
      expect(model.body.models).toEqual([]);
    });
  });
});
