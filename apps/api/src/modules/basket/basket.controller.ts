// CONTROLLER layer: HTTP only. Serves the precomputed association rules and the
// co-purchase model summary. Mounted behind requireAuth in app.ts.

import { Router } from "express";
import { getBasketRules, getBasketModels } from "./basket.service";

export const basketRouter = Router();

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

basketRouter.get("/rules", async (req, res) => {
  const requested = Math.floor(Number(req.query.limit)) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
  const rules = await getBasketRules(limit);
  res.json({ rules });
});

basketRouter.get("/model", async (_req, res) => {
  const models = await getBasketModels();
  res.json({ models });
});
