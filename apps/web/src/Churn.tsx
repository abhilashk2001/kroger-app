import { useEffect, useState, type CSSProperties } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAuth } from "./AuthContext";

interface AtRisk {
  hshdNum: number;
  churnProbability: number;
  riskBand: string;
}
interface Band {
  band: string;
  count: number;
}
interface Model {
  accuracy: number;
  rocAuc: number;
  churnRate: number;
  topDrivers: string[];
}
interface Summary {
  bands: Band[];
  model: Model | null;
}

export const BAND_COLORS: Record<string, string> = {
  High: "#d9534f",
  Medium: "#e8a33d",
  Low: "#4a7",
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function RiskBadge({ band, probability }: { band: string; probability: number }) {
  return (
    <span style={{ ...badge, background: BAND_COLORS[band] ?? "#888" }}>
      {band} risk · {pct(probability)}
    </span>
  );
}

export default function Churn() {
  const { token, logout } = useAuth();
  const [atRisk, setAtRisk] = useState<AtRisk[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const opts = { headers: { Authorization: `Bearer ${token}` } };

    Promise.all([
      fetch("/api/churn/at-risk?limit=25", opts),
      fetch("/api/churn/summary", opts),
    ])
      .then(async ([aRes, sRes]) => {
        if (aRes.status === 401 || sRes.status === 401) {
          logout();
          throw new Error("Session expired. Please log in again.");
        }
        if (!aRes.ok || !sRes.ok) throw new Error("Request failed.");
        const a = await aRes.json();
        const s = await sRes.json();
        if (!cancelled) {
          setAtRisk(a.households);
          setSummary(s);
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

  if (loading) return <p>Loading churn analysis…</p>;
  if (error) return <div style={styles.error}>{error}</div>;

  const hasData = atRisk.length > 0 || (summary?.model ?? null) !== null;
  if (!hasData) {
    return (
      <div style={styles.empty}>
        No churn scores yet. Load some data, then run the churn job:
        <pre style={styles.code}>docker compose run --rm ml python churn.py</pre>
        then refresh this tab.
      </div>
    );
  }

  return (
    <section>
      <p style={{ color: "#555" }}>
        Which households look most likely to stop shopping, scored by a Gradient
        Boosting model. Recency and tenure carry most of the weight.
      </p>

      <div style={styles.topRow}>
        {summary?.model && (
          <div style={styles.modelCard}>
            <h3 style={styles.cardTitle}>Churn model</h3>
            <div style={styles.stats}>
              <div style={styles.stat}>
                <span style={styles.statNum}>{pct(summary.model.accuracy)}</span>
                <span style={styles.statLabel}>accuracy</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{summary.model.rocAuc.toFixed(3)}</span>
                <span style={styles.statLabel}>ROC-AUC</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{pct(summary.model.churnRate)}</span>
                <span style={styles.statLabel}>base churn rate</span>
              </div>
            </div>
            <p style={{ margin: "0.5rem 0 0", color: "#555", fontSize: "0.9rem" }}>
              Top drivers: <strong>{summary.model.topDrivers.join(", ")}</strong>
            </p>
          </div>
        )}

        {summary && (
          <div style={styles.chartCard}>
            <h3 style={styles.cardTitle}>Risk distribution</h3>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={summary.bands} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="band" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {summary.bands.map((b) => (
                      <Cell key={b.band} fill={BAND_COLORS[b.band] ?? "#888"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: "0.5rem" }}>Most at-risk households</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Household", "Churn probability", "Risk band"].map((h) => (
                <th key={h} style={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atRisk.map((h) => (
              <tr key={h.hshdNum}>
                <td style={styles.td}>{h.hshdNum}</td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                  {pct(h.churnProbability)}
                </td>
                <td style={styles.td}>
                  <span style={{ ...pill, background: BAND_COLORS[h.riskBand] ?? "#888" }}>
                    {h.riskBand}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const badge: CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.55rem",
  borderRadius: 12,
  color: "white",
  fontSize: "0.8rem",
  fontWeight: 600,
};

const pill: CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.5rem",
  borderRadius: 10,
  color: "white",
  fontSize: "0.8rem",
  fontWeight: 600,
};

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
  topRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1.5rem",
    margin: "1rem 0 1.5rem",
  },
  modelCard: {
    border: "1px solid #b7dcc0",
    background: "#eef7f0",
    borderRadius: 8,
    padding: "1rem",
    flex: "1 1 300px",
  },
  chartCard: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: "1rem",
    flex: "1 1 300px",
  },
  cardTitle: { margin: "0 0 0.75rem", fontSize: "1rem" },
  stats: { display: "flex", gap: "1.5rem" },
  stat: { display: "flex", flexDirection: "column" },
  statNum: { fontSize: "1.5rem", fontWeight: 700, color: "#2f7d4f" },
  statLabel: { fontSize: "0.8rem", color: "#666" },
  table: { borderCollapse: "collapse", width: "100%", fontSize: "0.9rem", maxWidth: 520 },
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
