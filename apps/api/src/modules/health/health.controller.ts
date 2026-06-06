// CONTROLLER layer: HTTP only. It maps an incoming request to a service call and
// translates the result into an HTTP response (status code + JSON body). No logic,
// no database.

import { Router } from "express";
import { getHealth } from "./health.service";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const health = await getHealth();
  // 200 when healthy, 503 (Service Unavailable) when the DB is unreachable.
  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});
