import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function InitialAssessment() {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [roadmap, setRoadmap] = useState(null);

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
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setQuestions(data.questions);
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
    try {
      // STEP 1 — send answers
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
      setResult(data.skillLevel);

      // STEP 2 — generate roadmap
      const roadmapRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/roadmap/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            domain: localStorage.getItem("domain"),
            skillLevel: data.skillLevel,
          }),
        }
      );

      const roadmapData = await roadmapRes.json();
      setRoadmap(roadmapData.roadmap);

      // Store in localStorage for dashboard
      localStorage.setItem("roadmap", JSON.stringify(roadmapData.roadmap));
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------
  // RESULT + ROADMAP TIMELINE UI
  // ----------------------------------------
  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6">

        {/* Skill Level */}
        <h1 className="text-3xl font-bold text-emerald-700 mb-4">
          🎉 Your Skill Level:
        </h1>

        <p className="text-xl bg-emerald-100 border border-emerald-300 p-4 rounded-lg mb-8">
          You are <b>{result}</b> in this domain!
        </p>

        {/* Roadmap Title */}
        <h2 className="text-2xl font-bold text-blue-700 mb-6">
          ⭐ Here is the perfect roadmap for you:
        </h2>

        {/* Loading */}
        {!roadmap ? (
          <p className="text-gray-600">Generating roadmap…</p>
        ) : (
          <>
            {/* Horizontal Timeline */}
            <div className="w-full overflow-x-auto py-6">
              <div className="flex items-center space-x-12 px-4">

                {roadmap.topics.map((step, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center min-w-[200px]"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border border-blue-300 mb-3">
                      <span className="text-blue-600 text-xl">📘</span>
                    </div>

                    {/* Step Number Box */}
                    <div className="bg-white shadow-md border rounded-xl px-6 py-3 text-center">
                      <h3 className="font-bold text-lg text-gray-900">
                        Step {step.sequenceNumber}
                      </h3>
                    </div>

                    {/* Line */}
                    <div className="h-8 w-1 bg-blue-300 my-2 rounded-full"></div>

                    {/* Title */}
                    <p className="text-gray-700 text-center max-w-[180px] text-sm">
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Learning Button */}
            <div className="text-center mt-10">
              <button
onClick={() => navigate(
  `/courses/${roadmap.domain}/${roadmap.skillLevel}`
)}


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

  // ----------------------------------------
  // LOADING QUESTIONS
  // ----------------------------------------
  if (loading) return <p className="text-center mt-20">Loading questions…</p>;

  const q = questions[index];

  // ----------------------------------------
  // QUESTION SCREEN
  // ----------------------------------------
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Let's analyze your skill level
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
