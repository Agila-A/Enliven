import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js";
import { Compass } from "lucide-react";

import webImg from "../../utils/assets/web.jfif";
import aiImg from "../../utils/assets/aiml.jfif";
import dsaImg from "../../utils/assets/dsa.jfif";
import cyberImg from "../../utils/assets/cyber.jfif";
import cloudImg from "../../utils/assets/cloud.jfif";
import appImg from "../../utils/assets/app.jfif";

const DOMAINS = [
  { name: "Web Development", img: webImg },
  { name: "AI/ML", img: aiImg },
  { name: "Data Structures & Algorithms", img: dsaImg },
  { name: "Cybersecurity", img: cyberImg },
  { name: "Cloud/DevOps", img: cloudImg },
  { name: "App Development", img: appImg },
];

export default function DomainSelect() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!domain)
      return setMsg({ type: "error", text: "Please pick a domain" });

    try {
      setLoading(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/select-domain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ domain }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save domain");

      setMsg({ type: "success", text: `Saved: ${data.domain}` });
      localStorage.setItem("domain", data.domain);

      await updateStudyBuddyContext({
        event: "domain_selected",
        domain: data.domain,
      });

      setTimeout(() => {
        navigate("/initial-assessment");
      }, 800);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream/30 font-sans p-6 overflow-hidden relative">
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-red/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] p-10 md:p-14 shadow-soft border border-white/50 relative z-10">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-red/10 rounded-full flex items-center justify-center">
                <Compass className="w-8 h-8 text-red" />
            </div>
            <h2 className="text-4xl font-bold text-foreground tracking-tight">
              Choose your domain
            </h2>
          </div>
          <p className="text-foreground/60 text-lg font-medium md:ml-18">
            Let’s personalize your learning journey
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {DOMAINS.map((d) => {
            const isSelected = domain === d.name;

            return (
              <div
                key={d.name}
                onClick={() => setDomain(d.name)}
                className={`relative h-48 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 group ${
                  isSelected
                    ? "border-4 border-red shadow-lg transform scale-105"
                    : "border-2 border-cream/50 shadow-sm hover:border-yellow/50 hover:shadow-soft"
                }`}
              >
                {/* Image */}
                <img
                  src={d.img}
                  alt={d.name}
                  className="w-full h-full object-cover transition-transform duration-500 filter brightness-75 group-hover:scale-110 group-hover:brightness-90"
                  onError={(e) => {
                    // Fallback to solid color if missing
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('bg-foreground');
                  }}
                />

                {/* Overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center p-6 text-center transition-all duration-300 ${
                    isSelected
                      ? "bg-red/40 backdrop-blur-sm"
                      : "bg-black/40 group-hover:bg-black/20"
                  }`}
                >
                  <span className={`text-xl font-bold text-white drop-shadow-md`}>
                    {d.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Button */}
        <form onSubmit={onSubmit} className="max-w-xs mx-auto md:mx-0 md:ml-auto">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-red text-white font-bold text-lg shadow-md hover:shadow-lg hover:bg-red/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red/50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>

        {/* Message */}
        {msg && (
          <div
            className={`mt-6 p-4 rounded-xl text-center font-semibold text-sm ${
              msg.type === "success" 
                ? "bg-green/10 text-green border border-green/20" 
                : "bg-red/10 text-red border border-red/20"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}