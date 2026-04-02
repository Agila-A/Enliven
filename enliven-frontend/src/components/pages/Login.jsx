import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginImg from "../../utils/assets/login.png"; // 👈 your image

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("token", data.token);

      if (!data.user?.domain) {
        navigate("/select-domain");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* LEFT PANEL */}
      <div
        style={{
          flex: 1,
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "320px" }}>
          <h2 style={{ fontSize: "26px", marginBottom: "8px" }}>Login</h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "30px" }}>
            Enter your account details
          </p>

          {error && (
            <p style={{ color: "#f87171", marginBottom: "10px" }}>{error}</p>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              style={inputStyle}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p style={{ marginTop: "20px", fontSize: "13px", color: "#94a3b8" }}>
            Don’t have an account?{" "}
            <span
              style={{ color: "#a78bfa", cursor: "pointer" }}
              onClick={() => navigate("/signup")}
            >
              Sign up
            </span>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: 1,
          background: "#8b5cf6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", color: "#fff" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "600" }}>
            Welcome to
          </h1>
          <h1 style={{ fontSize: "36px", fontWeight: "700" }}>
            Enliven
          </h1>
          <p style={{ marginTop: "10px", opacity: 0.9 }}>
            Login to access your account
          </p>

          <img
            src={loginImg}
            alt="illustration"
            style={{
              width: "80%",
              maxWidth: "400px",
              marginTop: "30px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* 🔥 Styles */
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "14px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "transparent",
  color: "#fff",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#8b5cf6",
  color: "#fff",
  cursor: "pointer",
  marginTop: "10px",
  fontWeight: "500",
};