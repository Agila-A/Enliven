import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js";
import { Sparkles, Target, Settings, Brain } from "lucide-react";

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
  }, [token]);

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

  const submitAssessment = async (finalAnswers) => {
    setSubmitting(true);
    try {
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

      const domain = data.domain || localStorage.getItem("domain");

      updateStudyBuddyContext({
        event: "initial_assessment_completed",
        skillLevel,
        domain,
      });

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

      localStorage.setItem("roadmap", JSON.stringify(rm));

    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCourseUrl = () => {
    if (!roadmap) return "/dashboard";
    const domain = String(roadmap.domain || "").toLowerCase().replace(/\s+/g, "-");
    const level = String(roadmap.skillLevel || "").toLowerCase().replace(/[^a-z]/g, "");
    return `/courses/${domain}/${level}`;
  };

  if (submitting) {
    return (
      <div className="min-h-screen bg-cream/20 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-20 h-20 bg-yellow/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Settings className="w-10 h-10 text-yellow animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Analyzing your answers...</h2>
        <p className="text-foreground/60 text-lg text-center max-w-sm">Generating your personalized AI roadmap</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-cream/20 py-16 px-6 font-sans">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-green" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-foreground">Your Skill Level</h1>
            <div className="inline-block bg-red px-8 py-4 rounded-full text-white shadow-soft">
              You are <b className="font-bold text-xl uppercase tracking-wider ml-1">{result}</b> in this domain
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Your Personalized Journey</h2>

          {/* Timeline */}
          <div className="relative py-10 px-4">
            {/* Center Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-cream/80 transform -translate-x-1/2 rounded-full hidden md:block" />

            {roadmap?.topics.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={i} className={`flex flex-col md:flex-row items-center md:items-start justify-center ${isLeft ? 'md:justify-start' : 'md:justify-end'} mb-16 relative w-full`}>
                  
                  {/* Circle (Absolute on Desktop, static on mobile) */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-yellow/20 text-yellow flex items-center justify-center text-xl font-bold shadow-sm md:absolute md:left-1/2 md:transform md:-translate-x-1/2 z-10 border-4 border-white mb-6 md:mb-0">
                    {step.sequenceNumber}
                  </div>

                  {/* Card */}
                  <div className={`w-full md:w-5/12 bg-white p-8 rounded-3xl border border-cream shadow-sm hover:shadow-soft transition-all duration-300 transform hover:-translate-y-1 ${isLeft ? 'md:mr-auto' : 'md:ml-auto'}`}>
                    <h3 className="font-bold text-xl mb-3 text-red">Step {step.sequenceNumber}</h3>
                    <p className="text-foreground/70 text-lg leading-relaxed font-medium">{step.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate(getCourseUrl())}
              className="px-10 py-5 rounded-2xl bg-red text-white font-bold text-xl shadow-md hover:shadow-lg hover:bg-red/90 transition-all transform hover:-translate-y-1 flex items-center justify-center mx-auto"
            >
              Start Learning <Sparkles className="w-6 h-6 ml-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
      <div className="min-h-screen bg-cream/20 flex flex-col items-center justify-center">
          <Brain className="w-12 h-12 text-red animate-pulse mb-4" />
          <p className="text-center text-lg font-bold text-foreground">Loading questions…</p>
      </div>
  );

  const q = questions[index];
  if (!q) return <p className="text-center mt-20 text-red font-bold">No questions found. Please try again.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream/30 font-sans p-6 overflow-hidden relative">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green/20 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-3xl bg-white rounded-[2rem] p-10 md:p-12 shadow-soft border border-cream/50 relative z-10 transition-all">
        
        {/* Progress */}
        <div className="mb-10">
          <div className="h-3 rounded-full bg-cream overflow-hidden">
            <div
              className="h-full bg-red transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
          <p className="text-sm font-bold text-foreground/50 mt-4 text-right uppercase tracking-wider">
            Question {index + 1} of {questions.length}
          </p>
        </div>

        {/* Heading */}
        <div className="flex items-center space-x-3 mb-6">
            <Brain className="w-8 h-8 text-yellow" />
            <h2 className="text-3xl font-bold text-foreground">
                Let’s understand your level
            </h2>
        </div>

        {/* Question */}
        <p className="text-xl font-medium mb-10 text-foreground/80 leading-relaxed border-l-4 border-red pl-6 py-2">
          {q.question}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="p-6 rounded-2xl border-2 border-cream/80 bg-white text-left text-lg font-medium text-foreground hover:bg-cream/30 hover:border-red hover:shadow-sm transform hover:-translate-y-1 transition-all focus:outline-none focus:ring-2 focus:ring-red/50"
            >
              <div className="flex items-center text-foreground">
                  <span className="w-8 h-8 bg-cream rounded-full flex items-center justify-center font-bold text-red mr-4 flex-shrink-0">
                      {["A", "B", "C", "D"][i]}
                  </span>
                  {opt}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
