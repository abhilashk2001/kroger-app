// CONTROLLER layer: HTTP only. Serves the at-risk ranking and the risk-band /
// model summary. Mounted behind requireAuth in app.ts.

import { Router } from "express";
import { getAtRisk, getChurnSummary } from "./churn.service";

export const churnRouter = Router();

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

churnRouter.get("/at-risk", async (req, res) => {
  const requested = Math.floor(Number(req.query.limit)) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
  const households = await getAtRisk(limit);
  res.json({ households });
});

churnRouter.get("/summary", async (_req, res) => {
  res.json(await getChurnSummary());
});
