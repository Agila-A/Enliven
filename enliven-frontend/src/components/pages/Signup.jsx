import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginImg from "../../utils/assets/signup.png"; 

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("token", data.token);

      navigate("/select-domain");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* LEFT PANEL */}
      <div className="flex-1 bg-cream flex items-center justify-center p-8 md:p-12 relative overflow-hidden">
        {/* Decorative elements for the modern soft look */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-yellow/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-green/20 rounded-full blur-3xl"></div>

        <div className="w-full max-w-sm relative z-10 bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-soft border border-white/40">
          <h2 className="text-3xl font-bold text-foreground mb-2">Create Account</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Start your learning journey
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red/10 border border-red/30 text-red rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
              <input
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red/50 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red/50 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red/50 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red text-white font-semibold shadow-md hover:shadow-lg hover:bg-red/90 transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-red/50 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-foreground/70">
            Already have an account?{" "}
            <button
              type="button"
              className="text-red font-semibold hover:underline focus:outline-none"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden md:flex flex-1 bg-yellow items-center justify-center p-12 relative overflow-hidden">
        {/* Abstract circles */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cream/30 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-red/10 rounded-full blur-3xl mix-blend-overlay"></div>

        <div className="text-center text-foreground relative z-10 flex flex-col items-center">
          <div className="bg-white/30 p-6 rounded-3xl backdrop-blur-sm border border-white/40 mb-8 inline-block shadow-soft">
            <h1 className="text-4xl font-semibold mb-2 text-foreground/80">Join</h1>
            <h1 className="text-6xl font-black tracking-tight text-foreground drop-shadow-md">
              Enliven
            </h1>
          </div>
          
          <p className="text-lg text-foreground/80 max-w-md mx-auto mb-10 font-bold whitespace-pre-line">
            Create your account and start learning
          </p>

          <img
            src={loginImg}
            alt="illustration"
            className="w-full max-w-md rounded-2xl shadow-soft block transition-transform duration-700 hover:scale-[1.02]"
            onError={(e) => {
              // fallback if image is missing
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
}