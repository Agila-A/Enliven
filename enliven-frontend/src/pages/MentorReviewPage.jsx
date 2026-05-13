import React, { useState, useEffect } from "react"

export default function MentorReviewPage() {
  const [submissions, setSubmissions] = useState([])
  const [selected,    setSelected]    = useState(null)
  const [feedback,    setFeedback]    = useState("")
  const [status,      setStatus]      = useState("approved")
  const [submitting,  setSubmitting]  = useState(false)
  const [loading,     setLoading]     = useState(true)

  const token = localStorage.getItem("token")

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(
          `${import.meta.env.VITE_API_URL}/api/code-review/mentor/pending`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        if (data.success) setSubmissions(data.submissions)
      } catch (err) {
        console.error("Failed to load pending reviews:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleReview = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/code-review/${selected._id}/mentor-review`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ status, feedback }),
        }
      )
      const data = await res.json()
      if (data.success) {
        setSubmissions(prev => prev.filter(s => s._id !== selected._id))
        setSelected(null)
        setFeedback("")
      }
    } catch (err) {
      console.error("Failed to submit review:", err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-cream border-t-primary rounded-full animate-spin mb-4" />
      <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Loading pending reviews...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
        
        {/* Left column (Submission List) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 border shadow-sm">
            <h1 className="text-2xl font-black mb-6 tracking-tight">Project Inbox</h1>
            {submissions.length === 0 ? (
              <div className="text-center py-10 px-4 bg-cream/10 rounded-2xl border-2 border-dashed border-cream">
                <span className="text-4xl mb-4 block">📦</span>
                <p className="font-bold text-foreground/50">All projects reviewed!</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">Excellent work, mentor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map(s => (
                  <button
                    key={s._id}
                    onClick={() => { setSelected(s); setFeedback(""); setStatus("approved") }}
                    className={`w-full text-left p-5 border-2 rounded-2xl transition-all group ${
                      selected?._id === s._id ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-cream hover:border-primary/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <p className="font-black text-foreground">{s.userId?.name || "Student"}</p>
                       <span className="text-[9px] font-black uppercase tracking-widest bg-cream px-2 py-1 rounded-lg">FINAL</span>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      {s.userId?.domain} <span className="mx-1 opacity-30">|</span> {s.userId?.skillLevel}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-cream/30">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Review Now →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column (Review Panel) */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-3xl border border-dashed border-cream h-full flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 bg-cream/30 rounded-[2rem] flex items-center justify-center mb-6 text-3xl">🗂️</div>
              <h3 className="text-xl font-bold mb-2">Ready to Certification</h3>
              <p className="text-muted-foreground text-sm font-medium max-w-xs leading-relaxed">
                Select a final project from the inbox to begin your professional evaluation.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black tracking-tight mb-1">
                    {selected.userId?.name}'s Project
                  </h2>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    {selected.language} Implementation <span className="mx-2 opacity-30">•</span> {selected.description}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-cream rounded-xl transition-colors">
                  <span className="text-xl">✕</span>
                </button>
              </div>

              {/* Code display */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Project Source Code</h3>
                <div className="relative group">
                   <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">Read Only</div>
                   <pre className="bg-[#0f172a] text-[#4ade80] p-8 rounded-3xl text-sm font-mono overflow-x-auto max-h-[400px] shadow-2xl custom-scrollbar border border-white/5">
                     <code>{selected.code}</code>
                   </pre>
                </div>

              </div>

              {/* AI review summary for mentor */}
              {selected.aiReview?.status === "ready" && (
                <div className="p-6 bg-cream/20 rounded-3xl border-2 border-cream relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-cream/30 rounded-bl-2xl">
                    <span className="text-xs font-black uppercase tracking-widest text-foreground/50">AI Assistant Summary</span>
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground/50 mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px]">🤖</span>
                    Review Highlights
                  </h3>
                  <p className="text-sm font-bold text-foreground/70 leading-relaxed mb-4">
                    {selected.aiReview.summary}
                  </p>
                  {selected.aiReview.overallScore != null && (
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-foreground/40 uppercase tracking-widest">AI Projected Score:</span>
                       <span className="px-3 py-1 bg-white rounded-lg font-black text-sm border border-cream/50 shadow-sm">
                         {selected.aiReview.overallScore}/100
                       </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mentor decision */}
              <div className="space-y-6 pt-6 border-t-2 border-cream/30">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Certification Decision</h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: "approved", label: "Approve Project", color: "bg-green text-white border-green shadow-green/20" },
                      { id: "needs_revision", label: "Request Revision", color: "bg-amber-500 text-white border-amber-500 shadow-amber-500/20" },
                      { id: "rejected", label: "Reject Submission", color: "bg-red text-white border-red shadow-red/20" }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setStatus(s.id)}
                        className={`px-6 py-3 rounded-2xl border-2 text-sm font-black transition-all transform active:scale-[0.95] ${
                          status === s.id
                            ? `${s.color} shadow-lg ring-4 ring-offset-2 ring-transparent`
                            : "bg-white text-muted-foreground border-cream hover:border-primary/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Professional Feedback</h3>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Provide specific, actionable feedback to the student..."
                    rows={6}
                    className="w-full border-2 border-cream rounded-3xl p-6 text-sm font-bold text-foreground placeholder:text-muted-foreground/50 resize-none focus:border-primary outline-none transition-all shadow-inner bg-cream/5"
                  />
                </div>

                <button
                  onClick={handleReview}
                  disabled={!feedback.trim() || submitting}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl hover:shadow-2xl hover:bg-primary/90 transition-all disabled:opacity-50 transform active:scale-[0.98]"
                >
                  {submitting ? (
                     <div className="flex items-center justify-center gap-2">
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       <span>Submitting Decision...</span>
                     </div>
                  ) : "Confirm & Send Review"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
