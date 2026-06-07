// Integration test for the data-loading endpoint, at the HTTP seam. Uploads the
// three fixture CSVs as a multipart request, then reads the data back through the
// household pull endpoint to prove the search reflects the upload (requirement
// #4 -> #3). Runs against the test database with a registered user's token.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/core/prisma";

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixtures = {
  households: path.join(dir, "fixtures/households.csv"),
  products: path.join(dir, "fixtures/products.csv"),
  transactions: path.join(dir, "fixtures/transactions.csv"),
};

const app = createApp();
let authHeader: string;

describe("POST /api/ingest", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
    const res = await request(app).post("/api/auth/register").send({
      username: "ingest_tester",
      email: "ingest_tester@example.com",
      password: "password123",
    });
    authHeader = `Bearer ${res.body.token}`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/ingest");
    expect(res.status).toBe(401);
  });

  it("loads the three uploaded datasets and reports the counts", async () => {
    const res = await request(app)
      .post("/api/ingest")
      .set("Authorization", authHeader)
      .attach("households", fixtures.households)
      .attach("products", fixtures.products)
      .attach("transactions", fixtures.transactions);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      households: 2,
      products: 2,
      transactions: 3, // one of the four rows references an unknown product...
      skippedTransactions: 1, // ...and is skipped as an orphan.
    });
  });

  it("makes the uploaded data visible to the household pull (req #4 -> #3)", async () => {
    const res = await request(app)
      .get("/api/households/10/pull")
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.rows.map((r: { productNum: number }) => r.productNum)).toEqual([
      100, 200,
    ]);
  });

  it("returns 400 when a required file is missing", async () => {
    const res = await request(app)
      .post("/api/ingest")
      .set("Authorization", authHeader)
      .attach("households", fixtures.households)
      .attach("products", fixtures.products);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/transactions/);
  });
});
