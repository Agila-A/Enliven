import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert("Signup successful! Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-sky-100 to-emerald-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <h1 className="text-3xl font-bold text-sky-700 text-center mb-6">Create Account</h1>

        {error && <p className="text-red-600 text-center mb-3">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none"
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-4 text-slate-600">
          Already have an account?
          <span
            className="text-sky-600 ml-1 cursor-pointer font-semibold"
            onClick={() => navigate("/login")}
          >
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
