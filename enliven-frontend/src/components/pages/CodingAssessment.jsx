import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "@vladmandic/face-api";
import {
  Clock, ShieldCheck, Camera, ChevronRight,
  RotateCcw, AlertTriangle, CheckCircle2,
  XCircle, Eye, Users, MonitorOff, Code,
  Layout, Play, Save, ChevronLeft
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const DETECT_MS = 3000;
const LOOK_AWAY_RATIO = 0.28;
const MAX_VIOLATIONS = 5;
const WARN_BEFORE = 2;

export default function CodingAssessment() {
  const navigate = useNavigate();
  const location = useLocation();

  const p = new URLSearchParams(location.search);
  const moduleId = p.get("module");
  const domain = p.get("domain");
  const level = p.get("level");
  const courseId = `${domain}-${level}`;

  const [phase, setPhase] = useState("permission");
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [solutions, setSolutions] = useState({}); // { 0: { html: "", css: "" } or "code" }
  const [testResults, setTestResults] = useState({}); // { 0: [{ passed: bool, msg: "" }] }
  
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [violationCount, setViolationCount] = useState(0);
  const [violationBanner, setViolationBanner] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimer = useRef(null);
  const countdownRef = useRef(null);
  const bannerTimer = useRef(null);
  const startedAt = useRef(null);
  const submittingRef = useRef(false);

  const vRef = useRef({ tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0, lookingAway: 0, noCamera: false });
  const warnRef = useRef({ faceNotDetected: 0, lookingAway: 0, multipleFaces: 0 });

  // 1. Load Models
  useEffect(() => {
    (async () => {
      try {
        console.log("Loading face-api models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        console.log("Models loaded successfully");
        setModelsReady(true);
      } catch (e) {
        console.warn("face-api models failed to load from CDN:", e);
        setModelsError(true); // Fallback mode
      }
    })();
  }, []);

  // 2. Fetch Problems
  useEffect(() => {
    if (phase !== "loading") return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/proctor/questions/coding/${moduleId}?domain=${domain}&level=${level}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setProblems(data.problems);
          const initialSols = {};
          data.problems.forEach((p, idx) => {
            if (p.type === "html_css") initialSols[idx] = { html: "<!-- Write HTML here -->\n", css: "/* Write CSS here */\n" };
            else initialSols[idx] = "// Write your Javascript solution here\nfunction solution() {\n  \n}";
          });
          setSolutions(initialSols);
          setQuestionsReady(true);
        } else {
          setPhase("error");
        }
      } catch (e) {
        setPhase("error");
      }
    })();
  }, [phase, moduleId, domain, level]);

  // 2.5 Transition to Ready
  useEffect(() => {
    if (questionsReady && (modelsReady || modelsError)) {
      setPhase("ready");
    }
  }, [questionsReady, modelsReady, modelsError]);

  // 3. Camera Request
  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPhase("loading");
    } catch (e) {
      vRef.current.noCamera = true;
      setPhase("loading"); // still proceed to load questions
    }
  };

  // 4. Timer & Detection Loops
  useEffect(() => {
    if (phase !== "taking") return;
    countdownRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);

    const onVisibility = () => {
        if (document.hidden) addViolation("tabSwitches", "Stay on the exam page!", "Tab switch detected.");
    };
    document.addEventListener("visibilitychange", onVisibility);

    detectTimer.current = setInterval(async () => {
        const v = videoRef.current;
        if (!v || v.readyState < 2 || !modelsReady) return;
        try {
            const dets = await faceapi.detectAllFaces(v, new faceapi.TinyFaceDetectorOptions());
            if (dets.length === 0) addViolation("faceNotDetected", "No face detected.", "Face missing.");
            else if (dets.length > 1) addViolation("multipleFaces", "Multiple faces detected.", "Multiple people detected.");
        } catch (e) {
            console.warn("Detection skipped:", e);
        }
    }, DETECT_MS);

    return () => {
      clearInterval(countdownRef.current);
      clearInterval(detectTimer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase]);

  const addViolation = (type, warn, viol) => {
    if (warnRef.current[type] < WARN_BEFORE && type !== "tabSwitches") {
        warnRef.current[type]++;
        setViolationBanner(warn);
    } else {
        vRef.current[type]++;
        const total = Object.values(vRef.current).reduce((a,b) => a + (typeof b === 'number' ? b : 0), 0);
        setViolationCount(total);
        if (total >= MAX_VIOLATIONS) handleSubmit();
        setViolationBanner(viol);
    }
    setTimeout(() => setViolationBanner(null), 3000);
  };

  // 5. Test Runner
  const runTests = () => {
    const p = problems[currentIdx];
    const sol = solutions[currentIdx];
    const results = [];

    if (p.type === "javascript") {
      try {
        const userFunc = new Function(`
          ${sol}
          if (typeof solution === 'function') return solution;
          if (typeof main === 'function') return main;
          throw new Error("No 'solution' function found. Please define 'function solution() { ... }'.");
        `)();
        p.testCases.forEach((tc, i) => {
          try {
            // Ensure input is an array before spreading
            const args = Array.isArray(tc.input) ? tc.input : [tc.input];
            const actual = userFunc(...args);
            // Robust equality check
            const passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
            results.push({ 
                passed, 
                msg: passed ? `Test ${i+1} Passed` : `Test ${i+1} Failed: Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(actual)}` 
            });
          } catch (e) {
            results.push({ passed: false, msg: `Error in Test ${i+1}: ${e.message}` });
          }
        });
      } catch (e) {
        results.push({ passed: false, msg: "Runner Error: " + e.message });
      }
    } else {
      // ACTUAL DOM TESTING
      try {
        const sandbox = document.createElement('div');
        sandbox.style.position = 'absolute';
        sandbox.style.left = '-9999px';
        sandbox.style.visibility = 'hidden';
        document.body.appendChild(sandbox);

        const style = document.createElement('style');
        style.textContent = sol.css;
        sandbox.appendChild(style);

        const content = document.createElement('div');
        content.innerHTML = sol.html;
        sandbox.appendChild(content);

        p.testCases.forEach((tc, i) => {
          const el = sandbox.querySelector(tc.selector);
          if (!el) {
            results.push({ passed: false, msg: `Test ${i+1} Failed: Selector "${tc.selector}" not found.` });
            return;
          }
          
          let actual;
          if (tc.property === 'textContent' || tc.property === 'innerText') {
            actual = el.textContent.trim();
          } else {
            actual = window.getComputedStyle(el).getPropertyValue(tc.property);
          }

          const passed = actual.toLowerCase().includes(String(tc.expected).toLowerCase());
          results.push({ 
            passed, 
            msg: passed ? `Test ${i+1} Passed` : `Test ${i+1} Failed: Expected ${tc.property} to contain "${tc.expected}", but got "${actual}"`
          });
        });

        document.body.removeChild(sandbox);
      } catch (e) {
        results.push({ passed: false, msg: "Style Check Error: " + e.message });
      }
    }
    setTestResults({ ...testResults, [currentIdx]: results });
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");

    const token = localStorage.getItem("token");
    const codingSolutions = problems.map((p, i) => ({
        title: p.title,
        code: typeof solutions[i] === 'string' ? solutions[i] : JSON.stringify(solutions[i]),
        passed: testResults[i]?.every(r => r.passed) || false
    }));

    // Each problem is worth 50 marks. 
    // Score reflects the total marks (0, 50, or 100)
    const score = Math.round((codingSolutions.filter(s => s.passed).length / problems.length) * 100);

    try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/proctor/attempt`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                courseId, moduleId, type: "coding",
                codingSolutions, score, violations: vRef.current,
                startedAt: startedAt.current, endedAt: new Date()
            })
        });

        // If 50% or more (at least one problem passed), mark module fully completed
        if (score >= 50) {
            await fetch(`${import.meta.env.VITE_API_URL}/api/progress/complete-module`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ courseId, moduleId, status: "completed" })
            });
        }

        setResult({ score, passed: true, violations: vRef.current });
        setPhase("submitted");
    } catch (e) {
        console.error(e);
    }
  };

  if (phase === "permission") return (
    <div className="min-h-screen bg-cream/20 flex flex-col items-center justify-center p-6 font-sans">
        <ShieldCheck className="w-16 h-16 text-red mb-6" />
        <h1 className="text-3xl font-bold mb-4">Module Coding Test</h1>
        <p className="text-foreground/60 mb-8 max-w-md text-center">This test is proctored. Ensure you are in a quiet, well-lit place. 2 problems, 30 minutes.</p>
        <button onClick={requestCamera} className="px-10 py-4 bg-red text-white font-bold rounded-2xl shadow-lg hover:scale-105 transition-transform">Enable Camera & Start</button>
    </div>
  );

  if (phase === "loading") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream/20 font-sans">
        <div className="relative mb-8">
            <div className="animate-spin w-20 h-20 border-4 border-red/20 border-t-red rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center text-red font-black text-xs">AI</div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Setting up your challenge...</h2>
        <div className="flex flex-col gap-3 w-64">
            <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${questionsReady ? 'bg-green/10 border-green/20 text-green' : 'bg-white border-cream text-foreground/40'}`}>
                <div className={`w-2 h-2 rounded-full ${questionsReady ? 'bg-green animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm font-bold">Generating Questions</span>
                {questionsReady && <CheckCircle2 size={16} className="ml-auto" />}
            </div>
            <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${modelsReady ? 'bg-green/10 border-green/20 text-green' : modelsError ? 'bg-yellow/10 border-yellow-200 text-yellow-700' : 'bg-white border-cream text-foreground/40'}`}>
                <div className={`w-2 h-2 rounded-full ${modelsReady ? 'bg-green' : modelsError ? 'bg-yellow-500' : 'bg-gray-300 animate-pulse'}`} />
                <span className="text-sm font-bold">{modelsReady ? 'Proctoring Ready' : modelsError ? 'Proctoring Offline' : 'Initializing AI Shield'}</span>
                {modelsReady && <CheckCircle2 size={16} className="ml-auto" />}
                {modelsError && <AlertTriangle size={16} className="ml-auto" />}
            </div>
        </div>
    </div>
  );

  if (phase === "error") return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Assessment</h2>
        <p className="text-foreground/50 mb-8">We couldn't generate your coding problems. Please try again.</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red text-white font-bold rounded-xl shadow-md">Retry</button>
    </div>
  );

  if (phase === "ready") return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-soft border border-cream text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Code?</h2>
            <div className="bg-cream/30 p-4 rounded-2xl mb-6 text-sm">
                <p>Problems: {problems.length}</p>
                <p>Time: 30 minutes</p>
            </div>
            <button onClick={() => { startedAt.current = new Date(); setPhase("taking"); }} className="w-full py-4 bg-red text-white font-bold rounded-2xl shadow-md">Begin Assessment</button>
        </div>
    </div>
  );

  if (phase === "submitted") return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full bg-white p-12 rounded-[3rem] shadow-soft text-center">
            <div className="w-20 h-20 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Assessment Completed</h1>
            <p className="text-foreground/50 text-lg mb-8 tracking-wide">Your coding solutions have been submitted for review.</p>
            <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-cream/20 p-6 rounded-3xl">
                    <p className="text-3xl font-black text-red">{result.score}%</p>
                    <p className="text-xs font-bold text-foreground/40 uppercase">Score</p>
                </div>
                <div className="bg-cream/20 p-6 rounded-3xl">
                    <p className="text-3xl font-black text-foreground">{Object.values(result.violations).reduce((a,b)=>a+(typeof b==='number'?b:0),0)}</p>
                    <p className="text-xs font-bold text-foreground/40 uppercase">Violations</p>
                </div>
            </div>
            <button onClick={() => navigate(`/courses/${domain}/${level}`)} className="w-full py-5 bg-red text-white font-bold rounded-2xl text-xl shadow-lg hover:-translate-y-1 transition-all">Back to Course</button>
        </div>
    </div>
  );

  const prob = problems[currentIdx];
  if (!prob) return null;

  return (
    <div className="h-[calc(100vh-6rem)] flex mt-4 font-sans bg-cream/10 overflow-hidden">
      {/* Sidebar: Problem */}
      <div className="w-[30%] bg-white border-r border-cream overflow-y-auto p-10 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-red/10 text-red text-xs font-black uppercase rounded-lg border border-red/20">Problem {currentIdx + 1}</span>
              <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg ${prob.difficulty === 'easy' ? 'bg-green/10 text-green' : 'bg-yellow/10 text-yellow'}`}>{prob.difficulty}</span>
          </div>
          <h2 className="text-3xl font-bold mb-6 text-foreground">{prob.title}</h2>
          <p className="text-foreground/70 leading-relaxed mb-8 font-medium whitespace-pre-wrap">{prob.description}</p>
          
          <div className="space-y-6 mt-auto">
              <div className="p-5 bg-cream/30 rounded-2xl border border-cream">
                  <h4 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-2 flex items-center gap-2"><Play className="w-3 h-3" /> Sample Input</h4>
                  <pre className="text-sm font-mono bg-white p-3 rounded-lg">{prob.sampleInput}</pre>
              </div>
              <div className="p-5 bg-cream/30 rounded-2xl border border-cream">
                  <h4 className="text-xs font-black text-foreground/40 uppercase tracking-widest mb-2 flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Sample Output</h4>
                  <pre className="text-sm font-mono bg-white p-3 rounded-lg">{prob.sampleOutput}</pre>
              </div>
          </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col relative">
          {/* Header */}
          <div className="h-16 bg-white border-b border-cream px-8 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentIdx(Math.max(0, currentIdx-1))} className="p-2 hover:bg-cream rounded-full transition-colors"><ChevronLeft /></button>
                <button onClick={() => setCurrentIdx(Math.min(problems.length-1, currentIdx+1))} className="p-2 hover:bg-cream rounded-full transition-colors"><ChevronRight /></button>
              </div>
              <div className="flex items-center gap-4">
                  <span className="font-bold tabular-nums flex items-center gap-2 px-3 py-1 bg-foreground/5 rounded-lg"><Clock size={16} /> {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
                  <button onClick={runTests} className="px-6 py-2 bg-yellow text-foreground font-bold rounded-xl shadow-sm flex items-center gap-2 hover:bg-yellow/90"><Play size={16} /> Run Tests</button>
                  <button onClick={handleSubmit} className="px-6 py-2 bg-red text-white font-bold rounded-xl shadow-sm hover:bg-red/90">Submit All</button>
              </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-8 bg-[#1e1e1e] relative">
                  <textarea
                    className="w-full h-full bg-transparent text-gray-300 font-mono text-lg resize-none outline-none"
                    spellCheck={false}
                    value={prob.type === 'html_css' ? solutions[currentIdx].html : solutions[currentIdx]}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (prob.type === 'html_css') setSolutions({...solutions, [currentIdx]: {...solutions[currentIdx], html: val}});
                        else setSolutions({...solutions, [currentIdx]: val});
                    }}
                  />
                  {/* Floating Violation Alert */}
                  {violationBanner && <div className="absolute top-10 left-10 right-10 bg-red text-white p-4 rounded-xl font-bold shadow-2xl flex items-center gap-3 animate-bounce"><AlertTriangle /> {violationBanner}</div>}
              </div>

              {/* Console/Preview */}
              <div className="w-[35%] bg-white border-l border-cream flex flex-col">
                  <div className="h-10 bg-cream/50 border-b border-cream flex items-center px-4 shrink-0">
                      <span className="text-[10px] font-black uppercase text-foreground/40 tracking-widest">{prob.type === 'html_css' ? "Live Preview" : "Test Runner Output"}</span>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                      {prob.type === 'html_css' ? (
                          <iframe
                            className="w-full h-full border rounded-lg bg-white"
                            srcDoc={`<html><style>${solutions[currentIdx].css}</style><body>${solutions[currentIdx].html}</body></html>`}
                          />
                      ) : (
                          <div className="space-y-3">
                              {testResults[currentIdx]?.map((r, i) => (
                                  <div key={i} className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 ${r.passed ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>
                                      {r.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                      {r.msg}
                                  </div>
                              ))}
                              {!testResults[currentIdx] && <p className="text-foreground/30 text-center mt-20 font-bold italic">Click "Run Tests" to see results</p>}
                          </div>
                      )}
                  </div>
                  {/* Minified Camera */}
                  <div className="absolute bottom-10 right-10 w-48 aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-soft pointer-events-none opacity-80">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  </div>
              </div>
          </div>

          {/* HTML/CSS extra editor */}
          {prob.type === 'html_css' && (
              <div className="h-48 bg-[#252525] border-t border-black/20 p-6">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">css content</h4>
                 <textarea
                    className="w-full h-24 bg-transparent text-gray-400 font-mono text-sm resize-none outline-none"
                    spellCheck={false}
                    value={solutions[currentIdx].css}
                    onChange={(e) => setSolutions({...solutions, [currentIdx]: {...solutions[currentIdx], css: e.target.value}})}
                 />
              </div>
          )}
      </div>
    </div>
  );
}
