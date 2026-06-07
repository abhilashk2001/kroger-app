import { useEffect, useState, type CSSProperties } from "react";
import { useAuth } from "./AuthContext";

interface Rule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
}
interface Model {
  targetCommodity: string;
  accuracy: number;
  rocAuc: number;
  topDrivers: string[];
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function BasketAnalysis() {
  const { token, logout } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const opts = { headers: { Authorization: `Bearer ${token}` } };

    Promise.all([
      fetch("/api/basket/rules?limit=25", opts),
      fetch("/api/basket/model", opts),
    ])
      .then(async ([rRes, mRes]) => {
        if (rRes.status === 401 || mRes.status === 401) {
          logout();
          throw new Error("Session expired — please log in again.");
        }
        if (!rRes.ok || !mRes.ok) throw new Error("Request failed.");
        const r = await rRes.json();
        const m = await mRes.json();
        if (!cancelled) {
          setRules(r.rules);
          setModels(m.models);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  if (loading) return <p>Loading basket analysis…</p>;
  if (error) return <div style={styles.error}>{error}</div>;

  if (rules.length === 0 && models.length === 0) {
    return (
      <div style={styles.empty}>
        No basket analysis has been computed yet. After loading data, run the offline
        job:
        <pre style={styles.code}>docker compose run --rm ml python basket_analysis.py</pre>
        then refresh this tab.
      </div>
    );
  }

  return (
    <section>
      <p style={{ color: "#555" }}>
        Commodities frequently bought together (association rules, ranked by lift), and
        a Gradient Boosting model predicting co-purchase.
      </p>

      {models.map((m) => (
        <div key={m.targetCommodity} style={styles.modelCard}>
          <h3 style={styles.cardTitle}>
            Co-purchase model — predicting <em>{m.targetCommodity}</em>
          </h3>
          <div style={styles.stats}>
            <div style={styles.stat}>
              <span style={styles.statNum}>{pct(m.accuracy)}</span>
              <span style={styles.statLabel}>accuracy</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNum}>{m.rocAuc.toFixed(3)}</span>
              <span style={styles.statLabel}>ROC-AUC</span>
            </div>
          </div>
          <p style={{ margin: "0.5rem 0 0", color: "#555", fontSize: "0.9rem" }}>
            Top co-purchase drivers: <strong>{m.topDrivers.join(", ")}</strong>
          </p>
        </div>
      ))}

      <h3 style={{ marginBottom: "0.5rem" }}>Top cross-sell rules</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["If a basket has…", "…it also has", "Lift", "Confidence", "Support"].map(
                (h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={i}>
                <td style={styles.td}>{r.antecedents.join(" + ")}</td>
                <td style={styles.td}>{r.consequents.join(" + ")}</td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                  {r.lift.toFixed(2)}×
                </td>
                <td style={{ ...styles.td, textAlign: "right" }}>{pct(r.confidence)}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>{pct(r.support)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  error: {
    padding: "0.75rem 1rem",
    borderRadius: 6,
    background: "#fce8e6",
    border: "1px solid #e0a3a0",
  },
  empty: {
    padding: "1.5rem",
    borderRadius: 8,
    background: "#f6f6f6",
    border: "1px dashed #ccc",
    color: "#555",
    maxWidth: 680,
  },
  code: {
    background: "#272822",
    color: "#f8f8f2",
    padding: "0.6rem 0.8rem",
    borderRadius: 6,
    overflowX: "auto",
    margin: "0.6rem 0",
  },
  modelCard: {
    border: "1px solid #b7dcc0",
    background: "#eef7f0",
    borderRadius: 8,
    padding: "1rem",
    margin: "1rem 0 1.5rem",
    maxWidth: 520,
  },
  cardTitle: { margin: "0 0 0.75rem", fontSize: "1rem" },
  stats: { display: "flex", gap: "2rem" },
  stat: { display: "flex", flexDirection: "column" },
  statNum: { fontSize: "1.6rem", fontWeight: 700, color: "#2f7d4f" },
  statLabel: { fontSize: "0.8rem", color: "#666" },
  table: { borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" },
  th: {
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    padding: "0.4rem 0.6rem",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "0.35rem 0.6rem",
    whiteSpace: "nowrap",
  },
};
