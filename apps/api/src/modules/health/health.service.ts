// SERVICE layer: business logic. It decides what "healthy" means by combining
// the repository's raw result into a meaningful status. It knows nothing about HTTP.

import { pingDatabase } from "./health.repository";

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  timestamp: string;
}

export async function getHealth(): Promise<HealthStatus> {
  const dbConnected = await pingDatabase();

  return {
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  };
}
