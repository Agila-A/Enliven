// pages/AssessmentPage.jsx
//
// THREE BUGS FIXED IN THIS VERSION:
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ BUG 1 — Face detection silently does nothing                            │
// │ Cause: `window.faceapi` requires a <script> CDN tag in index.html.     │
// │        If that tag is missing / not yet loaded, window.faceapi is      │
// │        undefined and every detection tick is silently skipped.          │
// │ Fix:   `import * as faceapi from "face-api.js"` (npm package).         │
// │        Run: npm install face-api.js                                     │
// │        Model weights still fetched from CDN at runtime — no local files │
// │        needed.                                                           │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ BUG 2 — One tab switch counted as 2                                     │
// │ Cause: Both `visibilitychange` AND `window.blur` registered.            │
// │        Switching a tab fires both simultaneously → 2 increments.        │
// │ Fix:   Remove window.blur entirely. Only visibilitychange is used.      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ BUG 3 — Module unlock never happens after passing                       │
// │ Cause: AssessmentPage writes to localStorage but CoursePage reads       │
// │        moduleStatus from /api/progress/:courseId (DB), which never      │
// │        gets updated when a test is passed.                              │
// │ Fix:   On a passing attempt, call POST /api/progress/complete-module    │
// │        which sets moduleStatus[moduleId] = "completed" in the DB.       │
// │        CoursePage's refreshModuleStatus() then picks it up on return.   │
// └─────────────────────────────────────────────────────────────────────────┘

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";   // ← NPM IMPORT, not window.faceapi
import {
  Clock, ShieldCheck, Camera, ChevronRight,
  RotateCcw, AlertTriangle, CheckCircle2,
  XCircle, Eye, Users, MonitorOff,
} from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import BadgePopup from "../BadgePopup";

/* ─── Constants ──────────────────────────────────────────────── */
const MODELS_URL     = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
const DETECT_MS      = 3000;   // face-detection tick interval
const LOOK_AWAY      = 0.28;   // face-centre X deviation threshold
const EXPR_THRESHOLD = 0.65;
const SUSPICIOUS     = ["surprised", "fearful", "disgusted"];
const MAX_VIOLATIONS = 5;

export default function AssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const params   = new URLSearchParams(location.search);
  const moduleId = params.get("module");
  const isFinal  = params.get("final") === "true";
  const domain   = params.get("domain");
  const level    = params.get("level");
  const courseId = `${domain}-${level}`;

  /* ── Phases: permission → loading → ready → taking → submitted ── */
  const [phase,    setPhase]    = useState("permission");
  const [camError, setCamError] = useState("");

  /* ── Questions ── */
  const [questions,       setQuestions]       = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [currentQ,        setCurrentQ]        = useState(0);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(0);

  /* ── Proctoring UI ── */
  const [proctorStatus,   setProctorStatus]   = useState("initializing");
  const [violationCount,  setViolationCount]  = useState(0);
  const [violationBanner, setViolationBanner] = useState("");
  const [modelsReady,     setModelsReady]     = useState(false);

  /* ── Results ── */
  const [result,      setResult]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [earnedBadge, setEarnedBadge] = useState(null);
  const [showPopup,   setShowPopup]   = useState(false);

  /* ── Refs ── */
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const detectTimer   = useRef(null);
  const countdownRef  = useRef(null);
  const bannerTimer   = useRef(null);
  const startedAt     = useRef(null);
  const submittingRef = useRef(false);

  /*
    Violation counters in a ref so the face-detection interval callback
    always reads the LATEST values (no stale closure).
  */
  const vRef = useRef({
    tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0,
    lookingAway: 0, expressionAlert: 0, noCamera: false,
  });

  /* ══════════════════════════════════════════════════════════
     1. LOAD face-api MODELS  (npm package, CDN weights)
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
        ]);
      } catch (e) {
        console.warn("face-api models failed — tab-switch detection still active", e);
      } finally {
        if (!cancelled) setModelsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ══════════════════════════════════════════════════════════
     2. CAMERA GATE  — test cannot start without camera
  ══════════════════════════════════════════════════════════ */
  const requestCamera = useCallback(async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setProctorStatus("active");
      setPhase("loading");
    } catch {
      vRef.current.noCamera = true;
      setCamError("Camera access is required for this proctored test. Please allow camera access and try again.");
    }
  }, []);

  /* ══════════════════════════════════════════════════════════
     3. FETCH QUESTIONS  (once camera AND models are ready)
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "loading" || !modelsReady) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const url = isFinal
          ? `${import.meta.env.VITE_API_URL}/api/proctor/final-questions?domain=${encodeURIComponent(domain)}&level=${encodeURIComponent(level)}`
          : `${import.meta.env.VITE_API_URL}/api/proctor/questions/${moduleId}?domain=${encodeURIComponent(domain)}&level=${encodeURIComponent(level)}`;

        const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) throw new Error("Failed to load questions");
        if (cancelled) return;

        setQuestions(data.questions);
        setSelectedAnswers(Array(data.questions.length).fill(null));
        setTimeLeft(data.questions.length * 90);
        setPhase("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) setCamError("Failed to load questions. Please refresh the page.");
      }
    })();
    return () => { cancelled = true; };
  }, [phase, modelsReady, domain, level, moduleId, isFinal]);

  /* ══════════════════════════════════════════════════════════
     4. COUNTDOWN TIMER
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking") return;
    countdownRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(countdownRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase]); // eslint-disable-line

  /* ══════════════════════════════════════════════════════════
     5. VIOLATION HELPER  (ref-based — no stale closure)
  ══════════════════════════════════════════════════════════ */
  const addViolation = useCallback((type, bannerText) => {
    vRef.current[type] = (vRef.current[type] || 0) + 1;
    const total =
      vRef.current.tabSwitches + vRef.current.faceNotDetected +
      vRef.current.multipleFaces + vRef.current.lookingAway +
      vRef.current.expressionAlert;
    setViolationCount(total);
    if (bannerText) showBanner(bannerText);
    if (total >= MAX_VIOLATIONS) handleSubmit();
  }, []); // eslint-disable-line

  function showBanner(text) {
    setViolationBanner(text);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setViolationBanner(""), 3500);
  }

  /* ══════════════════════════════════════════════════════════
     6. TAB-SWITCH DETECTION
     FIX: ONLY visibilitychange — window.blur REMOVED.
     Both fire together on a tab switch = double count.
     visibilitychange is the correct and only signal needed.
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking") return;

    const onVisibility = () => {
      if (document.hidden)
        addViolation("tabSwitches", "⚠️ Tab switch detected — please stay on this page!");
    };
    const noCtx = (e) => e.preventDefault(); // block right-click (no violation counted)

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", noCtx);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", noCtx);
    };
    // window.blur intentionally NOT added here
  }, [phase, addViolation]);

  /* ══════════════════════════════════════════════════════════
     7. FACE DETECTION LOOP
     Uses imported face-api (not window.faceapi) so it always works.
     Detects: no face, multiple faces, looking away, suspicious expressions.
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking" || !modelsReady) return;

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused) return;
      try {
        const dets = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceExpressions();

        if (dets.length === 0) {
          addViolation("faceNotDetected", "⚠️ No face detected — please stay in frame!");
        } else if (dets.length > 1) {
          addViolation("multipleFaces", "⚠️ Multiple faces detected!");
        } else {
          // Head-pose proxy via face-centre X position
          const { x, width: fw } = dets[0].detection.box;
          const vw  = video.videoWidth || 640;
          if (Math.abs((x + fw / 2) / vw - 0.5) > LOOK_AWAY)
            addViolation("lookingAway", "⚠️ Please look at the screen!");

          // Suspicious expression (silent — counted but no banner)
          if (dets[0].expressions) {
            const top = Object.entries(dets[0].expressions).sort((a, b) => b[1] - a[1])[0];
            if (top && SUSPICIOUS.includes(top[0]) && top[1] > EXPR_THRESHOLD)
              vRef.current.expressionAlert = (vRef.current.expressionAlert || 0) + 1;
          }
        }
      } catch { /* ignore per-frame errors */ }
    };

    detectTimer.current = setInterval(tick, DETECT_MS);
    return () => clearInterval(detectTimer.current);
  }, [phase, modelsReady, addViolation]);

  /* ══════════════════════════════════════════════════════════
     8. SUBMIT  — scores, saves to DB, and marks module complete
  ══════════════════════════════════════════════════════════ */
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    clearInterval(countdownRef.current);
    clearInterval(detectTimer.current);
    streamRef.current?.getTracks().forEach(t => t.stop());

    let correct = 0;
    questions.forEach((q, i) => { if (selectedAnswers[i] === q.correctIndex) correct++; });
    const total   = questions.length || 1;
    const score   = Math.round((correct / total) * 100);
    const passed  = score >= 60;
    const totalV  =
      vRef.current.tabSwitches + vRef.current.faceNotDetected +
      vRef.current.multipleFaces + vRef.current.lookingAway + vRef.current.expressionAlert;
    const flagged = totalV >= MAX_VIOLATIONS || vRef.current.multipleFaces > 0 || vRef.current.tabSwitches > 2;
    const reason  = flagged
      ? `tabs=${vRef.current.tabSwitches} noFace=${vRef.current.faceNotDetected} multi=${vRef.current.multipleFaces}`
      : "";

    const token = localStorage.getItem("token");

    try {
      /* Save attempt to ProctorAttempt (analytics, Study Buddy context) */
      await fetch(`${import.meta.env.VITE_API_URL}/api/proctor/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          moduleId: isFinal ? "final" : moduleId,
          questions, userAnswers: selectedAnswers, score,
          violations: { ...vRef.current },
          flagged, reason,
          startedAt: startedAt.current,
          endedAt: new Date(),
        }),
      });
    } catch (err) {
      console.error("saveAttempt failed:", err);
    }

    /* ─────────────────────────────────────────────────────────
       BUG 3 FIX: Call /api/progress/complete-module when passed.
       This writes moduleStatus[moduleId] = "completed" to the DB.
       CoursePage reads moduleStatus from /api/progress/:courseId,
       so after refreshModuleStatus() it will see the module as done
       and unlock the next one — without needing any localStorage key.
    ───────────────────────────────────────────────────────────── */
    if (passed && !isFinal) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/progress/complete-module`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ courseId, moduleId }),
        });
      } catch (err) {
        console.error("complete-module failed:", err);
      }
    }

    setResult({ score, passed, flagged, correct, total, violations: { ...vRef.current } });
    setSaving(false);
    setPhase("submitted");
  }, [questions, selectedAnswers, courseId, moduleId, isFinal]);

  /* ══════════════════════════════════════════════════════════
     9. POST-SUBMIT EFFECTS  (badge only — module unlock handled above)
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "submitted" || !result?.passed || !isFinal) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/add-badge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: "course-completion" }),
        });
        const data = await res.json();
        if (data.success) { setEarnedBadge(data.badge); setShowPopup(true); }
      } catch (err) { console.error("Badge failed:", err); }
    })();
  }, [phase, result, isFinal]);

  /* ══════════════════════════════════════════════════════════
     CLEANUP
  ══════════════════════════════════════════════════════════ */
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(detectTimer.current);
    clearInterval(countdownRef.current);
    clearTimeout(bannerTimer.current);
  }, []);

  /* ── helpers ── */
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  const answeredCount = selectedAnswers.filter(a => a !== null).length;
  const progress      = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const isUrgent      = timeLeft > 0 && timeLeft < 60;

  /* ══════════════════════════════════════════════════════════
     RENDER — PERMISSION SCREEN
  ══════════════════════════════════════════════════════════ */
  if (phase === "permission") return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--enliven-deep-purple, #2B124C)" }}>
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Proctored Assessment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFinal ? "Final Exam" : `Module ${moduleId}`} · {domain} · {level}
          </p>
        </div>
        <div className="w-full bg-secondary rounded-xl p-4 space-y-2.5 text-sm">
          <p className="font-semibold text-foreground mb-2">This exam monitors:</p>
          {[
            { icon: <Camera className="w-4 h-4"/>,     text: "Webcam — face presence & position (AI)" },
            { icon: <Eye className="w-4 h-4"/>,        text: "Head direction & expressions" },
            { icon: <Users className="w-4 h-4"/>,      text: "Multiple people in frame" },
            { icon: <MonitorOff className="w-4 h-4"/>, text: "Tab switches" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-muted-foreground">
              <span style={{ color: "var(--enliven-purple, #582B5B)" }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
        <p className="text-xs text-center font-semibold text-destructive">
          Camera access is required — you cannot proceed without it.
        </p>
        {camError && (
          <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {camError}
          </div>
        )}
        <video ref={videoRef} style={{ display: "none" }} muted playsInline />
        <Button className="w-full h-11 text-base font-semibold text-white"
          style={{ background: "var(--enliven-deep-purple, #2B124C)" }}
          onClick={requestCamera}>
          Allow Camera & Continue
        </Button>
      </div>
    </div>
  );

  /* ── LOADING ── */
  if (phase === "loading") return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-border rounded-full animate-spin"
        style={{ borderTopColor: "var(--enliven-purple, #582B5B)" }} />
      <p className="text-muted-foreground text-sm">
        {modelsReady ? "Generating your questions…" : "Loading AI proctoring models…"}
      </p>
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />
    </div>
  );

  /* ── READY ── */
  if (phase === "ready") return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center gap-5">
        <h2 className="text-xl font-bold text-foreground">Ready to Begin?</h2>
        <div className="w-full rounded-2xl overflow-hidden border border-border aspect-video bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "#10b981" }}>
          <CheckCircle2 className="w-4 h-4" />
          Camera active — face detection is ready
        </div>
        <div className="w-full bg-secondary rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
          {[
            { val: questions.length, label: "Questions" },
            { val: fmt(timeLeft),    label: "Time Limit" },
            { val: "60%",            label: "Pass Mark"  },
          ].map(({ val, label }) => (
            <div key={label}>
              <p className="font-bold text-foreground text-lg">{val}</p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </div>
          ))}
        </div>
        <Button className="w-full h-11 font-semibold text-base text-white"
          style={{ background: "var(--enliven-deep-purple, #2B124C)" }}
          onClick={() => { startedAt.current = new Date(); setPhase("taking"); }}>
          Start Assessment
        </Button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER — SUBMITTED / RESULTS
  ══════════════════════════════════════════════════════════ */
  if (phase === "submitted" && result) {
    const { score, passed, flagged, correct, total, violations: v } = result;
    return (
      <div className="min-h-screen bg-background p-6">
        {showPopup && earnedBadge && (
          <BadgePopup badge={earnedBadge}
            onClose={() => setShowPopup(false)}
            onCollect={() => { setShowPopup(false); navigate("/profile"); }} />
        )}
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Score card */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-lg">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: passed ? "#10b981" : "#ef4444" }}>
              {passed ? <CheckCircle2 className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {passed ? (isFinal ? "Course Complete! 🎉" : "Test Passed! ⭐") : "Test Failed"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {passed
                  ? isFinal ? "You've mastered this course!" : "Next module is now unlocked."
                  : "You need 60% to pass. Review the module and try again."}
              </p>
            </div>
            <p className="text-6xl font-extrabold" style={{ color: passed ? "#10b981" : "#ef4444" }}>
              {score}%
            </p>
            <p className="text-muted-foreground">{correct} / {total} correct</p>
          </div>

          {/* Proctoring report */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4" style={{ color: "var(--enliven-purple, #582B5B)" }} />
              Proctoring Report
            </h2>
            {flagged && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                This attempt has been flagged for review.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Tab Switches",      val: v.tabSwitches     },
                { label: "Face Not Detected", val: v.faceNotDetected },
                { label: "Multiple Faces",    val: v.multipleFaces   },
                { label: "Looking Away",      val: v.lookingAway     },
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
            <Button variant="outline" className="flex-1 h-11"
              onClick={() => {
                vRef.current = { tabSwitches:0, faceNotDetected:0, multipleFaces:0, lookingAway:0, expressionAlert:0, noCamera:false };
                submittingRef.current = false;
                setSelectedAnswers(Array(questions.length).fill(null));
                setCurrentQ(0); setViolationCount(0); setResult(null);
                setPhase("permission");
              }}>
              <RotateCcw className="mr-2 w-4 h-4" /> Retake Test
            </Button>

            {passed && (
              isFinal ? (
                <Button className="flex-1 h-11 font-semibold text-white"
                  style={{ background: "var(--enliven-deep-purple, #2B124C)" }}
                  onClick={() => earnedBadge ? setShowPopup(true) : navigate("/dashboard")}>
                  🎖️ {earnedBadge ? "View Badge" : "Go to Dashboard"}
                </Button>
              ) : (
                <Button className="flex-1 h-11 font-semibold text-white"
                  style={{ background: "var(--enliven-deep-purple, #2B124C)" }}
                  onClick={() => navigate(`/courses/${domain}/${level}`)}>
                  Continue Learning →
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RENDER — TAKING EXAM
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5" style={{ color: "var(--enliven-purple, #582B5B)" }} />
          <span className="font-semibold text-foreground text-sm">
            {isFinal ? "Final Exam" : `Module ${moduleId} Assessment`}
          </span>
          <span className="text-muted-foreground text-xs hidden sm:inline">· {domain} · {level}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {answeredCount}/{questions.length} answered
          </span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums
            ${isUrgent ? "bg-red-50 text-red-600 border border-red-200" : "bg-secondary text-foreground"}`}>
            <Clock className="w-3.5 h-3.5" /> {fmt(timeLeft)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: "var(--enliven-purple, #582B5B)" }} />
      </div>

      {/* Violation banner */}
      {violationBanner && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm font-medium text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {violationBanner}
          <span className="ml-auto text-xs text-red-500">{violationCount}/{MAX_VIOLATIONS} violations</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6 grid lg:grid-cols-[1fr,280px] gap-6">

        {/* ── LEFT: Question panel ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: "var(--enliven-purple, #582B5B)" }}>
              Question {currentQ + 1} of {questions.length}
            </span>
            {questions[currentQ]?.difficulty && (
              <span className="text-xs text-muted-foreground">
                {"★".repeat(questions[currentQ].difficulty)}{"☆".repeat(5 - questions[currentQ].difficulty)}
              </span>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <p className="text-foreground text-lg font-medium leading-relaxed mb-6">
              {questions[currentQ]?.question}
            </p>
            <div className="space-y-3">
              {questions[currentQ]?.options.map((opt, i) => {
                const sel = selectedAnswers[currentQ] === i;
                return (
                  <button key={i}
                    onClick={() => { const a=[...selectedAnswers]; a[currentQ]=i; setSelectedAnswers(a); }}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all"
                    style={{
                      borderColor: sel ? "var(--enliven-purple,#582B5B)" : "var(--border)",
                      background:  sel ? "rgba(88,43,91,0.07)" : "var(--card)",
                      color: "var(--foreground)",
                    }}>
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: sel ? "var(--enliven-purple,#582B5B)" : "var(--secondary)",
                        color: sel ? "#fff" : "var(--muted-foreground)",
                      }}>
                      {["A","B","C","D"][i]}
                    </span>
                    <span className="text-sm leading-relaxed pt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" disabled={currentQ===0} onClick={()=>setCurrentQ(q=>q-1)}>
              ← Previous
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button style={{ background:"var(--enliven-deep-purple,#2B124C)", color:"#fff" }}
                onClick={()=>setCurrentQ(q=>q+1)}>
                Next <ChevronRight className="ml-1 w-4 h-4"/>
              </Button>
            ) : (
              <Button style={{ background:"#10b981", color:"#fff" }}
                onClick={handleSubmit} disabled={saving}>
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
                const ans = selectedAnswers[i] !== null, cur = i===currentQ;
                return (
                  <button key={i} onClick={()=>setCurrentQ(i)}
                    className="w-9 h-9 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: cur?"var(--enliven-purple,#582B5B)":ans?"rgba(88,43,91,0.12)":"var(--secondary)",
                      color: cur?"#fff":ans?"var(--enliven-purple,#582B5B)":"var(--muted-foreground)",
                      border: cur?"2px solid var(--enliven-purple,#582B5B)":ans?"2px solid rgba(88,43,91,0.3)":"2px solid transparent",
                    }}>
                    {i+1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Proctoring sidebar ── */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-3">
              <ShieldCheck className="w-4 h-4" style={{color:"var(--enliven-purple,#582B5B)"}}/>
              Proctoring Status
            </h3>
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-3"
              style={{
                background: proctorStatus==="active" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                color:      proctorStatus==="active" ? "#10b981" : "#ef4444",
                border: `1px solid ${proctorStatus==="active" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
              <span className="w-2 h-2 rounded-full animate-pulse"
                style={{background: proctorStatus==="active" ? "#10b981" : "#ef4444"}}/>
              {proctorStatus==="active" ? "Camera active" : "Camera not available"}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Violations</span>
                <span className="font-semibold text-foreground">{violationCount} / {MAX_VIOLATIONS}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width:`${Math.min((violationCount/MAX_VIOLATIONS)*100,100)}%`,
                    background: violationCount>=3?"#ef4444":violationCount>=2?"#f59e0b":"#10b981",
                  }}/>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-3">
              <Camera className="w-4 h-4" style={{color:"var(--enliven-purple,#582B5B)"}}/>
              Webcam
            </h3>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Keep your face visible at all times
            </p>
          </div>

          <Button className="w-full h-11 font-semibold text-white" style={{background:"#10b981"}}
            onClick={handleSubmit}
            disabled={saving || answeredCount < questions.length}>
            {saving ? "Submitting…"
              : answeredCount < questions.length
              ? `${questions.length - answeredCount} unanswered`
              : "Submit Assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
