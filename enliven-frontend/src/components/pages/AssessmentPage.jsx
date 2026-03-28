// pages/AssessmentPage.jsx
// ─────────────────────────────────────────────────────────────────
// BUGS FIXED:
//  [CRITICAL] markTestComplete & awardBadge called in render → moved to useEffect
//  [CRITICAL] violations in React state = stale closures → moved to useRef
//  [CRITICAL] saveAttempt never called → full POST on submit
//  [CRITICAL] No face-api detection → added TinyFaceDetector loop
//  [CRITICAL] Camera denied still lets test run → hard gate screen
//  [IMPORTANT] All 5 violation types now tracked and sent to backend
//  [IMPORTANT] Module unlock via localStorage + backend saveAttempt
// ─────────────────────────────────────────────────────────────────
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Clock,
  ShieldCheck,
  Camera,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  MonitorOff,
} from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import BadgePopup from "../BadgePopup";

/* ── face-api.js must be loaded in index.html:
   <script defer src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
─────────────────────────────────────────────────────────────── */
const MODELS_URL =
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
const FACE_DETECT_MS   = 3000;   // run face detection every 3 s
const LOOK_AWAY_RATIO  = 0.30;   // face centre X > 30% from mid → lookingAway
const MAX_VIOLATIONS   = 5;      // hard-submit after 5 total violations
const EXPR_THRESHOLD   = 0.65;   // expression confidence needed to flag
const SUSPICIOUS_EXPR  = ["surprised", "fearful", "disgusted"];

export default function AssessmentPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  /* ── URL params ── */
  const params   = new URLSearchParams(location.search);
  const moduleId = params.get("module");
  const isFinal  = params.get("final") === "true";
  const domain   = params.get("domain");
  const level    = params.get("level");
  const courseId = `${domain}-${level}`;

  /* ── Page phases:
       "permission" → camera gate
       "loading"    → fetching questions + loading face-api models
       "taking"     → active exam
       "submitted"  → results screen
  ── */
  const [phase, setPhase]       = useState("permission");
  const [camError, setCamError] = useState("");

  /* ── Questions ── */
  const [questions,       setQuestions]       = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [currentQ,        setCurrentQ]        = useState(0);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(0);

  /* ── Proctoring UI state ── */
  const [proctorStatus,    setProctorStatus]    = useState("initializing");
  const [violationCount,   setViolationCount]   = useState(0);
  const [violationBanner,  setViolationBanner]  = useState("");
  const [faceApiReady,     setFaceApiReady]      = useState(false);

  /* ── Results ── */
  const [result,     setResult]     = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [earnedBadge, setEarnedBadge] = useState(null);
  const [showPopup,  setShowPopup]  = useState(false);

  /* ── Refs (mutable, no re-render needed) ── */
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const detectTimer   = useRef(null);
  const countdownRef  = useRef(null);
  const bannerTimer   = useRef(null);
  const startedAt     = useRef(null);
  const submittingRef = useRef(false); // prevent double submit

  /* ── Violation counters in ref (avoids stale closure bugs) ── */
  const vRef = useRef({
    tabSwitches:     0,
    faceNotDetected: 0,
    multipleFaces:   0,
    lookingAway:     0,
    expressionAlert: 0,
    noCamera:        false,
  });

  /* ════════════════════════════════════════════════════════
     1. LOAD face-api MODELS
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    async function loadModels() {
      const faceapi = window.faceapi;
      if (!faceapi) { setFaceApiReady(true); return; } // graceful degrade
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
        ]);
      } catch (e) {
        console.warn("face-api model load failed, degrading gracefully", e);
      } finally {
        setFaceApiReady(true);
      }
    }
    loadModels();
  }, []);

  /* ════════════════════════════════════════════════════════
     2. CAMERA PERMISSION GATE
  ════════════════════════════════════════════════════════ */
  const requestCamera = useCallback(async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setProctorStatus("active");
      setPhase("loading");
    } catch {
      vRef.current.noCamera = true;
      setCamError(
        "Camera access is required for this proctored test. Please allow camera access and try again."
      );
    }
  }, []);

  /* ════════════════════════════════════════════════════════
     3. FETCH QUESTIONS (once camera + models are ready)
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "loading" || !faceApiReady) return;

    async function fetchQuestions() {
      try {
        const token = localStorage.getItem("token");
        const url = isFinal
          ? `${import.meta.env.VITE_API_URL}/api/proctor/final-questions?domain=${encodeURIComponent(domain)}&level=${encodeURIComponent(level)}`
          : `${import.meta.env.VITE_API_URL}/api/proctor/questions/${moduleId}?domain=${encodeURIComponent(domain)}&level=${encodeURIComponent(level)}`;

        const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) throw new Error("Failed to load questions");

        setQuestions(data.questions);
        setSelectedAnswers(Array(data.questions.length).fill(null));
        setTimeLeft(data.questions.length * 90); // 1.5 min / question
        setPhase("ready");
      } catch (err) {
        console.error(err);
        setCamError("Failed to load questions. Please refresh.");
      }
    }
    fetchQuestions();
  }, [phase, faceApiReady, domain, level, moduleId, isFinal]);

  /* ════════════════════════════════════════════════════════
     4. REATTACH STREAM after phase change
     [FIX] Each phase renders a DIFFERENT <video> DOM element
     that shares the same ref. When React unmounts one video
     and mounts another, the ref.current changes to the new
     element but srcObject is NOT automatically transferred.
     This effect runs after every phase transition and
     re-assigns the stream to whichever video is now mounted.
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {}); // autoPlay may need a nudge
    }
  }, [phase]); // re-run every time the active screen changes

  /* ════════════════════════════════════════════════════════
     5. START EXAM
  ════════════════════════════════════════════════════════ */
  const startExam = () => {
    startedAt.current = new Date();
    setPhase("taking");
  };

  /* ════════════════════════════════════════════════════════
     6. COUNTDOWN TIMER
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking") return;
    countdownRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(countdownRef.current);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase]); // eslint-disable-line

  /* ════════════════════════════════════════════════════════
     7. VIOLATION HELPER (uses ref → no stale closure)
  ════════════════════════════════════════════════════════ */
  const addViolation = useCallback((type, bannerText) => {
    vRef.current[type] = (vRef.current[type] || 0) + 1;
    const total =
      vRef.current.tabSwitches +
      vRef.current.faceNotDetected +
      vRef.current.multipleFaces +
      vRef.current.lookingAway +
      vRef.current.expressionAlert;

    setViolationCount(total);
    showBanner(bannerText);

    if (total >= MAX_VIOLATIONS) handleSubmit();
  }, []); // eslint-disable-line

  function showBanner(text) {
    setViolationBanner(text);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setViolationBanner(""), 3500);
  }

  /* ════════════════════════════════════════════════════════
     8. TAB / BLUR / RIGHT-CLICK DETECTION
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking") return;

    const onVisibility = () => {
      if (document.hidden) addViolation("tabSwitches", "⚠️ Tab switch detected!");
    };
    const onBlur = () => addViolation("tabSwitches", "⚠️ Window focus lost!");
    const onCtx  = (e) => { e.preventDefault(); };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onCtx);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onCtx);
    };
  }, [phase, addViolation]);

  /* ════════════════════════════════════════════════════════
     9. FACE DETECTION LOOP
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking") return;

    const faceapi = window.faceapi;
    if (!faceapi || !faceApiReady) return;

    async function tick() {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        const n = detections.length;

        if (n === 0) {
          addViolation("faceNotDetected", "⚠️ No face detected — stay in frame!");
        } else if (n > 1) {
          addViolation("multipleFaces", "⚠️ Multiple faces detected!");
        } else {
          const det = detections[0];

          // Head-pose proxy: face centre X deviation
          const { x, width: fw } = det.detection.box;
          const vw = video.videoWidth || 640;
          const cx = x + fw / 2;
          if (Math.abs(cx / vw - 0.5) > LOOK_AWAY_RATIO) {
            addViolation("lookingAway", "⚠️ Please look at the screen!");
          }

          // Expression check (silent — just logged, not bannered)
          if (det.expressions) {
            const top = Object.entries(det.expressions).sort((a, b) => b[1] - a[1])[0];
            if (top && SUSPICIOUS_EXPR.includes(top[0]) && top[1] > EXPR_THRESHOLD) {
              vRef.current.expressionAlert = (vRef.current.expressionAlert || 0) + 1;
            }
          }
        }
      } catch { /* ignore per-frame errors */ }
    }

    detectTimer.current = setInterval(tick, FACE_DETECT_MS);
    return () => clearInterval(detectTimer.current);
  }, [phase, faceApiReady, addViolation]);

  /* ════════════════════════════════════════════════════════
     10. SUBMIT EXAM
     [FIX] Uses submittingRef to prevent double-calls
     [FIX] Actually POSTs to /api/proctor/attempt
     [FIX] badge/unlock in useEffect, not render
  ════════════════════════════════════════════════════════ */
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    clearInterval(countdownRef.current);
    clearInterval(detectTimer.current);

    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());

    // Calculate score
    let correct = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) correct++;
    });
    const total      = questions.length || 1;
    const score      = Math.round((correct / total) * 100);
    const passed     = score >= 60;

    const totalViol  =
      vRef.current.tabSwitches + vRef.current.faceNotDetected +
      vRef.current.multipleFaces + vRef.current.lookingAway +
      vRef.current.expressionAlert;

    const flagged = totalViol >= MAX_VIOLATIONS ||
                    vRef.current.multipleFaces > 0 ||
                    vRef.current.tabSwitches > 2;

    const reason = flagged
      ? `tabs=${vRef.current.tabSwitches}, noFace=${vRef.current.faceNotDetected}, multiFace=${vRef.current.multipleFaces}`
      : "";

    try {
      const token = localStorage.getItem("token");
      await fetch(`${import.meta.env.VITE_API_URL}/api/proctor/attempt`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          moduleId: isFinal ? "final" : moduleId,
          questions,
          userAnswers: selectedAnswers,
          score,
          violations: { ...vRef.current },
          flagged,
          reason,
          startedAt: startedAt.current,
          endedAt:   new Date(),
        }),
      });
    } catch (err) {
      console.error("saveAttempt failed:", err);
    }

    setResult({ score, passed, flagged, correct, total, violations: { ...vRef.current } });
    setSaving(false);
    setPhase("submitted");
  }, [questions, selectedAnswers, courseId, moduleId, isFinal]);

  /* ════════════════════════════════════════════════════════
     11. POST-SUBMIT EFFECTS
     [FIX] markTestComplete & awardBadge in useEffect, not render
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "submitted" || !result) return;

    if (result.passed) {
      // Unlock in localStorage (for CoursePage module gating)
      if (isFinal) {
        localStorage.setItem(`final-${domain}-${level}`, "done");
      } else {
        localStorage.setItem(`test-${domain}-${level}-${moduleId}`, "done");
      }

      // Award badge on final exam pass
      if (isFinal) {
        (async () => {
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(
              `${import.meta.env.VITE_API_URL}/api/profile/add-badge`,
              {
                method:  "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:  `Bearer ${token}`,
                },
                body: JSON.stringify({ id: "course-completion" }),
              }
            );
            const data = await res.json();
            if (data.success) {
              setEarnedBadge(data.badge);
              setShowPopup(true);
            }
          } catch (err) {
            console.error("Badge award failed:", err);
          }
        })();
      }
    }
  }, [phase, result]); // eslint-disable-line

  /* ════════════════════════════════════════════════════════
     UNMOUNT CLEANUP
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(detectTimer.current);
      clearInterval(countdownRef.current);
      clearTimeout(bannerTimer.current);
    };
  }, []);

  /* ════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════ */
  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const answeredCount = selectedAnswers.filter(a => a !== null).length;
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const isUrgent = timeLeft > 0 && timeLeft < 60;

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */

  /* ── PERMISSION SCREEN ── */
  if (phase === "permission") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "var(--enliven-deep-purple)" }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Proctored Assessment</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isFinal ? "Final Exam" : `Module ${moduleId}`} · {domain} · {level}
            </p>
          </div>

          <div className="w-full bg-secondary rounded-xl p-4 space-y-2 text-sm text-foreground">
            <p className="font-semibold text-foreground mb-3">This exam monitors:</p>
            {[
              { icon: <Camera className="w-4 h-4" />, text: "Webcam — face presence & head direction" },
              { icon: <Eye className="w-4 h-4" />, text: "Eye / expression analysis via AI" },
              { icon: <Users className="w-4 h-4" />, text: "Multiple people in frame" },
              { icon: <MonitorOff className="w-4 h-4" />, text: "Tab switches & window focus loss" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <span style={{ color: "var(--enliven-purple)" }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          <p className="text-xs text-center font-medium" style={{ color: "var(--destructive)" }}>
            Camera access is required — you cannot proceed without it.
          </p>

          {camError && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {camError}
            </div>
          )}

          {/* Hidden video for warm-up */}
          <video ref={videoRef} style={{ display: "none" }} muted playsInline />

          <Button
            className="w-full h-11 text-base font-semibold"
            style={{ background: "var(--enliven-deep-purple)", color: "#fff" }}
            onClick={requestCamera}
          >
            Allow Camera & Continue
          </Button>
        </div>
      </div>
    );
  }

  /* ── LOADING SCREEN ── */
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-border rounded-full mx-auto animate-spin"
            style={{ borderTopColor: "var(--enliven-purple)" }} />
          <p className="text-muted-foreground text-sm">
            {faceApiReady ? "Generating questions…" : "Loading AI proctoring models…"}
          </p>
        </div>
        <video ref={videoRef} style={{ display: "none" }} muted playsInline />
      </div>
    );
  }

  /* ── READY SCREEN ── */
  if (phase === "ready") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center gap-5">
          <h2 className="text-xl font-bold text-foreground">Ready to Begin?</h2>

          <div className="w-full rounded-xl overflow-hidden border border-border aspect-video bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--success)" }}>
            <CheckCircle2 className="w-4 h-4" />
            Camera is active
          </div>

          <div className="w-full bg-secondary rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="font-bold text-foreground text-lg">{questions.length}</p>
              <p className="text-muted-foreground">Questions</p>
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{fmt(timeLeft)}</p>
              <p className="text-muted-foreground">Time Limit</p>
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">60%</p>
              <p className="text-muted-foreground">Pass Mark</p>
            </div>
          </div>

          <Button
            className="w-full h-11 font-semibold text-base"
            style={{ background: "var(--enliven-deep-purple)", color: "#fff" }}
            onClick={startExam}
          >
            Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  /* ── SUBMITTED / RESULTS SCREEN ── */
  if (phase === "submitted" && result) {
    const { score, passed, flagged, correct, total, violations: v } = result;

    return (
      <div className="min-h-screen bg-background p-6">
        {showPopup && earnedBadge && (
          <BadgePopup
            badge={earnedBadge}
            onClose={() => setShowPopup(false)}
            onCollect={() => { setShowPopup(false); navigate("/profile"); }}
          />
        )}

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score card */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-lg">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-white`}
              style={{ background: passed ? "var(--success)" : "var(--destructive)" }}>
              {passed
                ? <CheckCircle2 className="w-10 h-10" />
                : <XCircle className="w-10 h-10" />}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {passed ? (isFinal ? "Course Completed! 🎉" : "Test Passed! ⭐") : "Test Failed"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {passed
                  ? isFinal ? "You've mastered this course!" : "Next module is now unlocked."
                  : "Score at least 60% to continue."}
              </p>
            </div>

            <div className="text-6xl font-extrabold" style={{ color: passed ? "var(--success)" : "var(--destructive)" }}>
              {score}%
            </div>
            <p className="text-muted-foreground">{correct} / {total} correct</p>
          </div>

          {/* Violations summary */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" style={{ color: "var(--enliven-purple)" }} />
              Proctoring Report
            </h2>

            {flagged && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--destructive)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This attempt has been flagged for review.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Tab Switches",     val: v.tabSwitches },
                { label: "Face Not Detected", val: v.faceNotDetected },
                { label: "Multiple Faces",    val: v.multipleFaces },
                { label: "Looking Away",      val: v.lookingAway },
                { label: "Expression Alerts", val: v.expressionAlert },
              ].map(({ label, val }) => (
                <div key={label} className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => {
                // Reset everything for retake
                vRef.current = { tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0, lookingAway: 0, expressionAlert: 0, noCamera: false };
                submittingRef.current = false;
                setSelectedAnswers(Array(questions.length).fill(null));
                setCurrentQ(0);
                setViolationCount(0);
                setResult(null);
                setPhase("permission");
              }}
            >
              <RotateCcw className="mr-2 w-4 h-4" />
              Retake Test
            </Button>

            {passed && (
              isFinal ? (
                <Button
                  className="flex-1 h-11 font-semibold"
                  style={{ background: "var(--enliven-deep-purple)", color: "#fff" }}
                  onClick={() => earnedBadge && setShowPopup(true)}
                >
                  🎖️ View Badge
                </Button>
              ) : (
                <Button
                  className="flex-1 h-11 font-semibold"
                  style={{ background: "var(--enliven-deep-purple)", color: "#fff" }}
                  onClick={() => navigate(`/courses/${domain}/${level}`)}
                >
                  Continue Learning
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── TAKING EXAM SCREEN ── */
  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5" style={{ color: "var(--enliven-purple)" }} />
          <span className="font-semibold text-foreground text-sm">
            {isFinal ? "Final Exam" : `Module ${moduleId} Assessment`}
          </span>
          <span className="text-muted-foreground text-sm hidden sm:inline">· {domain} · {level}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {answeredCount}/{questions.length} answered
          </span>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums
            ${isUrgent ? "bg-red-50 text-red-600 border border-red-200" : "bg-secondary text-foreground"}`}>
            <Clock className="w-3.5 h-3.5" />
            {fmt(timeLeft)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: "var(--enliven-purple)" }}
        />
      </div>

      {/* Violation banner */}
      {violationBanner && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm font-medium text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {violationBanner}
          <span className="ml-auto text-xs font-normal text-red-500">
            {violationCount}/{MAX_VIOLATIONS} violations
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-5xl mx-auto p-6 grid lg:grid-cols-[1fr,280px] gap-6">

        {/* ── LEFT: Question panel ── */}
        <div className="space-y-5">
          {/* Question header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ background: "var(--enliven-purple)" }}>
                Question {currentQ + 1} of {questions.length}
              </span>
              {questions[currentQ]?.difficulty && (
                <span className="text-xs text-muted-foreground">
                  Difficulty: {"★".repeat(questions[currentQ].difficulty)}{"☆".repeat(5 - questions[currentQ].difficulty)}
                </span>
              )}
            </div>
          </div>

          {/* Question card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <p className="text-foreground text-lg font-medium leading-relaxed mb-6">
              {questions[currentQ]?.question}
            </p>

            <div className="space-y-3">
              {questions[currentQ]?.options.map((opt, i) => {
                const isSelected = selectedAnswers[currentQ] === i;
                const letters = ["A", "B", "C", "D"];
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const arr = [...selectedAnswers];
                      arr[currentQ] = i;
                      setSelectedAnswers(arr);
                    }}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all duration-150"
                    style={{
                      borderColor: isSelected ? "var(--enliven-purple)" : "var(--border)",
                      background:  isSelected ? "rgba(88,43,91,0.06)" : "var(--card)",
                      color:       "var(--foreground)",
                    }}
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isSelected ? "var(--enliven-purple)" : "var(--secondary)",
                        color:      isSelected ? "#fff" : "var(--muted-foreground)",
                      }}>
                      {letters[i]}
                    </span>
                    <span className="text-sm leading-relaxed pt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(q => q - 1)}
            >
              ← Previous
            </Button>

            {currentQ < questions.length - 1 ? (
              <Button
                style={{ background: "var(--enliven-deep-purple)", color: "#fff" }}
                onClick={() => setCurrentQ(q => q + 1)}
              >
                Next <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={saving}
                style={{ background: "var(--success)", color: "#fff" }}
              >
                {saving ? "Submitting…" : "Submit Assessment"}
              </Button>
            )}
          </div>

          {/* Question grid navigator */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Question Navigator
            </p>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => {
                const ans = selectedAnswers[i] !== null;
                const cur = i === currentQ;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className="w-9 h-9 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: cur
                        ? "var(--enliven-purple)"
                        : ans
                        ? "rgba(88,43,91,0.12)"
                        : "var(--secondary)",
                      color: cur
                        ? "#fff"
                        : ans
                        ? "var(--enliven-purple)"
                        : "var(--muted-foreground)",
                      border: cur
                        ? "2px solid var(--enliven-purple)"
                        : ans
                        ? "2px solid rgba(88,43,91,0.3)"
                        : "2px solid transparent",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Proctoring sidebar ── */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-3">
              <ShieldCheck className="w-4 h-4" style={{ color: "var(--enliven-purple)" }} />
              Proctoring Status
            </h3>

            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-3`}
              style={{
                background: proctorStatus === "active" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                color: proctorStatus === "active" ? "var(--success)" : "var(--destructive)",
                border: `1px solid ${proctorStatus === "active" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
              <span className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: proctorStatus === "active" ? "var(--success)" : "var(--destructive)" }} />
              {proctorStatus === "active"
                ? "Camera active"
                : proctorStatus === "initializing"
                ? "Starting camera…"
                : "Camera denied"}
            </div>

            {/* Violations meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Violations</span>
                <span className="font-semibold text-foreground">{violationCount} / {MAX_VIOLATIONS}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((violationCount / MAX_VIOLATIONS) * 100, 100)}%`,
                    background: violationCount >= 3 ? "var(--destructive)" : violationCount >= 2 ? "var(--warning)" : "var(--success)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Webcam feed */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-3">
              <Camera className="w-4 h-4" style={{ color: "var(--enliven-purple)" }} />
              Webcam
            </h3>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Keep your face visible at all times
            </p>
          </div>

          {/* Submit from sidebar too */}
          <Button
            className="w-full h-11 font-semibold"
            style={{ background: "var(--success)", color: "#fff" }}
            onClick={handleSubmit}
            disabled={saving || answeredCount < questions.length}
          >
            {saving
              ? "Submitting…"
              : answeredCount < questions.length
              ? `${questions.length - answeredCount} unanswered`
              : "Submit Assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
