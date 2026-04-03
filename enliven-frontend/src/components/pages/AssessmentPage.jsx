// pages/AssessmentPage.jsx
//
// FIXES IN THIS VERSION:
//
// FIX 1 — CAMERA NOT VISIBLE DURING EXAM
//   Root cause: videoRef is shared across phase-conditional renders.
//   When phase changes, React unmounts the old <video> and mounts a new one.
//   The new DOM node never gets srcObject assigned → black box.
//   Fix: ONE <video> element is always in the DOM (never conditionally
//   rendered). We hide it with CSS when not needed. srcObject is assigned
//   once on stream acquisition and persists through all phase transitions.
//
// FIX 2 — VIOLATIONS COUNTED IMMEDIATELY (should warn first)
//   User wants: warn on 1st & 2nd detection, count as violation on 3rd+
//   Fix: per-type "warningCount" ref tracks how many warnings were shown.
//   First 2 detections of any type → show warning banner only (no counter).
//   3rd detection onwards → increment violation count.
//   This applies to: faceNotDetected, lookingAway, multipleFaces.
//   Tab switches are always immediate violations (intentional action).
//
// FIX 3 — face-api.js npm has Vite ESM issues
//   Fix: use @vladmandic/face-api which has proper ESM/Vite support.
//   Run: npm install @vladmandic/face-api
//   Import is identical API, just different package name.

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "@vladmandic/face-api";  // ← correct package for Vite
import {
  Clock, ShieldCheck, Camera, ChevronRight,
  RotateCcw, AlertTriangle, CheckCircle2,
  XCircle, Eye, Users, MonitorOff, Lock,
} from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import BadgePopup from "../BadgePopup";

/* ─── Constants ──────────────────────────────────────────────── */
const MODELS_URL      = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const DETECT_MS       = 3000;    // face scan every 3 s
const LOOK_AWAY_RATIO = 0.28;    // face-centre X deviation > 28% → looking away
const EXPR_THRESHOLD  = 0.65;
const SUSPICIOUS_EXPR = ["surprised", "fearful", "disgusted"];
const MAX_VIOLATIONS  = 5;       // force-submit after this many total violations

// How many WARNINGS to show before a detection type becomes a violation
// e.g. WARN_BEFORE = 2 means: 1st+2nd detection = banner only, 3rd = violation
const WARN_BEFORE = 2;

export default function AssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const p        = new URLSearchParams(location.search);
  const moduleId = p.get("module");
  const isFinal  = p.get("final") === "true";
  const domain   = p.get("domain");
  const level    = p.get("level");
  const courseId = `${domain}-${level}`;

  /* ── Phases ──────────────────────────────────────────────── */
  const [phase,    setPhase]    = useState("permission"); // permission|loading|ready|taking|submitted
  const [camError, setCamError] = useState("");

  /* ── Questions ── */
  const [questions,       setQuestions]       = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [currentQ,        setCurrentQ]        = useState(0);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(0);

  /* ── Proctoring UI ── */
  const [proctorStatus,   setProctorStatus]   = useState("idle");
  const [violationCount,  setViolationCount]  = useState(0);
  const [violationBanner, setViolationBanner] = useState(null); // {text, type}
  const [modelsReady,     setModelsReady]     = useState(false);

  /* ── Results ── */
  const [result,      setResult]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [earnedBadge, setEarnedBadge] = useState(null);
  const [showPopup,   setShowPopup]   = useState(false);

  /* ── Refs ── */
  // FIX 1: Single persistent video ref — never conditionally rendered
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const detectTimer   = useRef(null);
  const countdownRef  = useRef(null);
  const bannerTimer   = useRef(null);
  const startedAt     = useRef(null);
  const submittingRef = useRef(false);

  // Hard violation counters (what gets saved to DB)
  const vRef = useRef({
    tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0,
    lookingAway: 0, expressionAlert: 0, noCamera: false,
  });

  // FIX 2: Warning-before-violation counters (per detection type)
  // Tracks how many consecutive/total warnings were shown before escalating
  const warnRef = useRef({
    faceNotDetected: 0,
    lookingAway:     0,
    multipleFaces:   0,
  });

  /* ══════════════════════════════════════════════════════════
     1. LOAD FACE-API MODELS
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
        console.warn("face-api models failed to load:", e);
      } finally {
        if (!cancelled) setModelsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ══════════════════════════════════════════════════════════
     2. CAMERA PERMISSION GATE
     FIX 1: We assign srcObject to videoRef.current here.
     Since the <video> element is always in the DOM (see render),
     this assignment persists through all phase changes.
  ══════════════════════════════════════════════════════════ */
  const requestCamera = useCallback(async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      // Assign to the persistent video element
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play().catch(() => {});
      }

      setProctorStatus("active");
      setPhase("loading");
    } catch (err) {
      console.error("Camera error:", err);
      vRef.current.noCamera = true;
      setCamError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings and try again."
          : "Could not access camera. Make sure no other app is using it."
      );
    }
  }, []);

  /* ══════════════════════════════════════════════════════════
     3. RE-ATTACH STREAM when video element re-mounts
     FIX 1 continued: This effect runs whenever videoRef.current
     changes (phase transitions). If the stream exists but srcObject
     isn't set yet, we re-assign it.
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }); // runs every render — cheap check, guarantees stream is always attached

  /* ══════════════════════════════════════════════════════════
     4. FETCH QUESTIONS
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
     5. COUNTDOWN TIMER
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
     6. BANNER HELPER
  ══════════════════════════════════════════════════════════ */
  function showBanner(text, type = "warning") {
    setViolationBanner({ text, type });
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setViolationBanner(null), 4000);
  }

  /* ══════════════════════════════════════════════════════════
     7. VIOLATION HELPER WITH WARN-FIRST LOGIC
     FIX 2: For face detections — warn twice before counting violation.
     Tab switches are always immediate violations.
  ══════════════════════════════════════════════════════════ */
  const addViolation = useCallback((type, warningMsg, violationMsg) => {
    const isTabSwitch = type === "tabSwitches";

    if (!isTabSwitch && warnRef.current[type] !== undefined) {
      // Not a tab switch — check warn count
      warnRef.current[type] += 1;
      const warnCount = warnRef.current[type];

      if (warnCount <= WARN_BEFORE) {
        // Still in warning phase — show banner, don't increment violation
        showBanner(`⚠️ Warning ${warnCount}/${WARN_BEFORE}: ${warningMsg}`, "warning");
        return;
      }
      // Past warn threshold — now it's a real violation
      showBanner(`🚨 Violation! ${violationMsg}`, "violation");
    } else {
      // Tab switch — always immediate violation
      showBanner(`🚨 ${violationMsg}`, "violation");
    }

    // Increment hard violation counter
    vRef.current[type] = (vRef.current[type] || 0) + 1;
    const total =
      vRef.current.tabSwitches + vRef.current.faceNotDetected +
      vRef.current.multipleFaces + vRef.current.lookingAway +
      vRef.current.expressionAlert;

    setViolationCount(total);
    if (total >= MAX_VIOLATIONS) handleSubmit();
  }, []); // eslint-disable-line

  /* ══════════════════════════════════════════════════════════
     8. TAB-SWITCH DETECTION  (visibilitychange only — not blur)
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking") return;

    const onVisibility = () => {
      if (document.hidden)
        addViolation("tabSwitches", "", "Tab switch detected — stay on the exam page!");
    };
    const noCtx = (e) => e.preventDefault();

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", noCtx);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", noCtx);
    };
  }, [phase, addViolation]);

  /* ══════════════════════════════════════════════════════════
     9. FACE DETECTION LOOP
     Runs every DETECT_MS while exam is active.
     Detection types:
       • No face     → faceNotDetected (warn × 2, then violation)
       • Look away   → lookingAway     (warn × 2, then violation)
       • Multi face  → multipleFaces   (warn × 2, then violation)
       • Expression  → silent count only
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== "taking" || !modelsReady) return;

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) return;

      try {
        const dets = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
          )
          .withFaceExpressions();

        if (dets.length === 0) {
          addViolation(
            "faceNotDetected",
            "No face detected. Make sure your face is visible in the camera.",
            "Face not detected! Your exam may be terminated."
          );
        } else if (dets.length > 1) {
          addViolation(
            "multipleFaces",
            "Multiple faces detected. Only you should be in frame.",
            "Multiple faces detected! This is not allowed."
          );
        } else {
          // Head-pose proxy: face-centre X deviation
          const { x, width: fw } = dets[0].detection.box;
          const vw  = video.videoWidth || 640;
          const cx  = x + fw / 2;
          const dev = Math.abs(cx / vw - 0.5);

          if (dev > LOOK_AWAY_RATIO) {
            addViolation(
              "lookingAway",
              "Please look straight at the screen.",
              "Looking away detected! Keep your focus on the screen."
            );
          } else {
            // Face is good — reset warn counter so next offense starts fresh
            // (only reset if we haven't already escalated to violations)
            if (warnRef.current.lookingAway <= WARN_BEFORE)
              warnRef.current.lookingAway = 0;
          }

          // Expression check — silent count
          if (dets[0].expressions) {
            const top = Object.entries(dets[0].expressions)
              .sort((a, b) => b[1] - a[1])[0];
            if (top && SUSPICIOUS_EXPR.includes(top[0]) && top[1] > EXPR_THRESHOLD)
              vRef.current.expressionAlert = (vRef.current.expressionAlert || 0) + 1;
          }
        }
      } catch (err) {
        // Silently ignore per-frame detection errors
        console.debug("Face detection tick error:", err.message);
      }
    };

    detectTimer.current = setInterval(tick, DETECT_MS);
    return () => clearInterval(detectTimer.current);
  }, [phase, modelsReady, addViolation]);

  /* ══════════════════════════════════════════════════════════
     10. SUBMIT EXAM
  ══════════════════════════════════════════════════════════ */
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    clearInterval(countdownRef.current);
    clearInterval(detectTimer.current);
    streamRef.current?.getTracks().forEach(t => t.stop());

    let correct = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) correct++;
    });
    const total   = questions.length || 1;
    const score   = Math.round((correct / total) * 100);
    const passed  = score >= 60;
    const totalV  = vRef.current.tabSwitches + vRef.current.faceNotDetected +
                    vRef.current.multipleFaces + vRef.current.lookingAway + vRef.current.expressionAlert;
    const flagged = totalV >= MAX_VIOLATIONS || vRef.current.multipleFaces > 0 || vRef.current.tabSwitches > 2;
    const reason  = flagged
      ? `tabs=${vRef.current.tabSwitches} noFace=${vRef.current.faceNotDetected} multi=${vRef.current.multipleFaces}`
      : "";

    const token = localStorage.getItem("token");

    // Save to ProctorAttempt (analytics + Study Buddy context)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/proctor/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId, moduleId: isFinal ? "final" : moduleId,
          questions, userAnswers: selectedAnswers, score,
          violations: { ...vRef.current }, flagged, reason,
          startedAt: startedAt.current, endedAt: new Date(),
        }),
      });
    } catch (err) {
      console.error("saveAttempt failed:", err);
    }

    // Mark module complete in progress DB so CoursePage can unlock next module
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

  /* ── Post-submit: badge ── */
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

  /* ── Cleanup ── */
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(detectTimer.current);
    clearInterval(countdownRef.current);
    clearTimeout(bannerTimer.current);
  }, []);

  /* ── Helpers ── */
  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  const answeredCount = selectedAnswers.filter(a => a !== null).length;
  const examProgress  = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const isUrgent      = timeLeft > 0 && timeLeft < 60;

  /* ══════════════════════════════════════════════════════════
     RENDER
     FIX 1: The <video> is ALWAYS rendered in the DOM.
     We position it off-screen (not display:none) during phases
     where it doesn't need to be visible, so srcObject persists.
     During "taking" it's visible in the sidebar.
  ══════════════════════════════════════════════════════════ */

  // The persistent video — always in DOM, controlled by CSS visibility
  const PersistentVideo = (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{
        // Always rendered. Hidden when not in taking/ready phase,
        // but NEVER unmounted so srcObject is preserved.
        display: (phase === "taking" || phase === "ready") ? "block" : "none",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: 12,
        background: "#000",
      }}
    />
  );

  /* ── PERMISSION SCREEN ── */
  if (phase === "permission") return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Video in DOM but hidden */}
      <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, overflow: "hidden" }}>
        {PersistentVideo}
      </div>

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

        <div className="w-full bg-secondary rounded-xl p-4 space-y-3 text-sm">
          <p className="font-semibold text-foreground">This exam monitors:</p>
          {[
            { icon: <Camera className="w-4 h-4"/>,     text: "Webcam — face presence & position" },
            { icon: <Eye className="w-4 h-4"/>,        text: "Head direction — looking away alerts" },
            { icon: <Users className="w-4 h-4"/>,      text: "Multiple people in frame" },
            { icon: <MonitorOff className="w-4 h-4"/>, text: "Tab switches" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-muted-foreground">
              <span style={{ color: "var(--enliven-purple, #582B5B)" }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>

        <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Warning system:</strong> You'll receive 2 warnings before each type of issue counts as a violation. After {MAX_VIOLATIONS} violations the test is auto-submitted.
        </div>

        <p className="text-xs text-center font-semibold text-destructive">
          Camera access is required — you cannot proceed without it.
        </p>

        {camError && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {camError}
          </div>
        )}

        <Button
          className="w-full h-11 text-base font-semibold text-white"
          style={{ background: "var(--enliven-deep-purple, #2B124C)" }}
          onClick={requestCamera}
        >
          Allow Camera & Continue
        </Button>
      </div>
    </div>
  );

  /* ── LOADING ── */
  if (phase === "loading") return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1, overflow: "hidden" }}>
        {PersistentVideo}
      </div>
      <div className="w-12 h-12 border-4 border-border rounded-full animate-spin"
        style={{ borderTopColor: "var(--enliven-purple, #582B5B)" }} />
      <div className="text-center">
        <p className="text-foreground font-semibold">
          {modelsReady ? "Generating your questions…" : "Loading AI proctoring models…"}
        </p>
        <p className="text-muted-foreground text-sm mt-1">This may take a few seconds</p>
      </div>
    </div>
  );

  /* ── READY ── */
  if (phase === "ready") return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center gap-5">
        <h2 className="text-xl font-bold text-foreground">Ready to Begin?</h2>

        {/* FIX 1: PersistentVideo shown here — stream already active */}
        <div className="w-full rounded-2xl overflow-hidden border border-border aspect-video bg-black">
          {PersistentVideo}
        </div>

        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#10b981" }}>
          <CheckCircle2 className="w-4 h-4" />
          Camera active — face detection ready
        </div>

        <div className="w-full bg-secondary rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
          {[
            { val: questions.length,           label: "Questions" },
            { val: fmt(timeLeft),              label: "Time Limit" },
            { val: `${WARN_BEFORE} warnings`,  label: "Before Violation" },
          ].map(({ val, label }) => (
            <div key={label}>
              <p className="font-bold text-foreground text-lg">{val}</p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </div>
          ))}
        </div>

        <Button
          className="w-full h-11 font-semibold text-base text-white"
          style={{ background: "var(--enliven-deep-purple, #2B124C)" }}
          onClick={() => { startedAt.current = new Date(); setPhase("taking"); }}
        >
          Start Assessment
        </Button>
      </div>
    </div>
  );

  /* ── SUBMITTED ── */
  if (phase === "submitted" && result) {
    const { score, passed, flagged, correct, total, violations: v } = result;
    return (
      <div className="min-h-screen bg-background p-6">
        {showPopup && earnedBadge && (
          <BadgePopup badge={earnedBadge}
            onClose={() => setShowPopup(false)}
            onCollect={() => { setShowPopup(false); navigate("/profile"); }}
          />
        )}

        <div className="max-w-2xl mx-auto space-y-5">
          {/* Score card */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-lg">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: passed ? "#10b981" : "#ef4444" }}>
              {passed
                ? <CheckCircle2 className="w-10 h-10 text-white" />
                : <XCircle      className="w-10 h-10 text-white" />}
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
            <p className="text-6xl font-extrabold"
              style={{ color: passed ? "#10b981" : "#ef4444" }}>
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
                { label: "Tab Switches",      val: v.tabSwitches,     icon: "🪟" },
                { label: "Face Not Detected", val: v.faceNotDetected, icon: "👤" },
                { label: "Multiple Faces",    val: v.multipleFaces,   icon: "👥" },
                { label: "Looking Away",      val: v.lookingAway,     icon: "👀" },
                { label: "Expression Alerts", val: v.expressionAlert, icon: "😟" },
              ].map(({ label, val, icon }) => (
                <div key={label} className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-base mb-0.5">{icon}</p>
                  <p className="text-xl font-bold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11"
              onClick={() => {
                vRef.current = { tabSwitches:0, faceNotDetected:0, multipleFaces:0, lookingAway:0, expressionAlert:0, noCamera:false };
                warnRef.current = { faceNotDetected:0, lookingAway:0, multipleFaces:0 };
                submittingRef.current = false;
                setSelectedAnswers(Array(questions.length).fill(null));
                setCurrentQ(0); setViolationCount(0); setResult(null); setPhase("permission");
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
     TAKING EXAM
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ── */}
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
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums ${
            isUrgent ? "bg-red-50 text-red-600 border border-red-200" : "bg-secondary text-foreground"}`}>
            <Clock className="w-3.5 h-3.5" />
            {fmt(timeLeft)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div className="h-full transition-all duration-500"
          style={{ width: `${examProgress}%`, background: "var(--enliven-purple, #582B5B)" }} />
      </div>

      {/* ── Violation / Warning Banner ── */}
      {violationBanner && (
        <div className={`px-6 py-3 text-sm font-semibold flex items-center gap-3 border-b transition-all ${
          violationBanner.type === "violation"
            ? "bg-red-100 border-red-300 text-red-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 ${
            violationBanner.type === "violation" ? "text-red-600" : "text-amber-600"}`} />
          <span className="flex-1">{violationBanner.text}</span>
          <span className="text-xs font-medium opacity-70 shrink-0">
            {violationCount}/{MAX_VIOLATIONS} violations
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6 grid lg:grid-cols-[1fr,280px] gap-6">

        {/* ── LEFT: Question panel ── */}
        <div className="space-y-5">
          {/* Question label */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: "var(--enliven-purple, #582B5B)" }}>
              Question {currentQ + 1} of {questions.length}
            </span>
            {questions[currentQ]?.difficulty && (
              <span className="text-xs text-muted-foreground">
                {"★".repeat(questions[currentQ].difficulty)}
                {"☆".repeat(5 - questions[currentQ].difficulty)}
              </span>
            )}
          </div>

          {/* Question card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <p className="text-foreground text-lg font-medium leading-relaxed mb-6">
              {questions[currentQ]?.question}
            </p>
            <div className="space-y-3">
              {questions[currentQ]?.options.map((opt, i) => {
                const sel = selectedAnswers[currentQ] === i;
                return (
                  <button key={i}
                    onClick={() => {
                      const a = [...selectedAnswers];
                      a[currentQ] = i;
                      setSelectedAnswers(a);
                    }}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all duration-150"
                    style={{
                      borderColor: sel ? "var(--enliven-purple, #582B5B)" : "var(--border)",
                      background:  sel ? "rgba(88,43,91,0.07)" : "var(--card)",
                      color: "var(--foreground)",
                    }}
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: sel ? "var(--enliven-purple, #582B5B)" : "var(--secondary)",
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

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="outline" disabled={currentQ === 0}
              onClick={() => setCurrentQ(q => q - 1)}>
              ← Previous
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button style={{ background:"var(--enliven-deep-purple,#2B124C)", color:"#fff" }}
                onClick={() => setCurrentQ(q => q + 1)}>
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
                const ans = selectedAnswers[i] !== null;
                const cur = i === currentQ;
                return (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    className="w-9 h-9 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: cur ? "var(--enliven-purple,#582B5B)" : ans ? "rgba(88,43,91,0.12)" : "var(--secondary)",
                      color:      cur ? "#fff" : ans ? "var(--enliven-purple,#582B5B)" : "var(--muted-foreground)",
                      border:     cur ? "2px solid var(--enliven-purple,#582B5B)" : ans ? "2px solid rgba(88,43,91,0.3)" : "2px solid transparent",
                    }}>
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
              <ShieldCheck className="w-4 h-4" style={{ color: "var(--enliven-purple,#582B5B)" }}/>
              Proctoring Status
            </h3>

            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-3"
              style={{
                background: proctorStatus === "active" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                color:      proctorStatus === "active" ? "#10b981" : "#ef4444",
                border: `1px solid ${proctorStatus === "active" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
              <span className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: proctorStatus === "active" ? "#10b981" : "#ef4444" }} />
              {proctorStatus === "active" ? "Camera active · AI monitoring" : "Camera not available"}
            </div>

            {/* Violation meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Violations</span>
                <span className="font-semibold text-foreground">{violationCount} / {MAX_VIOLATIONS}</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((violationCount / MAX_VIOLATIONS) * 100, 100)}%`,
                    background: violationCount >= 4 ? "#ef4444"
                              : violationCount >= 2 ? "#f59e0b"
                              : "#10b981",
                  }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {MAX_VIOLATIONS - violationCount > 0
                  ? `${MAX_VIOLATIONS - violationCount} more before auto-submit`
                  : "Auto-submitting…"}
              </p>
            </div>
          </div>

          {/* Webcam card — FIX 1: PersistentVideo used here */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-3">
              <Camera className="w-4 h-4" style={{ color: "var(--enliven-purple,#582B5B)" }}/>
              Webcam
            </h3>
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
              {PersistentVideo}
              {/* Live indicator dot */}
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-[10px] font-semibold">LIVE</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Keep your face visible · Look straight at screen
            </p>
          </div>

          {/* Submit button */}
          <Button
            className="w-full h-11 font-semibold text-white"
            style={{ background: "#10b981" }}
            onClick={handleSubmit}
            disabled={saving || answeredCount < questions.length}
          >
            {saving ? "Submitting…"
              : answeredCount < questions.length
              ? `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? "s" : ""} unanswered`
              : "Submit Assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
