import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Clock,
  Award,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { useLocation, useNavigate } from "react-router-dom";

export default function AssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [assessmentState, setAssessmentState] = useState("taking");
  const [timeLeft, setTimeLeft] = useState(600);

  // Groq Questions
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Proctoring State
  const videoRef = useRef(null);
  const [proctorStatus, setProctorStatus] = useState("initializing");
  const [violations, setViolations] = useState(0);
  const MAX_VIOLATIONS = 3;

  // Params
  const params = new URLSearchParams(location.search);
  const moduleId = params.get("module");
  const isFinal = params.get("final") === "true";

const domain = params.get("domain");
const level = params.get("level");


  // =====================================
  // UNLOCK NEXT MODULE / FINAL
  // =====================================
  const markTestComplete = useCallback(() => {
    if (isFinal) {
      localStorage.setItem(`final-${domain}-${level}`, "done");
    } else {
      localStorage.setItem(`test-${domain}-${level}-${moduleId}`, "done");
    }
  }, [isFinal, domain, level, moduleId]);

  // =====================================
  // ⭐ ADDED: AWARD BADGE
  // =====================================
  const awardCompletionBadge = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profile/add-badge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: "course-completion",
            name: "Course Completion",
            description: "Awarded for completing the final assessment.",
            icon: "/course-completed.png", // your badge path
          }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        console.error("Badge save failed:", data);
      }
    } catch (err) {
      console.error("Badge error:", err);
    }
  }, []);

  // =====================================
  // LOAD QUESTIONS FROM GROQ
  // =====================================
  useEffect(() => {
    async function loadQuestions() {
      setLoadingQuestions(true);

      try {
        const token = localStorage.getItem("token");

        const url = isFinal
          ? `${import.meta.env.VITE_API_URL}/api/proctor/final-questions?domain=${domain}&level=${level}`
          : `${import.meta.env.VITE_API_URL}/api/proctor/questions/${moduleId}?domain=${domain}&level=${level}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!data.success) throw new Error("Question load failed");

        setQuestions(data.questions);
        setSelectedAnswers(Array(data.questions.length).fill(null));
      } catch (err) {
        console.error("Groq load error:", err);
      } finally {
        setLoadingQuestions(false);
      }
    }

    loadQuestions();
  }, [location.search, isFinal, domain, level, moduleId]);

  // =====================================
  // HELPERS
  // =====================================
  const handleSelectAnswer = (i) => {
    const arr = [...selectedAnswers];
    arr[currentQuestion] = i;
    setSelectedAnswers(arr);
  };

  const handleSubmit = useCallback(() => {
    setAssessmentState("submitted");
  }, []);

  const handleRetake = () => {
    setSelectedAnswers(Array(questions.length).fill(null));
    setCurrentQuestion(0);
    setAssessmentState("taking");
    setTimeLeft(600);
    setViolations(0);
  };

  const calculateResults = useCallback(() => {
    if (!questions.length) return { correct: 0, total: 0, percentage: 0 };

    let correct = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) correct++;
    });

    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  }, [questions, selectedAnswers]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // =====================================
  // TIMER (auto submit)
  // =====================================
  useEffect(() => {
    if (assessmentState !== "taking") return;

    if (timeLeft <= 0) {
      handleSubmit("Time Over");
      return;
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [assessmentState, timeLeft, handleSubmit]);

  // =====================================
  // PROCTORING (camera + tab monitor)
  // =====================================
  useEffect(() => {
    if (assessmentState !== "taking") return;

    let stream = null;

    const registerViolation = (reason) => {
      setViolations((prev) => {
        const next = prev + 1;
        if (next >= MAX_VIOLATIONS) handleSubmit(reason);
        return next;
      });
    };

    async function initCam() {
      try {
        setProctorStatus("initializing");
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        stream = media;
        if (videoRef.current) videoRef.current.srcObject = media;
        setProctorStatus("active");
      } catch {
        setProctorStatus("camera-denied");
        registerViolation("Camera denied");
      }
    }

    initCam();

    const blur = () => registerViolation("Window blurred");
    const visibilityChange = () => {
      if (document.visibilityState !== "visible")
        registerViolation("Tab switched");
    };
    const ctxMenu = (e) => {
      e.preventDefault();
      registerViolation("Right click");
    };

    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibilityChange);
    document.addEventListener("contextmenu", ctxMenu);

    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibilityChange);
      document.removeEventListener("contextmenu", ctxMenu);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [assessmentState, handleSubmit]);

  // =====================================
  // LOADING & ERROR STATES
  // =====================================
  if (loadingQuestions)
    return <div className="p-10 text-center">Loading questions…</div>;

  if (!questions.length)
    return (
      <div className="p-10 text-center text-red-500">
        Failed to load questions.
      </div>
    );

  // =====================================
  // SUBMITTED VIEW
  // =====================================
  if (assessmentState === "submitted") {
    const results = calculateResults();
    const passed = results.percentage >= 60;

    // Unlock next module
    if (passed) markTestComplete();

    // ⭐ ADDED: Award badge ONLY if final + passed
    if (isFinal && passed) awardCompletionBadge();

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Assessment Complete</h1>

          <div className="text-lg mb-4">
            Score: {results.correct}/{results.total} ({results.percentage}%)
          </div>

          <div className="mb-2">
            Violations: {violations} / {MAX_VIOLATIONS}
          </div>

          {passed ? (
            <div className="text-emerald-600 font-semibold text-xl mb-6">
              ⭐ You Passed! Next module unlocked.
            </div>
          ) : (
            <div className="text-red-600 font-semibold text-xl mb-6">
              ❌ You failed. Score at least 60% to continue.
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleRetake}>
              <RotateCcw className="mr-2 w-4 h-4" />
              Retake Test
            </Button>

            <Button onClick={() => navigate(`/courses/${domain}/${level}`)
}>
              Continue Learning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // TAKING TEST VIEW
  // =====================================
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[2.5fr,1fr] gap-6">

        {/* LEFT SIDE */}
        <div>
          <div className="bg-card rounded-xl border p-6 mb-6">
            <h1 className="text-xl font-bold">Assessment</h1>
            <p className="text-sm text-muted-foreground">
              Stay on this tab & keep your camera on.
            </p>

            <div className="mt-2 flex items-center bg-amber-50 border px-3 py-2 rounded-lg w-max">
              <Clock className="w-4 h-4 text-amber-600 mr-2" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-8 mb-6">
            <h2 className="text-xl font-semibold">
              Question {currentQuestion + 1}
            </h2>

            <p className="text-lg mt-4 mb-6">
              {questions[currentQuestion].question}
            </p>

            {questions[currentQuestion].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectAnswer(i)}
                className={`w-full p-4 mb-3 rounded-lg border text-left ${
                  selectedAnswers[currentQuestion] === i
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary/20"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((p) => p - 1)}
            >
              Previous
            </Button>

            {currentQuestion < questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestion((p) => p + 1)}>
                Next <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit()}
                disabled={selectedAnswers.some((a) => a === null)}
                className="bg-emerald-600"
              >
                Submit Assessment
              </Button>
            )}
          </div>
        </div>

        {/* PROCTORING PANEL */}
        <div className="space-y-4">
          <div className="bg-card border p-4 rounded-xl">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" /> Proctoring
            </h2>

            <p className="text-sm">
              {proctorStatus === "active" && "Camera active"}
              {proctorStatus === "initializing" && "Starting camera…"}
              {proctorStatus === "camera-denied" && "Camera access denied"}
            </p>

            <p className="text-xs mt-2">
              Violations: {violations} / {MAX_VIOLATIONS}
            </p>
          </div>

          <div className="bg-card border p-4 rounded-xl">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4" /> Webcam
            </h2>

            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-[11px] mt-1 text-muted-foreground">
              Keep your face visible at all times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
