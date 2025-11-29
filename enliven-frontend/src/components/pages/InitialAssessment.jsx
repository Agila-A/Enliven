import { useEffect, useState } from "react";


export default function InitialAssessment() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);


  const token = localStorage.getItem("token");


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
        if (data.success) {
          setQuestions(data.questions);
        }
      } catch (err) {
        console.error("Error loading questions", err);
      } finally {
        setLoading(false);
      }
    };


    loadQuestions();
  }, []);


  const handleNext = () => {
    if (selected === null) return;


    const newAns = [...answers, selected];
    setAnswers(newAns);
    setSelected(null);


    if (current === questions.length - 1) {
      submitAssessment(newAns);
    } else {
      setCurrent(current + 1);
    }
  };


  const submitAssessment = async (finalAnswers) => {
    try {
      const formatted = finalAnswers.map((idx) =>
        ["A", "B", "C", "D"][idx]
      );


      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/initial-assessment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answers: formatted }),
        }
      );


      const data = await res.json();
      if (data.success) {
        setResult(data.skillLevel);
      }
    } catch (err) {
      console.error("Submit error", err);
    }
  };


  if (loading) return <p className="p-6">Loading questions…</p>;


  if (result) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-emerald-700 mb-4">
          Your Skill Level:
        </h1>
        <p className="text-xl bg-emerald-100 border border-emerald-300 p-4 rounded-lg">
          🎉 You are <b>{result}</b> in this domain!
        </p>
      </div>
    );
  }


  return (
    <div className="max-w-xl mx-auto p-6">
      {current === 0 && (
        <p className="mb-6 text-lg bg-blue-50 p-4 rounded-lg border border-blue-200">
          ⭐ <b>Alright!</b> Now answer these questions to determine your skill
          level and get a tailor‑made learning roadmap for you.
        </p>
      )}


      <h2 className="text-xl font-semibold mb-4">
        Question {current + 1} of {questions.length}
      </h2>


      <p className="text-lg font-medium mb-4">
        {questions[current].question}
      </p>


      <div className="space-y-3">
        {questions[current].options.map((opt, index) => (
          <button
            key={index}
            onClick={() => setSelected(index)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              selected === index
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-white hover:bg-indigo-50 border-gray-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>


      <button
        onClick={handleNext}
        className="mt-6 px-4 py-2 rounded-lg bg-indigo-700 text-white font-semibold hover:bg-indigo-800 transition"
      >
        {current === questions.length - 1 ? "Submit" : "Next"}
      </button>
    </div>
  );
}
