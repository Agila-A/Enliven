// pages/StudyBuddyChat.jsx
// ─────────────────────────────────────────────────────────────────
// BUGS FIXED:
//  [CRITICAL] msg.sender "You"/"StudyBuddy" vs backend "user"/"assistant"
//             → normalised to backend values throughout
//  [CRITICAL] input not cleared before API call → cleared immediately
//  [CRITICAL] no error handling on fetch → try/catch + error state
//  [IMPORTANT] no auto-scroll → useEffect on messages
//  [IMPORTANT] no loading state → typing indicator
//  [IMPORTANT] no context panel → added with domain/level/module/assessment info
//  [IMPORTANT] no markdown rendering → lightweight inline renderer
//  [IMPORTANT] history uses wrong field name → uses msg.text (matches schema)
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  BarChart2,
} from "lucide-react";

/* ── Lightweight markdown renderer — no extra deps ── */
function renderMd(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, '<pre class="sb-code">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="sb-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<p class="sb-h3">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="sb-h2">$1</p>')
    .replace(/^- (.+)$/gm, '<li class="sb-li">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="sb-ul">$&</ul>')
    .replace(/\n\n+/g, '<br/><br/>')
    .replace(/\n/g, "<br/>");
}

const QUICK_PROMPTS = [
  "What should I study next?",
  "How did I do on my last test?",
  "Explain my current topic simply",
  "Give me a study tip for today",
];

export default function StudyBuddyChat() {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [context,  setContext]  = useState(null);
  const [showCtx,  setShowCtx]  = useState(false);
  const [error,    setError]    = useState("");

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const textareaRef = useRef(null);

  /* ── Load history + context on mount ── */
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [histRes, ctxRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/history`,  { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context`,  { headers }),
        ]);

        const [hist, ctx] = await Promise.all([histRes.json(), ctxRes.json()]);

        if (hist.success) setMessages(hist.messages || []);
        if (ctx.success)  setContext(ctx.context   || {});
      } catch (err) {
        console.error("StudyBuddy init:", err);
        setError("Couldn't load your chat history.");
      } finally {
        setFetching(false);
      }
    }
    init();
  }, []);

  /* ── Auto-scroll to bottom ── */
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
    if (!trimmed || loading) return;

    // [FIX] Clear input and add user message BEFORE the fetch
    setInput("");
    setError("");
    setMessages(prev => [...prev, { sender: "user", text: trimmed }]);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/message`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "No reply");

      // [FIX] sender is "assistant", not "StudyBuddy"
      setMessages(prev => [...prev, { sender: "assistant", text: data.reply }]);

      // Refresh context (score may have just updated)
      const ctxRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ctxData = await ctxRes.json();
      if (ctxData.success) setContext(ctxData.context || {});

    } catch (err) {
      console.error("sendMessage:", err);
      setError("Failed to get a response. Please try again.");
      // Remove the optimistic message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Context panel helpers ── */
  const lastA = context?.lastAssessment;
  const avgScore = context?.assessmentHistory?.length
    ? Math.round(
        context.assessmentHistory.reduce((s, a) => s + a.score, 0) /
        context.assessmentHistory.length
      )
    : null;

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        .sb-code {
          display: block;
          background: rgba(242, 231, 203, 0.4);
          color: var(--foreground);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          margin: 12px 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          white-space: pre;
          border: 1px solid rgba(242, 231, 203, 0.8);
        }
        .sb-inline-code {
          background: rgba(242, 231, 203, 0.6);
          color: #C54F2D;
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 13px;
          font-family: monospace;
          font-weight: 500;
        }
        .sb-h2 { font-size: 16px; font-weight: 800; margin: 12px 0 4px; color: inherit; }
        .sb-h3 { font-size: 14px; font-weight: 700; margin: 10px 0 4px; color: inherit; }
        .sb-ul { padding-left: 20px; margin: 8px 0; list-style-type: disc; }
        .sb-li { margin: 4px 0; font-size: 14px; line-height: 1.6; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto font-sans tracking-wide py-4 px-2 sm:px-6">

          <div className="bg-white border-2 border-cream rounded-[2rem] flex flex-col h-full shadow-sm overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-white border-b-2 border-cream px-6 py-5 flex items-center justify-between shrink-0 z-10 relative shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red/10 text-red shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-foreground text-lg leading-tight tracking-tight mt-1">Study Buddy</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50 mt-1">
                {context?.domain
                  ? `${context.domain} · ${context.skillLevel || ""}`
                  : "AI Learning Assistant"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCtx(s => !s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showCtx ? 'bg-cream text-foreground' : 'border-2 border-cream text-foreground/60 hover:bg-cream/50 hover:text-foreground'}`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">My Context</span>
            {showCtx ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </div>

        {/* ── Context Panel ── */}
        <div className={`bg-cream/20 border-b-2 border-cream transition-all duration-300 overflow-hidden shrink-0 ${showCtx ? 'max-h-96 opacity-100 py-6 px-6' : 'max-h-0 opacity-0 py-0 px-6 border-b-0'}`}>
            <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-4">
              What Study Buddy knows about you
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Domain",   value: context?.domain || "—" },
                { label: "Level",    value: context?.skillLevel || "—" },
                { label: "Module",   value: context?.currentModule != null ? `Module ${context.currentModule}` : "—" },
                { label: "Completed",
                  value: Array.isArray(context?.completedModules) && context.completedModules.length
                    ? `Modules ${context.completedModules.join(", ")}`
                    : "None yet" },
                ...(lastA ? [
                  { label: "Last Test", value: `${lastA.score}% (${lastA.passed ? "✓ Passed" : "✗ Failed"})`, warn: lastA.flagged },
                ] : []),
                ...(avgScore != null ? [
                  { label: "Avg Score", value: `${avgScore}% over ${context.assessmentHistory.length} tests` },
                ] : []),
              ].map(({ label, value, warn }) => (
                <div key={label}
                  className={`rounded-2xl px-4 py-3 border-2 min-w-[120px] bg-white shadow-xs ${warn ? 'border-red/30' : 'border-cream'}`}>
                  <p className="text-foreground/50 mb-1 uppercase text-[10px] font-bold tracking-widest">{label}</p>
                  <p className={`font-bold text-sm ${warn ? 'text-red' : 'text-foreground'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 space-y-6 relative bg-cream/10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-cream/10 to-cream/20">

          {fetching ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground/60">
              <div className="w-10 h-10 border-4 border-cream border-t-red rounded-full animate-spin" />
              <p className="font-bold">Syncing AI context…</p>
            </div>

          ) : messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4 max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-white shadow-soft border-4 border-cream text-yellow transform -rotate-6">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-black text-foreground text-2xl tracking-tight">Hey, I'm Study Buddy!</h3>
                <p className="text-foreground/70 font-medium text-base mt-3 leading-relaxed">
                  I know your course, skill level, and how your tests went. Ask me anything to get personalized help.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p)}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-cream bg-white text-foreground/70 hover:bg-cream hover:text-foreground transition-all transform hover:-translate-y-0.5 shadow-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* Message list */
            messages.map((msg, i) => {
              const isUser = msg.sender === "user";
              return (
                <div key={i} className={`flex gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-red text-white shadow-inner">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-[1.5rem] px-6 py-4 shadow-sm relative ${
                        isUser 
                        ? "bg-red text-white rounded-br-md border border-red/80" 
                        : "bg-white text-foreground border-2 border-cream rounded-bl-md"
                    }`}
                  >
                    {isUser
                      ? <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      : <div
                          className="leading-relaxed font-medium"
                          dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
                        />
                    }

                    {msg.timestamp && (
                      <p className={`text-[10px] uppercase font-bold tracking-wider mt-3 ${isUser ? 'text-white/60' : 'text-foreground/40'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  {isUser && (
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 bg-cream/70 text-foreground border border-cream shadow-inner text-sm font-black">
                      SRI
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
              <div className="bg-white border-2 border-cream text-foreground rounded-[1.5rem] rounded-bl-md px-6 py-5 flex gap-2 items-center shadow-sm">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-red/60 animate-bounce"
                    style={{
                      animationDelay: `${delay}s`,
                      animationDuration: "1s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center mx-auto max-w-md w-full">
                <div className="flex items-center gap-3 text-sm px-6 py-4 rounded-2xl bg-red/10 text-red font-bold border border-red/20 shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
                </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 bg-white border-t-2 border-cream px-6 py-5 z-10 relative">
          <div className="flex gap-4 items-end mx-auto">
            <div className="flex-1 bg-cream/20 border-2 border-cream rounded-[1.5rem] flex items-end overflow-hidden focus-within:border-red focus-within:bg-white transition-all shadow-inner relative">
              <textarea
                ref={el => { inputRef.current = el; textareaRef.current = el; }}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask Study Buddy anything about your learning path…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent px-5 py-4 text-base font-medium text-foreground placeholder:text-foreground/40 resize-none outline-none custom-scrollbar"
                style={{ maxHeight: 150 }}
              />
            </div>

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  input.trim() && !loading
                  ? "bg-red text-white shadow-md hover:shadow-lg hover:bg-red/90 transform hover:-translate-y-0.5 cursor-pointer"
                  : "bg-cream/50 text-foreground/30 cursor-not-allowed border-2 border-cream"
              }`}
            >
              <Send className="w-6 h-6 mr-1 mt-1" />
            </button>
          </div>

          <p className="text-[10px] text-center font-bold uppercase tracking-widest text-foreground/40 mt-3 hidden sm:block">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
        </div>
      </div>
    </>
  );
}
