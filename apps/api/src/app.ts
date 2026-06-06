// Builds the Express application and wires up routes. Kept separate from server.ts
// so tests can import a fresh app instance without starting a real HTTP listener.

import express from "express";
import { healthRouter } from "./modules/health/health.controller";
import { householdsRouter } from "./modules/households/households.controller";

export function createApp() {
  const app = express();

  app.use(express.json());

  // Mount feature routers under the /api prefix. Each phase adds one.
  // In production the React build is served at the root, with the API under /api,
  // so the frontend uses the same relative URLs in dev and prod.
  app.use("/api/health", healthRouter);
  app.use("/api/households", householdsRouter);

  return app;
}
