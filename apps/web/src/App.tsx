import { type CSSProperties } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import HouseholdSearch from "./HouseholdSearch";

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <p style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>Loading…</p>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Kroger — Household Data Pull</h1>
        <div style={styles.userBox}>
          <span style={{ color: "#555" }}>
            Signed in as <strong>{user.username}</strong>
          </span>
          <button onClick={logout} style={styles.logout}>
            Log out
          </button>
        </div>
      </header>
      <HouseholdSearch />
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    fontFamily: "system-ui, sans-serif",
    padding: "2rem",
    maxWidth: 960,
    margin: "0 auto",
    lineHeight: 1.5,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
    borderBottom: "1px solid #eee",
    paddingBottom: "1rem",
    marginBottom: "1rem",
  },
  userBox: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logout: {
    padding: "0.4rem 0.8rem",
    border: "1px solid #ccc",
    background: "white",
    borderRadius: 6,
    cursor: "pointer",
  },
};
