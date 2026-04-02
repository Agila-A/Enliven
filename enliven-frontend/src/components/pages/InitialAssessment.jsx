import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js";

export default function InitialAssessment() {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ----------------------------------------
  // LOAD QUESTIONS
  // ----------------------------------------
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/user/assessment-questions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  // ----------------------------------------
  // HANDLE ANSWER
  // ----------------------------------------
  const handleAnswer = (optionIndex) => {
    const grade = ["A", "B", "C", "D"][optionIndex];
    const updated = [...answers, grade];
    setAnswers(updated);

    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      submitAssessment(updated);
    }
  };

  // ----------------------------------------
  // SUBMIT ASSESSMENT + GENERATE ROADMAP
  // ----------------------------------------
  const submitAssessment = async (finalAnswers) => {
    setSubmitting(true);
    try {
      // STEP 1 — evaluate answers, get skill level
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/initial-assessment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answers: finalAnswers }),
        }
      );

      const data = await res.json();
      const skillLevel = data.skillLevel;
      setResult(skillLevel);

      // BUG FIX: domain should come from the API response or user object,
      // not just localStorage (which may be stale or missing after re-login).
      // The /api/user/initial-assessment endpoint should return domain too,
      // but we fall back to localStorage as secondary.
      const domain = data.domain || localStorage.getItem("domain");

      updateStudyBuddyContext({
        event: "initial_assessment_completed",
        skillLevel,
        domain,
      });

      // STEP 2 — generate roadmap
      const roadmapRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/roadmap/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ domain, skillLevel }),
        }
      );

      const roadmapData = await roadmapRes.json();
      const rm = roadmapData.roadmap;
      setRoadmap(rm);

      updateStudyBuddyContext({
        event: "roadmap_generated",
        roadmap: rm,
      });

      // Store in localStorage so Dashboard and CoursePage can use it
      localStorage.setItem("roadmap", JSON.stringify(rm));

    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------
  // HELPERS — build course URL safely
  // ----------------------------------------
  const getCourseUrl = () => {
    if (!roadmap) return "/dashboard";
    // BUG FIX: roadmap.domain and roadmap.skillLevel must be slugified
    // to match what CoursePage's useParams() will receive.
    const domain = String(roadmap.domain || "").toLowerCase().replace(/\s+/g, "-");
    const level = String(roadmap.skillLevel || "").toLowerCase().replace(/[^a-z]/g, "");
    return `/courses/${domain}/${level}`;
  };

  // ----------------------------------------
  // RESULT + ROADMAP TIMELINE UI
  // ----------------------------------------
  if (submitting) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center mt-20">
        <p className="text-gray-600 text-lg">Analysing your answers and generating your roadmap…</p>
      </div>
    );
  }

  if (result) {
return (
  <div
    style={{
      minHeight: "100vh",
      background: "#f8fafc",
      padding: "40px 20px",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      
      {/* Skill Level */}
      <h1 style={{ fontSize: "28px", fontWeight: "600", marginBottom: "10px" }}>
        Your Skill Level
      </h1>

      <div
        style={{
          padding: "18px",
          borderRadius: "14px",
          background: "#111827",
          color: "#fff",
          marginBottom: "40px",
          textAlign: "center",
          fontSize: "16px",
        }}
      >
        You are <b>{result}</b> in this domain
      </div>

      {/* Heading */}
      <h2
        style={{
          fontSize: "22px",
          marginBottom: "30px",
          fontWeight: "600",
        }}
      >
        Your personalized journey
      </h2>

      {/* Timeline */}
      <div style={{ position: "relative", padding: "20px 0" }}>
        
        {/* Center Line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "2px",
            background: "#e5e7eb",
            transform: "translateX(-50%)",
          }}
        />

        {roadmap?.topics.map((step, i) => {
          const isLeft = i % 2 === 0;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isLeft ? "flex-start" : "flex-end",
                marginBottom: "50px",
                position: "relative",
              }}
            >
              {/* Card */}
              <div
                style={{
                  width: "42%",
                  background: "#ffffff",
                  padding: "18px",
                  borderRadius: "14px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                  transition: "0.25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 25px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(0,0,0,0.05)";
                }}
              >
                <h3
                  style={{
                    fontWeight: "600",
                    marginBottom: "6px",
                    fontSize: "15px",
                  }}
                >
                  Step {step.sequenceNumber}
                </h3>

                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  {step.title}
                </p>
              </div>

              {/* Circle */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "#111827",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "600",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                }}
              >
                {step.sequenceNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* Button */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <button
          onClick={() => navigate(getCourseUrl())}
          style={{
            padding: "14px 30px",
            borderRadius: "12px",
            background: "#111827",
            color: "#fff",
            border: "none",
            fontSize: "15px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "0.25s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#4f46e5";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#111827";
          }}
        >
          Start Learning
        </button>
      </div>
    </div>
  </div>
);
  }

  if (loading) return <p className="text-center mt-20">Loading questions…</p>;

  const q = questions[index];
  if (!q) return <p className="text-center mt-20 text-red-600">No questions found. Please try again.</p>;

return (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      fontFamily: "Inter, sans-serif",
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "700px",
        background: "#ffffff",
        borderRadius: "20px",
        padding: "32px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      }}
    >
      {/* Progress */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            height: "6px",
            borderRadius: "10px",
            background: "#e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((index + 1) / questions.length) * 100}%`,
              height: "100%",
              background: "#111827",
              transition: "0.3s",
            }}
          />
        </div>

        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
          Question {index + 1} of {questions.length}
        </p>
      </div>

      {/* Heading */}
      <h2
        style={{
          fontSize: "22px",
          fontWeight: "600",
          marginBottom: "10px",
          color: "#111827",
        }}
      >
        Let’s understand your level
      </h2>

      {/* Question */}
      <p
        style={{
          fontSize: "16px",
          fontWeight: "500",
          marginBottom: "20px",
          color: "#374151",
        }}
      >
        {q.question}
      </p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            style={{
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              textAlign: "left",
              fontSize: "14px",
              cursor: "pointer",
              transition: "0.25s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f3f4f6";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#ffffff";
              e.target.style.transform = "translateY(0)";
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  </div>
);
}
