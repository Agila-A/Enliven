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
      {/* Inline styles for markdown classes (no extra CSS file needed) */}
      <style>{`
        .sb-code {
          display: block;
          background: var(--secondary);
          color: var(--foreground);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          line-height: 1.6;
          overflow-x: auto;
          margin: 8px 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          white-space: pre;
        }
        .sb-inline-code {
          background: var(--secondary);
          color: var(--enliven-purple, #582B5B);
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 12px;
          font-family: monospace;
        }
        .sb-h2 { font-size: 15px; font-weight: 700; margin: 8px 0 2px; }
        .sb-h3 { font-size: 13px; font-weight: 600; margin: 6px 0 2px; }
        .sb-ul { padding-left: 18px; margin: 4px 0; }
        .sb-li { margin: 3px 0; font-size: 13px; line-height: 1.55; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">

        {/* ── Header ── */}
        <div className="bg-card border-b border-border px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--enliven-deep-purple), var(--enliven-purple))" }}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">Study Buddy</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {context?.domain
                  ? `${context.domain} · ${context.skillLevel || ""}`
                  : "Your AI learning assistant"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCtx(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            My Context
            {showCtx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* ── Context Panel ── */}
        {showCtx && (
          <div className="bg-card border-b border-border px-5 py-4 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              What Study Buddy knows about you
            </p>
            <div className="flex flex-wrap gap-2">
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
                  className="rounded-xl px-3 py-2 text-xs border"
                  style={{
                    background: warn ? "rgba(239,68,68,0.06)" : "var(--secondary)",
                    borderColor: warn ? "rgba(239,68,68,0.25)" : "var(--border)",
                  }}>
                  <p className="text-muted-foreground mb-0.5 uppercase text-[10px] tracking-wide">{label}</p>
                  <p className="font-semibold text-foreground" style={warn ? { color: "var(--destructive)" } : {}}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

          {fetching ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-border rounded-full animate-spin"
                style={{ borderTopColor: "var(--enliven-purple)" }} />
              <p className="text-sm">Loading your conversation…</p>
            </div>

          ) : messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--enliven-deep-purple), var(--enliven-purple))" }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Hey, I'm Study Buddy!</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  I know your course, skill level, and how your tests went. Ask me anything.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p)}
                    className="px-3 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* Message list */
            /* [FIX] check sender === "user" (backend value), not "You" */
            messages.map((msg, i) => {
              const isUser = msg.sender === "user";
              return (
                <div key={i} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center mt-0.5"
                      style={{ background: "linear-gradient(135deg, var(--enliven-deep-purple), var(--enliven-purple))" }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className="max-w-[72%] rounded-2xl px-4 py-3 text-sm shadow-sm"
                    style={isUser ? {
                      background: "linear-gradient(135deg, var(--enliven-deep-purple), var(--enliven-purple))",
                      color: "#fff",
                      borderBottomRightRadius: 4,
                    } : {
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderBottomLeftRadius: 4,
                    }}
                  >
                    {isUser
                      ? <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      : <div
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
                        />
                    }

                    {msg.timestamp && (
                      <p className="text-[10px] mt-1.5 opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  {isUser && (
                    <div className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center mt-0.5 bg-secondary">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--enliven-deep-purple), var(--enliven-purple))" }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: "var(--enliven-purple)",
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
            <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl mx-4"
              style={{ background: "rgba(239,68,68,0.08)", color: "var(--destructive)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 bg-card border-t border-border px-4 py-3">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <div className="flex-1 bg-background border border-border rounded-2xl flex items-end overflow-hidden focus-within:border-[var(--enliven-purple)] transition-colors"
              style={{ "--enliven-purple": "#582B5B" }}>
              <textarea
                ref={el => { inputRef.current = el; textareaRef.current = el; }}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask Study Buddy anything about your course…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
                style={{ maxHeight: 120 }}
              />
            </div>

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, var(--enliven-deep-purple), var(--enliven-purple))"
                  : "var(--secondary)",
                cursor: input.trim() && !loading ? "pointer" : "default",
              }}
            >
              <Send className="w-4 h-4"
                style={{ color: input.trim() && !loading ? "#fff" : "var(--muted-foreground)" }} />
            </button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground mt-1.5">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
