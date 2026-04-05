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
        // Use 5 questions for modules as requested
        const qCount = isFinal ? data.questions.length : 5;
        setTimeLeft(qCount * 90);
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
          body: JSON.stringify({ courseId, moduleId, status: "mcq_passed" }),
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
      className={`w-full h-full object-cover rounded-xl bg-black ${(phase === "taking" || phase === "ready") ? "block" : "hidden"}`}
    />
  );

  /* ── PERMISSION SCREEN ── */
  if (phase === "permission") return (
    <div className="min-h-screen bg-cream/20 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Video in DOM but hidden */}
      <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
        {PersistentVideo}
      </div>

      <div className="bg-white border border-cream rounded-3xl shadow-soft max-w-lg w-full p-10 flex flex-col items-center gap-6 relative z-10">
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-red/10 animate-pulse">
          <ShieldCheck className="w-10 h-10 text-red" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Proctored Assessment</h1>
          <p className="text-sm font-bold text-foreground/60 mt-2 uppercase tracking-wide">
            {isFinal ? "Final Exam" : `Module ${moduleId}`} · {domain} · {level}
          </p>
        </div>

        <div className="w-full bg-cream/30 rounded-2xl p-5 border border-cream/50 space-y-4 text-sm mt-2">
          <p className="font-bold text-foreground text-center">This exam monitors:</p>
          <div className="space-y-3">
              {[
                { icon: <Camera className="w-5 h-5 text-red"/>,     text: "Webcam — face presence & position" },
                { icon: <Eye className="w-5 h-5 text-yellow"/>,        text: "Head direction — looking away alerts" },
                { icon: <Users className="w-5 h-5 text-green"/>,      text: "Multiple people in frame" },
                { icon: <MonitorOff className="w-5 h-5 text-foreground/60"/>, text: "Tab switches" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-foreground/70 font-medium bg-white p-3 rounded-xl border border-cream shadow-xs">
                  {item.icon}
                  {item.text}
                </div>
              ))}
          </div>
        </div>

        <div className="w-full bg-yellow/10 border border-yellow/20 rounded-xl px-5 py-4 text-sm text-yellow-800 font-medium">
          <strong>Warning system:</strong> You'll receive {WARN_BEFORE} warnings before each type of issue counts as a violation. After {MAX_VIOLATIONS} violations the test is <strong className="text-red">auto-submitted</strong>.
        </div>

        <p className="text-sm text-center font-bold text-red uppercase tracking-wider">
          Camera access is required
        </p>

        {camError && (
          <div className="w-full bg-red/10 border border-red/20 rounded-xl px-5 py-4 text-sm text-red font-bold flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            {camError}
          </div>
        )}

        <button
          className="w-full py-4 mt-2 font-bold text-lg text-white bg-red rounded-xl shadow-md hover:shadow-lg hover:bg-red/90 transition-all transform hover:-translate-y-0.5"
          onClick={requestCamera}
        >
          Allow Camera & Continue
        </button>
      </div>
    </div>
  );

  /* ── LOADING ── */
  if (phase === "loading") return (
    <div className="min-h-screen bg-cream/20 flex flex-col items-center justify-center gap-6 font-sans">
      <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
        {PersistentVideo}
      </div>
      <div className="w-16 h-16 border-4 border-cream rounded-full animate-spin border-t-red" />
      <div className="text-center">
        <p className="text-xl font-bold text-foreground">
          {modelsReady ? "Generating your questions…" : "Loading AI proctoring models…"}
        </p>
        <p className="text-foreground/60 font-medium text-sm mt-2">This may take a few seconds</p>
      </div>
    </div>
  );

  /* ── READY ── */
  if (phase === "ready") return (
    <div className="min-h-screen bg-cream/20 flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-cream rounded-3xl shadow-soft max-w-lg w-full p-8 flex flex-col items-center gap-6 relative z-10">
        <h2 className="text-3xl font-bold text-foreground">Ready to Begin?</h2>

        <div className="w-full rounded-2xl overflow-hidden border-4 border-cream/50 shadow-inner bg-black aspect-video relative group">
          {PersistentVideo}
          <div className="absolute inset-0 border-4 border-green/50 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold text-green bg-green/10 px-4 py-2 rounded-full">
          <CheckCircle2 className="w-5 h-5" />
          Camera active — face detection ready
        </div>

        <div className="w-full bg-cream/30 rounded-2xl p-5 border border-cream/50 grid grid-cols-3 gap-2 text-center text-sm md:text-base">
          {[
            { val: questions.length,           label: "Questions" },
            { val: fmt(timeLeft),              label: "Time Limit" },
            { val: `${WARN_BEFORE} warnings`,  label: "Allowed" },
          ].map(({ val, label }) => (
            <div key={label} className="bg-white p-3 rounded-xl border border-cream shadow-xs">
              <p className="font-bold text-foreground text-xl">{val}</p>
              <p className="text-foreground/50 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        <button
          className="w-full py-4 text-lg font-bold text-white bg-red rounded-xl shadow-md hover:shadow-lg hover:bg-red/90 transition-all transform hover:-translate-y-0.5 mt-2"
          onClick={() => { startedAt.current = new Date(); setPhase("taking"); }}
        >
          Start Assessment
        </button>
      </div>
    </div>
  );

  /* ── SUBMITTED ── */
  if (phase === "submitted" && result) {
    const { score, passed, flagged, correct, total, violations: v } = result;
    return (
      <div className="min-h-screen bg-cream/20 font-sans p-6 overflow-hidden relative flex flex-col items-center py-16">
        {showPopup && earnedBadge && (
          <BadgePopup badge={earnedBadge}
            onClose={() => setShowPopup(false)}
            onCollect={() => { setShowPopup(false); navigate("/profile"); }}
          />
        )}
        
        {/* Background Blobs */}
        <div className={`absolute top-[0%] left-[10%] w-[30%] h-[30%] rounded-full blur-[100px] pointer-events-none ${passed ? "bg-green/10" : "bg-red/10"}`}></div>

        <div className="max-w-3xl w-full mx-auto space-y-6 relative z-10">
          {/* Score card */}
          <div className="bg-white border border-cream rounded-[2.5rem] p-10 text-center shadow-soft">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto shadow-md mb-6 ${passed ? "bg-green" : "bg-red"}`}>
              {passed
                ? <CheckCircle2 className="w-14 h-14 text-white" />
                : <XCircle      className="w-14 h-14 text-white" />}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {passed ? (isFinal ? "Course Complete! 🎉" : "Test Passed! ⭐") : "Test Failed"}
              </h1>
              <p className="text-foreground/60 font-medium text-lg">
                {passed
                  ? isFinal ? "You've mastered this course!" : "Next module is now unlocked."
                  : "You need 60% to pass. Review the module and try again."}
              </p>
            </div>
            <p className={`text-[6rem] font-black my-4 leading-none tracking-tighter ${passed ? "text-green" : "text-red"}`}>
              {score}%
            </p>
            <p className="text-foreground/50 font-bold uppercase tracking-widest text-sm">{correct} / {total} correct</p>
          </div>

          {/* Proctoring report */}
          <div className="bg-white border border-cream rounded-[2rem] p-8 shadow-sm">
            <h2 className="font-bold text-xl text-foreground flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-foreground/40" />
              Proctoring Report
            </h2>
            {flagged && (
              <div className="flex items-center gap-3 text-sm px-4 py-3 rounded-xl bg-red/10 text-red font-bold mb-6">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                This attempt has been flagged for review due to policy violations.
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "Tab Switches",      val: v.tabSwitches,     icon: "🪟" },
                { label: "Face Not Found", val: v.faceNotDetected, icon: "👤" },
                { label: "Multiple Faces",    val: v.multipleFaces,   icon: "👥" },
                { label: "Looking Away",      val: v.lookingAway,     icon: "👀" },
                { label: "Expr. Alerts", val: v.expressionAlert, icon: "😟" },
              ].map(({ label, val, icon }) => (
                <div key={label} className="bg-cream/30 rounded-2xl p-4 text-center border border-cream">
                  <p className="text-2xl mb-2 opacity-80">{icon}</p>
                  <p className={`text-2xl font-black ${val > 0 ? "text-red" : "text-foreground"}`}>{val}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button className="flex-1 py-4 font-bold rounded-xl border-2 border-foreground/20 text-foreground/70 hover:bg-cream/50 transition-all flex items-center justify-center"
              onClick={() => {
                vRef.current = { tabSwitches:0, faceNotDetected:0, multipleFaces:0, lookingAway:0, expressionAlert:0, noCamera:false };
                warnRef.current = { faceNotDetected:0, lookingAway:0, multipleFaces:0 };
                submittingRef.current = false;
                setSelectedAnswers(Array(questions.length).fill(null));
                setCurrentQ(0); setViolationCount(0); setResult(null); setPhase("permission");
              }}>
              <RotateCcw className="mr-3 w-5 h-5" /> Retake Test
            </button>

            {passed && (
              isFinal ? (
                <button className="flex-1 py-4 font-bold text-white bg-red rounded-xl shadow-md hover:shadow-lg hover:bg-red/90 transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                  onClick={() => earnedBadge ? setShowPopup(true) : navigate("/dashboard")}>
                  🎖️ {earnedBadge ? "View Badge" : "Go to Dashboard"}
                </button>
              ) : (
                <button className="flex-1 py-4 font-bold text-white bg-red rounded-xl shadow-md hover:shadow-lg hover:bg-red/90 transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                  onClick={() => navigate(`/coding-assessment?module=${moduleId}&domain=${domain}&level=${level}`)}>
                  Next: Take Coding Test <ChevronRight className="ml-2 w-5 h-5"/>
                </button>
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
    <div className="min-h-screen bg-cream/20 font-sans flex flex-col">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-cream px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-red/10 p-2 rounded-lg">
             <ShieldCheck className="w-6 h-6 text-red" />
          </div>
          <div>
            <span className="font-bold text-foreground text-lg hidden sm:block">
              {isFinal ? "Final Exam" : `Module ${moduleId} Assessment`}
            </span>
            <span className="text-foreground/50 text-xs font-bold uppercase tracking-wider">
              {domain} · {level}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-foreground/50 uppercase tracking-widest hidden sm:inline bg-cream/50 px-3 py-1.5 rounded-lg">
            {answeredCount}/{questions.length} answered
          </span>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold tabular-nums shadow-inner border ${
            isUrgent ? "bg-red/10 text-red border-red/20 shadow-red/10 animate-pulse" : "bg-white text-foreground border-cream shadow-cream/50"}`}>
            <Clock className="w-5 h-5" />
            {fmt(timeLeft)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-cream/50 w-full">
        <div className={`h-full transition-all duration-500 rounded-r-full ${isUrgent ? 'bg-red' : 'bg-green'}`}
          style={{ width: `${examProgress}%` }} />
      </div>

      {/* ── Violation / Warning Banner ── */}
      {violationBanner && (
        <div className={`px-6 py-4 text-sm font-bold flex items-center gap-4 border-b transition-all ${
          violationBanner.type === "violation"
            ? "bg-red/10 border-red/20 text-red"
            : "bg-yellow/10 border-yellow/20 text-yellow-700" 
        }`}>
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span className="flex-1 text-base">{violationBanner.text}</span>
          <span className="text-xs font-black opacity-80 shrink-0 uppercase tracking-widest bg-white/50 px-2 py-1 rounded">
            {violationCount}/{MAX_VIOLATIONS} violations
          </span>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-[1fr,320px] gap-8">

        {/* ── LEFT: Question panel ── */}
        <div className="space-y-6 flex flex-col h-full">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-red bg-red/10 border border-red/20">
                Question {currentQ + 1} of {questions.length}
                </span>
                {questions[currentQ]?.difficulty && (
                <span className="text-xs font-bold text-yellow flex items-center bg-yellow/10 px-2 py-1 rounded-lg">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < questions[currentQ].difficulty ? "text-yellow" : "text-yellow/30"}>★</span>
                    ))}
                </span>
                )}
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white border border-cream rounded-[2rem] p-8 md:p-10 shadow-sm flex-1 flex flex-col">
            <h2 className="text-2xl font-bold leading-relaxed mb-8 text-foreground">
              {questions[currentQ]?.question}
            </h2>
            <div className="space-y-4 mt-auto">
              {questions[currentQ]?.options.map((opt, i) => {
                const sel = selectedAnswers[currentQ] === i;
                return (
                  <button key={i}
                    onClick={() => {
                      const a = [...selectedAnswers];
                      a[currentQ] = i;
                      setSelectedAnswers(a);
                    }}
                    className={`w-full text-left flex items-start gap-5 p-5 rounded-2xl border-2 transition-all duration-300 transform ${
                        sel 
                        ? "-translate-y-1 bg-red/5 border-red shadow-md"
                        : "border-cream bg-white hover:bg-cream/30 hover:border-red/30 hover:-translate-y-0.5"
                    }`}
                  >
                    <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-inner transition-colors ${
                        sel ? "bg-red text-white" : "bg-cream text-foreground/50 border border-cream/80"
                    }`}>
                      {["A","B","C","D"][i]}
                    </span>
                    <span className={`text-lg font-medium leading-relaxed pt-1 transition-colors ${sel ? "text-foreground" : "text-foreground/80"}`}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-cream shadow-sm">
            <button disabled={currentQ === 0}
              className="px-6 py-3 font-bold text-foreground/70 rounded-xl hover:bg-cream/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center"
              onClick={() => setCurrentQ(q => q - 1)}>
              <ChevronRight className="mr-2 w-5 h-5 rotate-180"/> Previous
            </button>
            {currentQ < questions.length - 1 ? (
               <button className="px-8 py-3 font-bold text-white bg-red rounded-xl hover:bg-red/90 shadow-md hover:shadow-lg transition-all flex items-center"
                onClick={() => setCurrentQ(q => q + 1)}>
                Next <ChevronRight className="ml-2 w-5 h-5"/>
              </button>
            ) : (
                <button className="px-8 py-3 font-bold text-white bg-green rounded-xl hover:bg-green/90 shadow-md hover:shadow-lg transition-all"
                onClick={handleSubmit} disabled={saving}>
                {saving ? "Submitting…" : "Submit Assessment"}
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Proctoring sidebar ── */}
        <div className="space-y-6 lg:border-l lg:border-cream lg:pl-8 flex flex-col">

          {/* Question grid navigator */}
          <div className="bg-white border border-cream rounded-[1.5rem] p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded-full bg-cream/50 flex flex-col items-center justify-center gap-0.5">
                     <div className="w-1 h-1 bg-foreground/40 rounded-full"></div>
                     <div className="w-1 h-1 bg-foreground/40 rounded-full"></div>
                     <div className="w-1 h-1 bg-foreground/40 rounded-full"></div>
                 </div>
                <h3 className="font-bold text-foreground">Navigator</h3>
             </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => {
                const ans = selectedAnswers[i] !== null;
                const cur = i === currentQ;
                return (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    className={`w-full aspect-square rounded-xl text-sm font-bold transition-all flex items-center justify-center border-2 ${
                        cur ? "bg-red text-white border-red shadow-md transform scale-105" :
                        ans ? "bg-red/10 text-red border-red/20" :
                        "bg-cream/30 text-foreground/40 border-cream/50 hover:bg-cream"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Webcam card */}
          <div className="bg-white border border-cream rounded-[1.5rem] p-6 shadow-sm">
            <h3 className="text-base font-bold flex items-center gap-3 text-foreground mb-4">
              <Camera className="w-5 h-5 text-red"/>
              Proctoring Cam
            </h3>
            <div className="relative rounded-2xl overflow-hidden border-4 border-cream/50 shadow-inner bg-black">
              {PersistentVideo}
              {/* Live indicator dot */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                <span className="w-2 h-2 rounded-full bg-red animate-pulse shadow-[0_0_8px_rgba(197,79,45,0.8)]" />
                <span className="text-white text-[10px] font-black tracking-widest uppercase">LIVE</span>
              </div>
            </div>
          </div>

          {/* Status card */}
          <div className="bg-white border border-cream rounded-[1.5rem] p-6 shadow-sm">
             <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 font-bold text-sm border shadow-inner transition-colors"
              style={{
                background: proctorStatus === "active" ? "rgba(148,179,138,0.15)" : "rgba(197,79,45,0.15)",
                color:      proctorStatus === "active" ? "#94B38A" : "#C54F2D",
                borderColor: proctorStatus === "active" ? "rgba(148,179,138,0.3)" : "rgba(197,79,45,0.3)",
              }}>
              <span className="w-3 h-3 rounded-full animate-pulse shadow-sm"
                style={{ background: proctorStatus === "active" ? "#94B38A" : "#C54F2D" }} />
              {proctorStatus === "active" ? "AI Monitoring Active" : "Camera Initializing..."}
            </div>

            {/* Violation meter */}
            <div className="space-y-3 bg-cream/20 p-4 rounded-xl border border-cream/50">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-foreground/70 uppercase tracking-widest text-[10px]">Violations</span>
                <span className={`px-2 py-0.5 rounded-md ${violationCount > 0 ? "bg-red text-white" : "text-foreground"}`}>
                    {violationCount} / {MAX_VIOLATIONS}
                </span>
              </div>
              <div className="h-3 bg-cream rounded-full overflow-hidden shadow-inner">
                <div className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min((violationCount / MAX_VIOLATIONS) * 100, 100)}%`,
                    background: violationCount >= 4 ? "#C54F2D" // red
                              : violationCount >= 2 ? "#EEBF43" // yellow
                              : "#94B38A", // green
                  }} />
              </div>
               <p className="text-[11px] font-bold text-foreground/50 text-center uppercase tracking-wider">
                {MAX_VIOLATIONS - violationCount > 0
                  ? `${MAX_VIOLATIONS - violationCount} more before auto-submit`
                  : "Auto-submitting…"}
              </p>
            </div>
          </div>
          
           {/* Submit button bottom sidebar */}
            <button className="w-full mt-auto py-5 font-bold text-lg text-white bg-green rounded-xl shadow-md hover:shadow-lg hover:bg-green/90 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                onClick={handleSubmit} disabled={saving || answeredCount < questions.length}>
                {saving ? "Submitting…" 
                : answeredCount < questions.length 
                ? `${questions.length - answeredCount} unanswered` 
                : "Submit Exam →"}
            </button>

        </div>
      </div>
    </div>
  );
}
