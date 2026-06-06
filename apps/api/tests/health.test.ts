// Integration test at the HIGH SEAM: we send a real HTTP request to /health and
// assert on the response, exercising the full stack (controller -> service ->
// repository -> database). This requires the database to be reachable.

import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("GET /api/health", () => {
  it("returns 200 and reports the database as connected", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.database).toBe("connected");
  });
});
