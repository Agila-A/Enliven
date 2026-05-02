import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Bot, BookOpen, ChevronDown, ChevronUp,
  AlertCircle, Sparkles, BarChart2, ChevronRight,
  BookText, HelpCircle, LayoutGrid, Code, ListOrdered
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import hljs from "highlight.js";
import 'highlight.js/styles/github-dark.css';

import FlashcardCarousel from "../studybuddy/FlashcardCarousel";
import MiniQuiz from "../studybuddy/MiniQuiz";

mermaid.initialize({ startOnLoad: false, theme: "neutral" });

export default function StudyBuddyChat() {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [context,     setContext]     = useState(null);
  const [showCtx,     setShowCtx]     = useState(false);
  const [error,       setError]       = useState("");
  const [courseId,    setCourseId]    = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [showPicker,  setShowPicker]  = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const inputRef    = useRef(null);
  const autoPromptSent = useRef(false);

  const params = new URLSearchParams(window.location.search);
  const promptParam = params.get("prompt");
  const urlModuleTitle = params.get("moduleTitle");
  const urlDomain = params.get("domain");
  const urlLevel = params.get("level");
  const urlModuleId = params.get("module");

  /* ── Resolve courseId then load history + context ── */
  useEffect(() => {
    async function init() {
      const token   = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // 1. Sync enrolled courses first
        const syncRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context/sync-courses`, {
          method: "POST",
          headers
        });
        const syncData = await syncRes.json();
        const list = syncData.enrolledCourses || [];
        setEnrollments(list);

        let activeCourseId = localStorage.getItem("activeCourseId");

        if (!activeCourseId && list.length > 0) {
          activeCourseId = list[0].courseId;
          localStorage.setItem("activeCourseId", activeCourseId);
        }

        if (!activeCourseId) {
          setFetching(false);
          return;
        }

        setCourseId(activeCourseId);
        await loadCourse(activeCourseId, token);

      } catch (err) {
        console.error("StudyBuddy init:", err);
        setError("Couldn't load your chat history.");
        setFetching(false);
      }
    }
    init();
  }, []);

  async function loadCourse(cid, token) {
    const headers = { Authorization: `Bearer ${token}` };
    const [histRes, ctxRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/history?courseId=${encodeURIComponent(cid)}`, { headers }),
      fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context?courseId=${encodeURIComponent(cid)}`,  { headers }),
    ]);
    const [hist, ctx] = await Promise.all([histRes.json(), ctxRes.json()]);

    if (hist.success) setMessages(hist.messages || []);

    let mergedCtx = {};
    if (ctx.success && ctx.context) {
      mergedCtx = { ...ctx.context, ...(ctx.context.context || {}) };
    }

    // Silent context update if opened from a module
    if (urlModuleTitle && urlDomain && urlLevel && urlModuleId) {
       try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              courseId: cid,
              event: "study_started",
              domain: urlDomain,
              skillLevel: urlLevel,
              currentModule: urlModuleId,
              currentModuleTitle: urlModuleTitle
            })
          });
          
          const ctxRes2 = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context?courseId=${encodeURIComponent(cid)}`, { headers });
          const ctx2 = await ctxRes2.json();
          if (ctx2.success && ctx2.context) {
            mergedCtx = { ...ctx2.context, ...(ctx2.context.context || {}) };
          }
       } catch (err) {
          console.error("Failed to seed roadmap context:", err);
       }
    }

    setContext(mergedCtx);
    setFetching(false);
    setInitialLoadDone(true);
  }

  /* ── Switch course from the picker ── */
  const switchCourse = async (newCourseId) => {
    if (newCourseId === courseId) { setShowPicker(false); return; }
    setFetching(true);
    setMessages([]);
    setContext(null);
    setError("");
    setCourseId(newCourseId);
    localStorage.setItem("activeCourseId", newCourseId);
    const token = localStorage.getItem("token");
    try {
      await loadCourse(newCourseId, token);
    } catch (err) {
      setError("Failed to load course context.");
    } finally {
      setFetching(false);
      setShowPicker(false);
    }
  };

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  /* ── Render Mermaid Diagrams ── */
  useEffect(() => {
    const renderMermaid = async () => {
      try {
        await mermaid.run({
          nodes: document.querySelectorAll('.mermaid'),
        });
      } catch (err) {
        // Suppress mermaid errors on incomplete strings
      }
    };
    if (messages.length > 0) {
      setTimeout(renderMermaid, 50);
    }
  }, [messages]);

  /* ── Syntax Highlighting ── */
  useEffect(() => {
    document.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el);
    });
  }, [messages]);

  /* ── Auto-prompt from URL ── */
  useEffect(() => {
    if (promptParam && !initialLoadDone) return; // wait for load
    if (promptParam && initialLoadDone && !autoPromptSent.current) {
      autoPromptSent.current = true;
      sendMessage(promptParam);
    }
  }, [initialLoadDone, promptParam]); // Removed sendMessage dependency to avoid re-runs when loading state changes

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading || !courseId) return;

    setError("");
    setInput("");
    
    setMessages((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.sender === "user" && last.text === trimmed) return prev;
      }
      return [...prev, { sender: "user", text: trimmed }];
    });
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/message`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: trimmed, courseId }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "No reply");
      
      setMessages((prev) => [...prev, { sender: "assistant", text: data.reply, intent: data.intent }]);

      if (data.contextUpdated) {
        const ctxRes  = await fetch(
          `${import.meta.env.VITE_API_URL}/api/chatbot/context?courseId=${encodeURIComponent(courseId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ctxData = await ctxRes.json();
        if (ctxData.success) {
          setContext((prev) => {
            const fresh = { ...(ctxData.context || {}), ...((ctxData.context || {}).context || {}) };
            return { ...prev, ...fresh };
          });
        }
      }
    } catch (err) {
      console.error("sendMessage:", err);
      setError("Failed to get a response. Please try again.");
      setInput(trimmed);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, courseId]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── Message Rendering Logic ── */
  const renderMessageContent = (msg) => {
    if (!msg || !msg.text) return <p className="text-muted-foreground italic text-sm">Empty message</p>;

    if (msg.sender === "user") {
      return <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>;
    }

    // Try to parse JSON for assistant messages
    let parsed = null;
    let intent = msg.intent;

    try {
      const textToParse = msg.text.trim();
      if (textToParse.startsWith("{")) {
        parsed = JSON.parse(textToParse);
        if (parsed.type) intent = parsed.type;
      }
    } catch (e) {
      console.warn("Chatbot JSON parse failed:", e);
    }

    if (parsed) {
      if (intent === "flashcards" && parsed.cards) {
        return <FlashcardCarousel cards={parsed.cards} />;
      }
      
      if (intent === "diagram" && parsed.mermaid) {
        return (
          <div className="w-full flex flex-col items-center bg-[var(--card)] p-4 rounded-xl shadow-sm border border-[var(--enliven-cream)] overflow-hidden">
             {parsed.title && <h4 className="font-bold mb-4 text-[var(--foreground)]">{parsed.title}</h4>}
             <div className="mermaid w-full text-center overflow-x-auto bg-white rounded-xl p-4">{parsed.mermaid}</div>
          </div>
        );
      }

      if (intent === "quiz" && parsed.questions) {
        return <MiniQuiz questions={parsed.questions} />;
      }

      if (intent === "steps" && parsed.steps) {
        return (
          <div className="w-full text-[var(--foreground)]">
            {parsed.title && <h3 className="font-bold text-lg mb-4 text-red">{parsed.title}</h3>}
            <div className="space-y-4">
              {parsed.steps.map((step, i) => (
                <details key={i} className="group bg-[var(--card)] border-2 border-[var(--enliven-cream)] rounded-xl open:border-red transition-all">
                  <summary className="flex items-center gap-3 p-4 cursor-pointer font-bold select-none list-none [&::-webkit-details-marker]:hidden">
                     <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--enliven-cream)] text-red flex items-center justify-center text-sm">{step.number}</span>
                     <span>{step.title}</span>
                     <ChevronDown className="w-4 h-4 ml-auto transition-transform group-open:rotate-180 text-[var(--muted-foreground)]" />
                  </summary>
                  <div className="px-4 pb-4 pt-1 text-[var(--foreground)] font-medium pl-[52px]">
                    {step.content}
                  </div>
                </details>
              ))}
            </div>
          </div>
        );
      }

      if (intent === "example" || intent === "analogy") {
        return (
          <div className="w-full text-[var(--foreground)] space-y-3">
             <p className="font-medium text-[var(--muted-foreground)]">{parsed.explanation}</p>
             {parsed.code ? (
               <div className="relative group rounded-xl overflow-hidden shadow-sm">
                 <div className="bg-gray-800 text-gray-400 text-xs px-4 py-1 uppercase tracking-widest font-bold flex justify-between">
                   <span>{parsed.language || "Code"}</span>
                 </div>
                 <pre className="!m-0 !p-4 !bg-gray-900 text-sm overflow-x-auto"><code className={`language-${parsed.language || 'javascript'}`}>{String(parsed.code || "")}</code></pre>
               </div>
             ) : parsed.analogy ? (
               <blockquote className="border-l-4 border-red pl-4 italic text-[var(--foreground)] opacity-90 bg-[var(--card)] py-2 pr-2 rounded-r-lg">
                 "{String(parsed.analogy || "")}"
               </blockquote>
             ) : null}
          </div>
        );
      }
    }

    // Fallback or "chat" / "explain" intent
    return (
      <div className="sb-markdown font-medium leading-relaxed">
         <ReactMarkdown>{String(msg.text || "")}</ReactMarkdown>
      </div>
    );
  };

  /* ── Quick Action Prompts ── */
  const getQuickActions = () => {
    const topic = urlModuleTitle ? urlModuleTitle : "this concept";
    return [
      { icon: <BookText className="w-4 h-4"/>, label: "Explain", prompt: `Explain ${topic} to me` },
      { icon: <LayoutGrid className="w-4 h-4"/>, label: "Flashcards", prompt: `Give me flashcards for ${topic}` },
      { icon: <Bot className="w-4 h-4"/>, label: "Diagram", prompt: `Show me a diagram for ${topic}` },
      { icon: <HelpCircle className="w-4 h-4"/>, label: "Quiz me", prompt: `Quiz me on ${topic}` },
      { icon: <Code className="w-4 h-4"/>, label: "Example", prompt: `Give me a code example for ${topic}` },
      { icon: <ListOrdered className="w-4 h-4"/>, label: "Step by step", prompt: `Walk me through ${topic} step by step` },
    ];
  };

  const formatCourseId = (id = "") => {
    return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const lastA    = context?.lastAssessment;
  const avgScore = context?.assessmentHistory?.length
    ? Math.round(context.assessmentHistory.reduce((s, a) => s + a.score, 0) / context.assessmentHistory.length)
    : null;

  /* ════════════════════════════════════════════════════════ RENDER */
  return (
    <>
      <style>{`
        .sb-markdown p { margin-bottom: 1rem; }
        .sb-markdown p:last-child { margin-bottom: 0; }
        .sb-markdown ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .sb-markdown ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .sb-markdown li { margin-bottom: 0.25rem; }
        .sb-markdown code { background: rgba(0,0,0,0.05); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875em; }
        .sb-markdown pre code { background: transparent; padding: 0; }
        .sb-markdown pre { background: rgba(0,0,0,0.8); color: white; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
        .sb-markdown h1, .sb-markdown h2, .sb-markdown h3 { font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .sb-markdown h1 { font-size: 1.5rem; }
        .sb-markdown h2 { font-size: 1.25rem; }
        .sb-markdown h3 { font-size: 1.125rem; }
        .sb-markdown strong { font-weight: bold; }
        .sb-markdown em { font-style: italic; }
        
        .custom-scrollbar::-webkit-scrollbar { width:6px; height:6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.1); border-radius:10px; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto font-sans tracking-wide py-4 px-2 sm:px-6">
        <div className="bg-[var(--card)] border-2 border-[var(--enliven-cream)] rounded-[2rem] flex flex-col h-full shadow-sm overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-[var(--card)] border-b-2 border-[var(--enliven-cream)] px-6 py-5 flex items-center justify-between shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--enliven-cream)] text-red shadow-inner">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-[var(--foreground)] text-lg leading-tight tracking-tight mt-1">Study Buddy</p>
                {/* Course switcher pill */}
                {enrollments.length > 1 ? (
                   <button
                     onClick={() => setShowPicker((v) => !v)}
                     className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mt-1 hover:text-red transition-colors"
                   >
                     <BookOpen className="w-3 h-3" />
                     {courseId ? formatCourseId(courseId) : "No course selected"}
                     <ChevronRight className={`w-3 h-3 transition-transform ${showPicker ? "rotate-90" : ""}`} />
                   </button>
                ) : (
                   <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mt-1">
                     <BookOpen className="w-3 h-3" />
                     {courseId ? formatCourseId(courseId) : "No course selected"}
                   </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowCtx((s) => !s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showCtx ? "bg-[var(--enliven-cream)] text-[var(--foreground)]" : "border-2 border-[var(--enliven-cream)] text-[var(--muted-foreground)] hover:bg-[var(--enliven-cream)] hover:text-[var(--foreground)]"}`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">My Context</span>
              {showCtx ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
          </div>

          {/* ── Course Picker Dropdown ── */}
          {showPicker && enrollments.length > 1 && (
            <div className="bg-[var(--card)] border-b-2 border-[var(--enliven-cream)] px-6 py-4 shrink-0 z-20">
              <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Switch Course</p>
              <div className="flex flex-wrap gap-2">
                {enrollments.map((e) => (
                  <button
                    key={e.courseId}
                    onClick={() => switchCourse(e.courseId)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      e.courseId === courseId
                        ? "bg-red text-white border-red"
                        : "bg-[var(--card)] text-[var(--foreground)] border-[var(--enliven-cream)] hover:border-red hover:text-red"
                    }`}
                  >
                    {formatCourseId(e.courseId)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Context Panel ── */}
          <div className={`bg-[var(--enliven-cream)] border-[var(--enliven-cream)] transition-all duration-300 overflow-hidden shrink-0 ${showCtx ? "border-b-2 max-h-96 opacity-100 py-6 px-6" : "max-h-0 opacity-0 py-0 px-6 border-b-0"}`}>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-4">
              What Study Buddy knows about you
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Course",     value: courseId ? formatCourseId(courseId) : "—" },
                { label: "Domain",     value: context?.domain     || "—" },
                { label: "Level",      value: context?.skillLevel || "—" },
                { label: "Module",     value: context?.currentModuleTitle || (context?.currentModule != null ? `Module ${context.currentModule}` : "—") },
                { label: "Last Lesson",value: context?.lastLessonTitle || "None yet" },
                { label: "Last Event", value: context?.lastEvent || "—" },
                { label: "Completed",
                  value: Array.isArray(context?.completedModules) && context.completedModules.length
                    ? `Modules ${context.completedModules.join(", ")}`
                    : "None yet" },
                ...(lastA ? [{ label: "Last Test", value: `${lastA.score}% (${lastA.passed ? "✓ Passed" : "✗ Failed"})`, warn: lastA.flagged }] : []),
                ...(avgScore != null ? [{ label: "Avg Score", value: `${avgScore}% over ${context.assessmentHistory.length} tests` }] : []),
              ].map(({ label, value, warn }) => (
                <div key={label} className={`rounded-2xl px-4 py-3 border-2 min-w-[120px] bg-[var(--card)] shadow-xs ${warn ? "border-red" : "border-[var(--enliven-cream)]"}`}>
                  <p className="text-[var(--muted-foreground)] mb-1 uppercase text-[10px] font-bold tracking-widest">{label}</p>
                  <p className={`font-bold text-sm ${warn ? "text-red" : "text-[var(--foreground)]"}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 space-y-6 relative bg-[var(--enliven-cream)]/30">

            {fetching ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--muted-foreground)]">
                <div className="w-10 h-10 border-4 border-[var(--enliven-cream)] border-t-red rounded-full animate-spin" />
                <p className="font-bold">Syncing AI context…</p>
              </div>

            ) : !courseId ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-[var(--card)] shadow-soft border-4 border-[var(--enliven-cream)] text-red transform -rotate-6">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-black text-[var(--foreground)] text-2xl tracking-tight">No course yet!</h3>
                  <p className="text-[var(--foreground)]/70 font-medium text-base mt-3 leading-relaxed">
                    Enroll in a course first, then come back to chat with Study Buddy about it.
                  </p>
                </div>
              </div>

            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-[var(--card)] shadow-soft border-4 border-[var(--enliven-cream)] text-red transform -rotate-6">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-black text-[var(--foreground)] text-2xl tracking-tight">Hey, I'm Study Buddy!</h3>
                  <p className="text-[var(--foreground)]/70 font-medium text-base mt-3 leading-relaxed">
                    I know your course, skill level, and how your tests went. Ask me anything to get personalized help.
                  </p>
                </div>
              </div>

            ) : (
              messages.map((msg, i) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={i} className={`flex gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-red text-white shadow-inner">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}
                    <div className={`max-w-[90%] md:max-w-[80%] rounded-[1.5rem] px-6 py-4 shadow-sm relative overflow-hidden ${
                      isUser
                        ? "bg-red text-white rounded-br-md border border-red"
                        : "bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--enliven-cream)] rounded-bl-md"
                    }`}>
                      {renderMessageContent(msg)}
                      {msg.timestamp && (
                        <p className={`text-[10px] uppercase font-bold tracking-wider mt-3 ${isUser ? "text-white/60" : "text-[var(--muted-foreground)]"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    {isUser && (
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-[var(--enliven-cream)] text-[var(--foreground)] border border-[var(--enliven-cream)] shadow-inner text-sm font-black">
                        ME
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-4 justify-start w-full">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-red text-white shadow-inner">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-[var(--card)] border-2 border-[var(--enliven-cream)] text-[var(--foreground)] rounded-[1.5rem] rounded-bl-md px-6 py-5 flex gap-2 items-center shadow-sm">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full bg-red animate-bounce"
                      style={{ animationDelay: `${delay}s`, animationDuration: "1s" }} />
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center justify-center mx-auto max-w-md w-full mt-2">
                <div className="flex items-center gap-3 text-sm px-6 py-4 rounded-2xl bg-[var(--enliven-cream)] text-red font-bold border border-red shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-4" />
          </div>

          {urlModuleTitle && (
            <div className="bg-red/10 border-t-2 border-red/20 px-6 py-2 shrink-0 flex items-center justify-center z-10">
              <p className="text-[10px] font-bold text-red uppercase tracking-widest">
                Currently studying: {urlModuleTitle} · {urlDomain} ({urlLevel})
              </p>
            </div>
          )}

          {/* ── Quick Action Bar ── */}
          {courseId && (
            <div className="shrink-0 bg-[var(--card)] border-t-2 border-[var(--enliven-cream)] px-2 sm:px-6 py-3 flex gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap z-10">
               {getQuickActions().map((action, idx) => (
                 <button
                   key={idx}
                   onClick={() => sendMessage(action.prompt)}
                   disabled={loading}
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--enliven-cream)] hover:border-red hover:text-red transition-all disabled:opacity-50 shadow-sm"
                 >
                   {action.icon}
                   {action.label}
                 </button>
               ))}
            </div>
          )}

          {/* ── Input bar ── */}
          <div className="shrink-0 bg-[var(--card)] border-t-2 border-[var(--enliven-cream)] px-6 py-5 z-10 relative">
            <div className="flex gap-4 items-end mx-auto">
              <div className="flex-1 bg-[var(--enliven-cream)] border-2 border-[var(--enliven-cream)] rounded-[1.5rem] flex items-end overflow-hidden focus-within:border-red focus-within:bg-[var(--card)] transition-all shadow-inner relative">
                <textarea
                  ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={courseId ? "Ask Study Buddy anything..." : "Select a course first..."}
                  rows={1}
                  disabled={loading || !courseId}
                  className="flex-1 bg-transparent px-5 py-4 text-base font-medium text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none outline-none custom-scrollbar"
                  style={{ maxHeight: 150 }}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || !courseId}
                className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  input.trim() && !loading && courseId
                    ? "bg-red text-white shadow-md hover:shadow-lg hover:opacity-90 transform hover:-translate-y-0.5 cursor-pointer"
                    : "bg-[var(--enliven-cream)] text-[var(--muted-foreground)] cursor-not-allowed border-2 border-[var(--enliven-cream)]"
                }`}
              >
                <Send className="w-6 h-6 mr-1 mt-1" />
              </button>
            </div>
            <p className="text-[10px] text-center font-bold uppercase tracking-widest text-[var(--muted-foreground)] mt-3 hidden sm:block">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
