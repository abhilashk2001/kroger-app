// Builds the Express application and wires up routes. Kept separate from server.ts
// so tests can import a fresh app instance without starting a real HTTP listener.

import path from "node:path";
import express from "express";
import { config } from "./core/config";
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

  // In production the API also serves the built React app same-origin. The API
  // routes above keep priority; any other path serves index.html so the SPA loads
  // (and a refresh on a client path still works). Inert in dev (staticDir empty).
  if (config.nodeEnv === "production" && config.staticDir) {
    app.use(express.static(config.staticDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(config.staticDir, "index.html"));
    });
  }

  return app;
}
