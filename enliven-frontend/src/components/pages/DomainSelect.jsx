import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js";

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        fontFamily: "Inter, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px", // 🔥 bigger container
          background: "#ffffff",
          borderRadius: "18px",
          padding: "36px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "6px",
            }}
          >
            Choose your domain
          </h2>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Let’s personalize your learning journey
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(250px, 1fr))",
            gap: "18px",
            marginBottom: "32px",
          }}
        >
          {DOMAINS.map((d) => {
            const isSelected = domain === d.name;

            return (
              <div
                key={d.name}
                onClick={() => setDomain(d.name)}
                style={{
                  position: "relative",
                  height: "160px", // 🔥 bigger cards
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: isSelected
                    ? "2px solid #4f46e5"
                    : "1px solid #e5e7eb",
                  transition: "all 0.25s ease",
                  boxShadow: isSelected
                    ? "0 12px 30px rgba(79,70,229,0.2)"
                    : "0 6px 16px rgba(0,0,0,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.querySelector("img").style.transform =
                    "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.querySelector("img").style.transform =
                    "scale(1)";
                }}
              >
                {/* Image */}
                <img
                  src={d.img}
                  alt={d.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "0.3s ease",
                    filter: "brightness(0.85)",
                  }}
                />

                {/* Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: isSelected
                      ? "rgba(0,0,0,0.5)"
                      : "rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    {d.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Button */}
        <form onSubmit={onSubmit}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "#111827",
              color: "#fff",
              fontWeight: "500",
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = "#4f46e5";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = "#111827";
            }}
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>

        {/* Message */}
        {msg && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "13px",
              textAlign: "center",
              background:
                msg.type === "success" ? "#ecfdf5" : "#fef2f2",
              color:
                msg.type === "success" ? "#065f46" : "#991b1b",
            }}
          >
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}