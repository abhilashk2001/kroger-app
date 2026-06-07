// Integration test for the household pull endpoint, at the HTTP seam. The route is
// now protected, so we register a user and send the bearer token. Runs against the
// test database with a small fixture loaded in setup.

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

describe("GET /api/households/:hshdNum/pull", () => {
  beforeAll(async () => {
    await loadAll(prisma, fixtures);
    await prisma.user.deleteMany();
    const res = await request(app).post("/api/auth/register").send({
      username: "hh_tester",
      email: "hh_tester@example.com",
      password: "password123",
    });
    authHeader = `Bearer ${res.body.token}`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/households/10/pull");
    expect(res.status).toBe(401);
  });

  it("returns the household's purchases sorted by the required keys", async () => {
    const res = await request(app)
      .get("/api/households/10/pull")
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.hshdNum).toBe(10);
    expect(res.body.total).toBe(2);
    expect(res.body.rows.map((r: { productNum: number }) => r.productNum)).toEqual([
      100, 200,
    ]);
    expect(res.body.rows[0]).toMatchObject({
      basketNum: 1,
      department: "FOOD",
      commodity: "BREAD",
    });
  });

  it("paginates with page metadata", async () => {
    const res = await request(app)
      .get("/api/households/10/pull?page=1&pageSize=1")
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(1);
    expect(res.body.total).toBe(2);
    expect(res.body.rows).toHaveLength(1);
  });

  it("returns 404 for an unknown household", async () => {
    const res = await request(app)
      .get("/api/households/999999/pull")
      .set("Authorization", authHeader);
    expect(res.status).toBe(404);
  });

  it("returns 400 for a non-numeric household", async () => {
    const res = await request(app)
      .get("/api/households/abc/pull")
      .set("Authorization", authHeader);
    expect(res.status).toBe(400);
  });
});
