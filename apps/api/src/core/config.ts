// Centralized configuration. Every environment value is read in ONE place, so
// nothing elsewhere reaches into process.env directly.

export const config = {
  port: Number(process.env.API_PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // In production the API also serves the built React app from this directory
  // (same-origin). Empty in dev, where Vite serves the UI and proxies /api.
  staticDir: process.env.STATIC_DIR ?? "",
};
