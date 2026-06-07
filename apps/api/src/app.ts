// Builds the Express application and wires up routes. Kept separate from server.ts
// so tests can import a fresh app instance without starting a real HTTP listener.

import express from "express";
import { healthRouter } from "./modules/health/health.controller";
import { householdsRouter } from "./modules/households/households.controller";
import { ingestRouter } from "./modules/ingest/ingest.controller";
import { dashboardRouter } from "./modules/dashboard/dashboard.controller";
import { basketRouter } from "./modules/basket/basket.controller";
import { churnRouter } from "./modules/churn/churn.controller";
import { authRouter } from "./modules/auth/auth.controller";
import { requireAuth } from "./modules/auth/auth.middleware";

export function createApp() {
  const app = express();

  app.use(express.json());

  // Mount feature routers under the /api prefix. Each phase adds one.
  // In production the React build is served at the root, with the API under /api,
  // so the frontend uses the same relative URLs in dev and prod.
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  // The household data pull is protected: a valid bearer token is required.
  app.use("/api/households", requireAuth, householdsRouter);
  // Data loading (uploading the latest datasets) is likewise protected.
  app.use("/api/ingest", requireAuth, ingestRouter);
  // The analytics dashboard is protected too.
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  // Basket analysis (precomputed rules + co-purchase model) is protected.
  app.use("/api/basket", requireAuth, basketRouter);
  // Churn prediction (precomputed per-household risk) is protected.
  app.use("/api/churn", requireAuth, churnRouter);

  return app;
}
