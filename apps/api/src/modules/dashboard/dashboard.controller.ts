// CONTROLLER layer: HTTP only. Returns the assembled dashboard summary. The route
// is mounted behind requireAuth in app.ts, so no auth handling is needed here.

import { Router } from "express";
import { getDashboard } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  try {
    const summary = await getDashboard();
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to build the dashboard." });
  }
});
