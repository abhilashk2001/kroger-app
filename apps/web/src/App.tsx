import { useEffect, useState } from "react";

interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Relative URL -> Vite proxies "/api/*" to the API container in dev, and in
    // production the same path is served by Express at the same origin.
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err) => setError(String(err)));
  }, []);

  const ok = health?.status === "ok";

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: 640,
        margin: "0 auto",
        lineHeight: 1.5,
      }}
    >
      <h1>Kroger Retail Analytics</h1>
      <p style={{ color: "#555" }}>
        Phase 1 — foundation skeleton. Live frontend ↔ API ↔ database check:
      </p>

      {error && (
        <div style={{ padding: "1rem", borderRadius: 8, background: "#fce8e6" }}>
          API unreachable: {error}
        </div>
      )}

      {!error && !health && <p>Checking API…</p>}

      {health && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: 8,
            background: ok ? "#e6f4ea" : "#fce8e6",
            border: `1px solid ${ok ? "#9bcfae" : "#e0a3a0"}`,
          }}
        >
          <div>
            <strong>API status:</strong> {health.status}
          </div>
          <div>
            <strong>Database:</strong> {health.database}
          </div>
          <div>
            <strong>Checked at:</strong> {health.timestamp}
          </div>
        </div>
      )}
    </main>
  );
}
