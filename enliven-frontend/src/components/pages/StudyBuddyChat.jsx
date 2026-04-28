// pages/StudyBuddyChat.jsx
// Per-course Study Buddy: loads context and history keyed by courseId.
// courseId is read from localStorage("activeCourseId"), falling back to
// the first enrollment fetched from the API.
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Bot, BookOpen, ChevronDown, ChevronUp,
  AlertCircle, Sparkles, BarChart2, ChevronRight,
} from "lucide-react";

/* ── Lightweight markdown renderer ── */
function renderMd(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, '<pre class="sb-code">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="sb-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<p class="sb-h3">$1</p>')
    .replace(/^## (.+)$/gm,  '<p class="sb-h2">$1</p>')
    .replace(/^- (.+)$/gm,   '<li class="sb-li">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="sb-ul">$&</ul>')
    .replace(/\n\n+/g, "<br/><br/>")
    .replace(/\n/g,    "<br/>");
}

const QUICK_PROMPTS = [
  "What should I study next?",
  "How did I do on my last test?",
  "Explain my current topic simply",
  "Give me a study tip for today",
];

function formatCourseId(id = "") {
  return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

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

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const inputRef    = useRef(null);

  /* ── Resolve courseId then load history + context ── */
  useEffect(() => {
    async function init() {
      const token   = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        let activeCourseId = localStorage.getItem("activeCourseId");

        if (!activeCourseId) {
          const enrollRes  = await fetch(`${import.meta.env.VITE_API_URL}/api/user/enrollments`, { headers });
          const enrollData = await enrollRes.json();
          const list       = enrollData.enrollments || [];
          setEnrollments(list);

          if (list.length === 0) {
            setFetching(false);
            return;
          }
          activeCourseId = list[0].courseId;
          localStorage.setItem("activeCourseId", activeCourseId);
        } else {
          fetch(`${import.meta.env.VITE_API_URL}/api/user/enrollments`, { headers })
            .then((r) => r.json())
            .then((d) => setEnrollments(d.enrollments || []))
            .catch(() => {});
        }

        setCourseId(activeCourseId);
        await loadCourse(activeCourseId, token);
      } catch (err) {
        console.error("StudyBuddy init:", err);
        setError("Couldn't load your chat history.");
      } finally {
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

    // Problem 4 (Fix): Seed context if moduleTitle is missing on mount
    // so new users immediately have their first module populated
    if (!mergedCtx.moduleTitle) {
      try {
        const rmRes = await fetch(`${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap?courseId=${encodeURIComponent(cid)}`, { headers });
        const rmData = await rmRes.json();
        if (rmData.success && rmData.roadmap) {
          const rDomain = rmData.roadmap.domain;
          const rLevel = rmData.roadmap.skillLevel;
          const firstTopic = rmData.roadmap.topics?.[0];
          const moduleTitle = firstTopic ? firstTopic.title : null;
          const totalModules = rmData.roadmap.topics ? rmData.roadmap.topics.length : 0;
          
          await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              courseId: cid,
              event: "study_buddy_opened",
              domain: rDomain,
              skillLevel: rLevel,
              currentModule: "1",
              moduleTitle: moduleTitle,
              totalModules: totalModules
            })
          });
          
          const ctxRes2 = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context?courseId=${encodeURIComponent(cid)}`, { headers });
          const ctx2 = await ctxRes2.json();
          if (ctx2.success && ctx2.context) {
            mergedCtx = { ...ctx2.context, ...(ctx2.context.context || {}) };
          }
        }
      } catch (err) {
        console.error("Failed to seed roadmap context:", err);
      }
    }

    setContext(mergedCtx);
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

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading || !courseId) return;

    // Problem 8: clear error FIRST
    setError("");
    setInput("");
    
    setMessages((prev) => {
      // Problem 8: Prevent duplicate user message on retry
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
      
      setMessages((prev) => [...prev, { sender: "assistant", text: data.reply }]);

      // Problem 10: Refresh context ONLY if contextUpdated is true
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
      setMessages((prev) => prev.slice(0, -1)); // Remove the optimistic user message so they can re-click send
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, courseId]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── Context panel helpers ── */
  const lastA    = context?.lastAssessment;
  const avgScore = context?.assessmentHistory?.length
    ? Math.round(context.assessmentHistory.reduce((s, a) => s + a.score, 0) / context.assessmentHistory.length)
    : null;

  /* ════════════════════════════════════════════════════════ RENDER */
  return (
    <>
      <style>{`
        .sb-code { display:block; background:rgba(242,231,203,0.4); color:var(--foreground); border-radius:12px; padding:12px 16px; font-size:13px; line-height:1.6; overflow-x:auto; margin:12px 0; font-family:'JetBrains Mono','Fira Code',monospace; white-space:pre; border:1px solid rgba(242,231,203,0.8); }
        .sb-inline-code { background:rgba(242,231,203,0.6); color:var(--enliven-mauve); border-radius:6px; padding:2px 6px; font-size:13px; font-family:monospace; font-weight:500; }
        .sb-h2 { font-size:16px; font-weight:800; margin:12px 0 4px; color:inherit; }
        .sb-h3 { font-size:14px; font-weight:700; margin:10px 0 4px; color:inherit; }
        .sb-ul { padding-left:20px; margin:8px 0; list-style-type:disc; }
        .sb-li { margin:4px 0; font-size:14px; line-height:1.6; }
        .custom-scrollbar::-webkit-scrollbar { width:6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.1); border-radius:10px; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto font-sans tracking-wide py-4 px-2 sm:px-6">
        <div className="bg-[var(--card)] border-2 border-[var(--enliven-cream)] rounded-[2rem] flex flex-col h-full shadow-sm overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-[var(--card)] border-b-2 border-[var(--enliven-cream)] px-6 py-5 flex items-center justify-between shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--enliven-cream)] text-[var(--enliven-purple)] shadow-inner">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-[var(--foreground)] text-lg leading-tight tracking-tight mt-1">Study Buddy</p>
                {/* Course switcher pill */}
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mt-1 hover:text-[var(--enliven-purple)] transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  {courseId ? formatCourseId(courseId) : "No course selected"}
                  <ChevronRight className={`w-3 h-3 transition-transform ${showPicker ? "rotate-90" : ""}`} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowCtx((s) => !s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showCtx ? "bg-[var(--enliven-cream)] text-[var(--foreground)]" : "border-2 border-[var(--enliven-cream)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"}`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">My Context</span>
              {showCtx ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
          </div>

          {/* ── Course Picker Dropdown ── */}
          {showPicker && (
            <div className="bg-[var(--card)] border-b-2 border-[var(--enliven-cream)] px-6 py-4 shrink-0">
              <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Switch Course</p>
              <div className="flex flex-wrap gap-2">
                {enrollments.map((e) => (
                  <button
                    key={e.courseId}
                    onClick={() => switchCourse(e.courseId)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      e.courseId === courseId
                        ? "bg-[var(--enliven-purple)] text-white border-[var(--enliven-purple)]"
                        : "bg-[var(--card)] text-[var(--foreground)] border-[var(--enliven-cream)] hover:border-[var(--enliven-purple)] hover:text-[var(--enliven-purple)]"
                    }`}
                  >
                    {formatCourseId(e.courseId)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Context Panel ── */}
          <div className={`bg-[var(--secondary)] border-[var(--enliven-cream)] transition-all duration-300 overflow-hidden shrink-0 ${showCtx ? "border-b-2 max-h-96 opacity-100 py-6 px-6" : "max-h-0 opacity-0 py-0 px-6 border-b-0"}`}>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-4">
              What Study Buddy knows about you
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Course",     value: courseId ? formatCourseId(courseId) : "—" },
                { label: "Domain",     value: context?.domain     || "—" },
                { label: "Level",      value: context?.skillLevel || "—" },
                { label: "Module",     value: context?.moduleTitle || (context?.currentModule != null ? `Module ${context.currentModule}` : "—") },
                { label: "Last Lesson",value: context?.lastLessonTitle || "None yet" }, // Problem 7
                { label: "Last Event", value: context?.lastEvent || "—" }, // Problem 7 Debug Pill
                { label: "Completed",
                  value: Array.isArray(context?.completedModules) && context.completedModules.length
                    ? `Modules ${context.completedModules.join(", ")}`
                    : "None yet" },
                ...(lastA ? [{ label: "Last Test", value: `${lastA.score}% (${lastA.passed ? "✓ Passed" : "✗ Failed"})`, warn: lastA.flagged }] : []),
                ...(avgScore != null ? [{ label: "Avg Score", value: `${avgScore}% over ${context.assessmentHistory.length} tests` }] : []),
              ].map(({ label, value, warn }) => (
                <div key={label} className={`rounded-2xl px-4 py-3 border-2 min-w-[120px] bg-[var(--card)] shadow-xs ${warn ? "border-[var(--enliven-purple)]" : "border-[var(--enliven-cream)]"}`}>
                  <p className="text-[var(--muted-foreground)] mb-1 uppercase text-[10px] font-bold tracking-widest">{label}</p>
                  <p className={`font-bold text-sm ${warn ? "text-[var(--enliven-purple)]" : "text-[var(--foreground)]"}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 space-y-6 relative bg-[var(--secondary)]">

            {fetching ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--muted-foreground)]">
                <div className="w-10 h-10 border-4 border-[var(--enliven-cream)] border-t-[var(--enliven-purple)] rounded-full animate-spin" />
                <p className="font-bold">Syncing AI context…</p>
              </div>

            ) : !courseId ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-[var(--card)] shadow-soft border-4 border-[var(--enliven-cream)] text-[var(--enliven-mauve)] transform -rotate-6">
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
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-[var(--card)] shadow-soft border-4 border-[var(--enliven-cream)] text-[var(--enliven-mauve)] transform -rotate-6">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-black text-[var(--foreground)] text-2xl tracking-tight">Hey, I'm Study Buddy!</h3>
                  <p className="text-[var(--foreground)]/70 font-medium text-base mt-3 leading-relaxed">
                    I know your course, skill level, and how your tests went. Ask me anything to get personalized help.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(p)}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-[var(--enliven-cream)] bg-[var(--card)] text-[var(--foreground)]/70 hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-all transform hover:-translate-y-0.5 shadow-sm"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

            ) : (
              messages.map((msg, i) => {
                const isUser = msg.sender === "user";
                return (
                  <div key={i} className={`flex gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-[var(--enliven-purple)] text-white shadow-inner">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-[1.5rem] px-6 py-4 shadow-sm relative ${
                      isUser
                        ? "bg-[var(--enliven-purple)] text-white rounded-br-md border border-[var(--enliven-purple)]"
                        : "bg-[var(--card)] text-[var(--foreground)] border-2 border-[var(--enliven-cream)] rounded-bl-md"
                    }`}>
                      {isUser
                        ? <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                        : <div className="leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }} />
                      }
                      {msg.timestamp && (
                        <p className={`text-[10px] uppercase font-bold tracking-wider mt-3 ${isUser ? "text-white/60" : "text-[var(--muted-foreground)]"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    {isUser && (
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--enliven-cream)] shadow-inner text-sm font-black">
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
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-[var(--enliven-purple)] text-white shadow-inner">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-[var(--card)] border-2 border-[var(--enliven-cream)] text-[var(--foreground)] rounded-[1.5rem] rounded-bl-md px-6 py-5 flex gap-2 items-center shadow-sm">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full bg-[var(--enliven-purple)] animate-bounce"
                      style={{ animationDelay: `${delay}s`, animationDuration: "1s" }} />
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center justify-center mx-auto max-w-md w-full">
                <div className="flex items-center gap-3 text-sm px-6 py-4 rounded-2xl bg-[var(--enliven-cream)] text-[var(--enliven-purple)] font-bold border border-[var(--enliven-purple)] shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-4" />
          </div>

          {/* ── Input bar ── */}
          <div className="shrink-0 bg-[var(--card)] border-t-2 border-[var(--enliven-cream)] px-6 py-5 z-10 relative">
            <div className="flex gap-4 items-end mx-auto">
              <div className="flex-1 bg-[var(--secondary)] border-2 border-[var(--enliven-cream)] rounded-[1.5rem] flex items-end overflow-hidden focus-within:border-[var(--enliven-purple)] focus-within:bg-[var(--card)] transition-all shadow-inner relative">
                <textarea
                  ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={courseId ? "Ask Study Buddy anything about your learning path…" : "Select a course first…"}
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
                    ? "bg-[var(--enliven-purple)] text-white shadow-md hover:shadow-lg hover:opacity-90 transform hover:-translate-y-0.5 cursor-pointer"
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)] cursor-not-allowed border-2 border-[var(--enliven-cream)]"
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
