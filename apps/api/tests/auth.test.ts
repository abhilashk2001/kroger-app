// Integration tests for authentication, at the HTTP seam, against the test database.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/core/prisma";

const app = createApp();

const creds = {
  username: "alice",
  email: "alice@example.com",
  password: "password123",
};

describe("auth", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("registers a user and stores only a hash (never the plain password)", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      username: "alice",
      email: "alice@example.com",
    });
    expect(res.body.user.passwordHash).toBeUndefined();

    const stored = await prisma.user.findUnique({ where: { username: "alice" } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe(creds.password);
  });

  it("rejects duplicate registration with 409", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(409);
  });

  it("rejects invalid input with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "x", email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ usernameOrEmail: "alice", password: creds.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ usernameOrEmail: "alice", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("guards /me: 401 without a token, 200 with a valid token", async () => {
    const noToken = await request(app).get("/api/auth/me");
    expect(noToken.status).toBe(401);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ usernameOrEmail: "alice", password: creds.password });
    const withToken = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(withToken.status).toBe(200);
    expect(withToken.body.user.username).toBe("alice");
  });
});
