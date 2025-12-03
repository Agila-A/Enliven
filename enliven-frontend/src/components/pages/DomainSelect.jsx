import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js"

const DOMAINS = [
  "Web Development",
  "AI/ML",
  "Data Structures & Algorithms",
  "Cybersecurity",
  "Cloud/DevOps",
  "App Development",
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

       // 🔔 Update StudyBuddy memory (domain selected)
      await updateStudyBuddyContext({
        event: "domain_selected",
        domain: data.domain,
      });

     // ⏳ small delay then navigate
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
    <div style={{ maxWidth: 560, margin: "48px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Choose your learning domain</h2>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Pick one to personalize your journey.
      </p>


      <form onSubmit={onSubmit}>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            marginBottom: 12,
          }}
        >
          <option value="">-- Select a domain --</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>


        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#8a8a8a" : "#111827",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving…" : "Save & Continue"}
        </button>
      </form>


      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: msg.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: msg.type === "success" ? "#065f46" : "#991b1b",
            border:
              msg.type === "success"
                ? "1px solid #a7f3d0"
                : "1px solid #fecaca",
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
