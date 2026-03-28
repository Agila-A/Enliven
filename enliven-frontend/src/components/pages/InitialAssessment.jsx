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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-emerald-700 mb-4">
          🎉 Your Skill Level:
        </h1>

        <p className="text-xl bg-emerald-100 border border-emerald-300 p-4 rounded-lg mb-8">
          You are <b>{result}</b> in this domain!
        </p>

        <h2 className="text-2xl font-bold text-blue-700 mb-6">
          ⭐ Here is the perfect roadmap for you:
        </h2>

        {!roadmap ? (
          <p className="text-gray-600">Generating roadmap…</p>
        ) : (
          <>
            {/* Horizontal Timeline */}
            <div className="w-full overflow-x-auto py-6">
              <div className="flex items-center space-x-12 px-4">
                {roadmap.topics.map((step, i) => (
                  <div key={i} className="flex flex-col items-center min-w-[200px]">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border border-blue-300 mb-3">
                      <span className="text-blue-600 text-xl">📘</span>
                    </div>
                    <div className="bg-white shadow-md border rounded-xl px-6 py-3 text-center">
                      <h3 className="font-bold text-lg text-gray-900">
                        Step {step.sequenceNumber}
                      </h3>
                    </div>
                    <div className="h-8 w-1 bg-blue-300 my-2 rounded-full" />
                    <p className="text-gray-700 text-center max-w-[180px] text-sm">
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-10">
              <button
                onClick={() => navigate(getCourseUrl())}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition"
              >
                🚀 Start Learning
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) return <p className="text-center mt-20">Loading questions…</p>;

  const q = questions[index];
  if (!q) return <p className="text-center mt-20 text-red-600">No questions found. Please try again.</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <p className="text-sm text-gray-400 mb-2">
        Question {index + 1} of {questions.length}
      </p>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Let's analyse your skill level
      </h1>

      <p className="text-lg mb-4 font-medium">{q.question}</p>

      <div className="space-y-3">
        {q.options.map((opt, i) => (
          <button
            key={i}
            className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 transition"
            onClick={() => handleAnswer(i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
