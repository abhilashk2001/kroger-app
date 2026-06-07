import { useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register(username.trim(), email.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.main}>
      <h1>Kroger Retail Analytics</h1>
      <h2>{mode === "login" ? "Log in" : "Create an account"}</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          {mode === "login" ? "Username or email" : "Username"}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        {mode === "register" && (
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </label>
        )}

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Register"}
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          style={styles.link}
        >
          {mode === "login" ? "Register" : "Log in"}
        </button>
      </p>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    fontFamily: "system-ui, sans-serif",
    padding: "2rem",
    maxWidth: 400,
    margin: "3rem auto",
    lineHeight: 1.5,
  },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" },
  input: {
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: 6,
  },
  button: {
    padding: "0.6rem 1rem",
    fontSize: "1rem",
    border: "1px solid #4a7",
    background: "#4a7",
    color: "white",
    borderRadius: 6,
    cursor: "pointer",
  },
  link: {
    border: "none",
    background: "none",
    color: "#2a6",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "1rem",
    padding: 0,
  },
  error: {
    padding: "0.6rem 0.8rem",
    borderRadius: 6,
    background: "#fce8e6",
    border: "1px solid #e0a3a0",
    fontSize: "0.9rem",
  },
};
