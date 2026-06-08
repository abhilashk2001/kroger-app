import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { RiskBadge } from "./Churn";

const PAGE_SIZE = 50;

interface PullRow {
  basketNum: number;
  purchaseDate: string;
  productNum: number;
  department: string;
  commodity: string;
  spend: string;
  units: number;
  storeRegion: string;
  weekNum: number;
  year: number;
}

interface Pull {
  hshdNum: number;
  page: number;
  pageSize: number;
  total: number;
  churn: { probability: number; band: string } | null;
  rows: PullRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function HouseholdSearch() {
  const { token, logout } = useAuth();
  const [input, setInput] = useState("");
  const [household, setHousehold] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Pull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (household === null) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/households/${household}/pull?page=${page}&pageSize=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          logout();
          throw new Error("Session expired. Please log in again.");
        }
        if (res.status === 404) throw new Error(`Household ${household} not found.`);
        if (!res.ok) throw new Error(`Request failed (${res.status}).`);
        return res.json();
      })
      .then((json: Pull) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setData(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [household, page, token, logout]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(input.trim());
    if (!Number.isInteger(n) || n <= 0) {
      setError("Enter a valid household number.");
      setData(null);
      setHousehold(null);
      return;
    }
    setError(null);
    setPage(1);
    setHousehold(n);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <p style={{ color: "#555" }}>
        Look up a household by number to see its full purchase history.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 577"
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Search
        </button>
      </form>

      {loading && <p>Loading…</p>}
      {error && <div style={styles.error}>{error}</div>}

      {data && !loading && !error && (
        <>
          <p style={{ color: "#555", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <span>
              Household <strong>{data.hshdNum}</strong> · {data.total} line
              {data.total === 1 ? "" : "s"}
              {data.total > 0 && (
                <>
                  {" "}
                  · page {data.page} of {totalPages}
                </>
              )}
            </span>
            {data.churn && (
              <RiskBadge band={data.churn.band} probability={data.churn.probability} />
            )}
          </p>

          {data.total === 0 ? (
            <p>No purchases found for this household.</p>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Basket", "Date", "Product #", "Department", "Commodity", "Spend", "Units", "Region", "Week", "Year"].map((h) => (
                        <th key={h} style={styles.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{r.basketNum}</td>
                        <td style={styles.td}>{formatDate(r.purchaseDate)}</td>
                        <td style={styles.td}>{r.productNum}</td>
                        <td style={styles.td}>{r.department}</td>
                        <td style={styles.td}>{r.commodity}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          ${Number(r.spend).toFixed(2)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>{r.units}</td>
                        <td style={styles.td}>{r.storeRegion}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>{r.weekNum}</td>
                        <td style={styles.td}>{r.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.pager}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  style={styles.button}
                >
                  ← Prev
                </button>
                <span>
                  Page {data.page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={data.page >= totalPages}
                  style={styles.button}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  form: { display: "flex", gap: "0.5rem", margin: "1rem 0" },
  input: {
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: 6,
    width: 200,
  },
  button: {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    border: "1px solid #4a7",
    background: "#4a7",
    color: "white",
    borderRadius: 6,
    cursor: "pointer",
  },
  error: {
    padding: "0.75rem 1rem",
    borderRadius: 6,
    background: "#fce8e6",
    border: "1px solid #e0a3a0",
  },
  table: { borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" },
  th: {
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    padding: "0.4rem 0.6rem",
    whiteSpace: "nowrap",
  },
  td: { borderBottom: "1px solid #eee", padding: "0.35rem 0.6rem", whiteSpace: "nowrap" },
  pager: { display: "flex", gap: "1rem", alignItems: "center", marginTop: "1rem" },
};
