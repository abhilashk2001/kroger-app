import { useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

// Mirrors the API's LoadReport.
interface LoadReport {
  households: number;
  products: number;
  transactions: number;
  skippedTransactions: number;
}

// The three file parts the API expects — names must match the multer fields.
const FIELDS = [
  { name: "households", label: "Households CSV" },
  { name: "products", label: "Products CSV" },
  { name: "transactions", label: "Transactions CSV" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

export default function LoadData() {
  const { token, logout } = useAuth();
  const [files, setFiles] = useState<Record<FieldName, File | null>>({
    households: null,
    products: null,
    transactions: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<LoadReport | null>(null);

  function pick(name: FieldName, list: FileList | null) {
    setFiles((prev) => ({ ...prev, [name]: list?.[0] ?? null }));
  }

  const allChosen = FIELDS.every((f) => files[f.name]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!allChosen) {
      setError("Please choose all three CSV files.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);

    // FormData produces the multipart/form-data body. We do NOT set a
    // Content-Type header — the browser adds it (with the boundary) for us.
    const body = new FormData();
    for (const f of FIELDS) body.append(f.name, files[f.name] as File);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (res.status === 401) {
        logout();
        throw new Error("Session expired — please log in again.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
      setReport(data as LoadReport);
    } catch (err) {
      setReport(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <p style={{ color: "#555" }}>
        Upload the latest Households, Products, and Transactions CSV files. Loading
        replaces the current dataset; afterwards, search reflects the new data.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {FIELDS.map((f) => (
          <label key={f.name} style={styles.field}>
            <span style={styles.label}>{f.label}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => pick(f.name, e.target.files)}
            />
          </label>
        ))}

        <button type="submit" disabled={!allChosen || loading} style={styles.button}>
          {loading ? "Loading…" : "Load data"}
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {report && !error && (
        <div style={styles.report}>
          <strong>Load complete.</strong>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.td}>Households loaded</td>
                <td style={styles.num}>{report.households}</td>
              </tr>
              <tr>
                <td style={styles.td}>Products loaded</td>
                <td style={styles.num}>{report.products}</td>
              </tr>
              <tr>
                <td style={styles.td}>Transactions loaded</td>
                <td style={styles.num}>{report.transactions}</td>
              </tr>
              <tr>
                <td style={styles.td}>Transactions skipped (orphans)</td>
                <td style={styles.num}>{report.skippedTransactions}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    margin: "1rem 0",
    maxWidth: 420,
  },
  field: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontSize: "0.9rem", color: "#333", fontWeight: 600 },
  button: {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    border: "1px solid #4a7",
    background: "#4a7",
    color: "white",
    borderRadius: 6,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  error: {
    padding: "0.75rem 1rem",
    borderRadius: 6,
    background: "#fce8e6",
    border: "1px solid #e0a3a0",
  },
  report: {
    padding: "1rem",
    borderRadius: 6,
    background: "#eef7f0",
    border: "1px solid #b7dcc0",
    maxWidth: 420,
  },
  table: { borderCollapse: "collapse", width: "100%", marginTop: "0.5rem" },
  td: { padding: "0.3rem 0", color: "#333" },
  num: { padding: "0.3rem 0", textAlign: "right", fontWeight: 600 },
};
