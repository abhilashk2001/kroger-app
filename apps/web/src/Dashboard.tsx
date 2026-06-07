import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "./AuthContext";

// Mirrors the API's DashboardSummary.
interface PeriodSpend {
  period: string;
  spend: number;
}
interface DepartmentSpend {
  department: string;
  spend: number;
}
interface BrandSpend {
  brandType: string;
  spend: number;
}
interface OrganicSpend {
  organic: boolean;
  spend: number;
}
interface IncomePanel {
  incomeRange: string;
  avgSpendPerHousehold: number;
  households: number;
}
interface LoyaltyPanel {
  loyal: boolean;
  avgSpendPerHousehold: number;
  households: number;
}
interface Summary {
  spendOverTime: PeriodSpend[];
  spendByDepartment: DepartmentSpend[];
  brandMix: BrandSpend[];
  organicMix: OrganicSpend[];
  spendByIncome: IncomePanel[];
  loyalty: LoyaltyPanel[];
}

const COLORS = ["#4a7", "#79c", "#e9a", "#fc6", "#9b8", "#c87", "#6bd", "#da7"];
const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelTitle}>{title}</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>{children as never}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { token, logout } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          logout();
          throw new Error("Session expired — please log in again.");
        }
        if (!res.ok) throw new Error(`Request failed (${res.status}).`);
        return res.json();
      })
      .then((json: Summary) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  if (loading) return <p>Loading dashboard…</p>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!data) return null;

  const hasData = data.spendOverTime.length > 0;
  if (!hasData) {
    return (
      <div style={styles.empty}>
        No data loaded yet. Use the <strong>Load Data</strong> tab to upload the
        Households, Products, and Transactions CSVs, then come back here.
      </div>
    );
  }

  // Shape the boolean-keyed panels into chart-friendly labels.
  const organic = data.organicMix.map((o) => ({
    name: o.organic ? "Organic" : "Non-organic",
    spend: o.spend,
  }));
  const loyalty = data.loyalty.map((l) => ({
    name: l.loyal ? "Member" : "Non-member",
    avg: l.avgSpendPerHousehold,
  }));

  return (
    <section>
      <p style={{ color: "#555" }}>
        Aggregate view of the currently loaded data — engagement over time,
        category and brand preference, and how demographics relate to spend.
      </p>

      <div style={styles.grid}>
        <Panel title="Spend over time (monthly)">
          <LineChart data={data.spendOverTime} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Line type="monotone" dataKey="spend" stroke="#4a7" strokeWidth={2} dot={false} />
          </LineChart>
        </Panel>

        <Panel title="Spend by department (top 10)">
          <BarChart data={data.spendByDepartment} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Bar dataKey="spend" fill="#4a7" />
          </BarChart>
        </Panel>

        <Panel title="Brand preference">
          <PieChart>
            <Pie
              data={data.brandMix}
              dataKey="spend"
              nameKey="brandType"
              outerRadius={90}
              innerRadius={45}
              label={(e: { name?: string }) => e.name ?? ""}
            >
              {data.brandMix.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v))} />
          </PieChart>
        </Panel>

        <Panel title="Organic vs non-organic">
          <PieChart>
            <Pie
              data={organic}
              dataKey="spend"
              nameKey="name"
              outerRadius={90}
              innerRadius={45}
              label={(e: { name?: string }) => e.name ?? ""}
            >
              {organic.map((_, i) => (
                <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v))} />
          </PieChart>
        </Panel>

        <Panel title="Avg spend / household by income">
          <BarChart data={data.spendByIncome} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="incomeRange" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Bar dataKey="avgSpendPerHousehold" fill="#79c" />
          </BarChart>
        </Panel>

        <Panel title="Loyalty: avg spend / household">
          <BarChart data={loyalty} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Legend />
            <Bar dataKey="avg" name="Avg spend / household" fill="#e9a" />
          </BarChart>
        </Panel>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "1.5rem",
    marginTop: "1rem",
  },
  panel: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: "1rem",
    background: "white",
  },
  panelTitle: { margin: "0 0 0.5rem", fontSize: "1rem", color: "#333" },
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
    maxWidth: 640,
  },
};
