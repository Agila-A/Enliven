import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import CodeFeedback from "../components/CodeFeedback"

export default function ProjectPage() {
  const { domain, level, moduleId } = useParams()
  const navigate = useNavigate()
  const isFinal = moduleId === "final"

  const params    = new URLSearchParams(window.location.search)
  const moduleTitle = params.get("moduleTitle") || `Module ${moduleId}`

  const toSlug  = s => String(s || "").toLowerCase().replace(/\s+/g, "-")
  const toLevel = s => String(s || "").replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "")
  const courseId = `${toSlug(domain)}-${toLevel(level)}`

  const defaultLanguage = domain?.toLowerCase().includes("python") || domain?.toLowerCase().includes("data") ? "python" : "javascript"

  const [code,         setCode]         = useState("")
  const [language,     setLanguage]     = useState(defaultLanguage)
  const [description,  setDescription]  = useState("")
  const [submitting,   setSubmitting]   = useState(false)
  const [reviewStatus, setReviewStatus] = useState("idle") // idle | pending | ready | failed
  const [currentReview,  setCurrentReview]  = useState(null)
  const [submissionId,   setSubmissionId]   = useState(null)
  const [history,        setHistory]        = useState([])

  const token = localStorage.getItem("token")

  useEffect(() => {
    async function loadHistory() {
      try {
        const res  = await fetch(
          `${import.meta.env.VITE_API_URL}/api/code-review/history/${courseId}/${moduleId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        if (data.success) setHistory(data.submissions)
      } catch (err) {
        console.error("Failed to load history:", err)
      }
    }
    loadHistory()
  }, [courseId, moduleId, token])

  const handleSubmit = async () => {
    setSubmitting(true)
    setReviewStatus("pending")
    setCurrentReview(null)

    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/code-review/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ courseId, moduleId, code, language, description, isFinalProject: isFinal }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setSubmissionId(data.submissionId)
    } catch (err) {
      console.error("Submission error:", err)
      setReviewStatus("failed")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!submissionId || reviewStatus !== "pending") return

    const interval = setInterval(async () => {
      try {
        const res  = await fetch(
          `${import.meta.env.VITE_API_URL}/api/code-review/${submissionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()

        if (data.status === "ready") {
          setCurrentReview(data.submission)
          setReviewStatus("ready")
          setHistory(prev => [
            { id: data.submission.id, aiReview: data.submission.aiReview, submittedAt: data.submission.submittedAt },
            ...prev
          ])
          clearInterval(interval)
        } else if (data.status === "failed") {
          setReviewStatus("failed")
          clearInterval(interval)
        }
      } catch (err) {
        // keep polling unless component unmounts
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [submissionId, reviewStatus, token])

  const loadSubmission = async (id) => {
    try {
      const res  = await fetch(
        `${import.meta.env.VITE_API_URL}/api/code-review/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success && data.submission.aiReview.status === "ready") {
        setCurrentReview(data.submission)
        setReviewStatus("ready")
        setCode(data.submission.code)
        setLanguage(data.submission.language)
        setDescription(data.submission.description || "")
      }
    } catch (err) {
      console.error("Failed to load submission:", err)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-8">
        
        {/* Left column (Code Editor + controls) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-8 border shadow-sm">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">
                {isFinal ? "Final Project Submission" : `Module ${moduleId} — ${moduleTitle}`}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isFinal
                  ? "Submit your final project for mentor review. The AI Reviewer will provide immediate feedback first."
                  : "Submit your code for this module's practical exercise. You'll get instant senior developer-level AI feedback."}
              </p>
              {!isFinal && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-800 flex gap-3">
                  <span className="text-xl">💡</span>
                  <p>
                    <b>Pro Tip:</b> Project submission is independent of your module tests. 
                    You can submit your code multiple times to iterate on the AI's suggestions.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full border-2 border-cream rounded-xl px-4 py-3 bg-white font-bold focus:border-primary outline-none transition-all"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML / CSS</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="typescript">TypeScript</option>
                  <option value="sql">SQL</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Project Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this code do?"
                  className="w-full border-2 border-cream rounded-xl px-4 py-3 bg-white font-medium focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Implementation Code</label>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`// Paste or write your ${language} code here...`}
                className="w-full h-[400px] font-mono text-sm border-2 border-gray-100 rounded-2xl p-6 bg-gray-950 text-green-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                spellCheck={false}
              />
              <div className="flex justify-between mt-2 px-1">
                <span className={`text-xs font-bold ${code.length > 50000 ? 'text-red' : 'text-muted-foreground'}`}>
                  {code.length.toLocaleString()} / 50,000 characters
                </span>
                <span className="text-xs text-muted-foreground font-medium italic">Supports standard markdown formatting</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!code.trim() || submitting || code.length > 50000}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Code...</span>
                </div>
              ) : isFinal ? "Submit Final Project to Mentor" : "Submit for AI Code Review"}
            </button>
          </div>

          {/* History Section */}
          {history.length > 0 && (
            <div className="bg-white rounded-3xl p-8 border shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Submission History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {history.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => loadSubmission(s.id)}
                    className="flex flex-col text-left p-4 border-2 border-cream rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="font-bold text-foreground">Attempt #{history.length - i}</span>
                      <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${
                        s.aiReview?.overallScore >= 75 ? "bg-green/10 text-green" :
                        s.aiReview?.overallScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red/10 text-red"
                      }`}>
                        {s.aiReview?.status === "ready" ? `${s.aiReview.overallScore}/100` : s.aiReview?.status}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">
                      {new Date(s.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column (AI Review Feedback) */}
        <div className="lg:col-span-2">
          <div className="sticky top-10 space-y-6">
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden min-h-[500px]">
              
              {reviewStatus === "idle" && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                  <div className="w-24 h-24 bg-cream/30 rounded-[2.5rem] flex items-center justify-center mb-6 text-4xl shadow-inner transform -rotate-6">
                    🔍
                  </div>
                  <h3 className="text-xl font-bold mb-2">Review Waiting</h3>
                  <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                    Once you submit your code, our AI Code Reviewer will perform a line-by-line analysis here.
                  </p>
                </div>
              )}

              {reviewStatus === "pending" && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                  <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Analyzing Your Code...</h3>
                  <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">
                    We're checking for efficiency, complexity, and best practices. This usually takes 15–20 seconds.
                  </p>
                  <div className="w-full bg-cream/20 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full animate-[loading_20s_ease-in-out]" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {reviewStatus === "ready" && currentReview && (
                <CodeFeedback review={currentReview.aiReview} language={currentReview.language} />
              )}

              {reviewStatus === "failed" && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                  <div className="w-20 h-20 bg-red/10 text-red rounded-3xl flex items-center justify-center mb-6 text-4xl">
                    ⚠️
                  </div>
                  <h3 className="text-xl font-bold mb-2">Review Failed</h3>
                  <p className="text-muted-foreground text-sm font-medium mb-6">
                    Something went wrong while generating the AI review. Please try submitting again.
                  </p>
                  <button onClick={() => setReviewStatus("idle")} className="text-primary font-bold text-sm underline">
                    Clear and try again
                  </button>
                </div>
              )}
            </div>

            {/* Mentor status for final project */}
            {isFinal && currentReview?.mentorReview && (
              <div className={`rounded-3xl p-6 border-2 shadow-sm ${
                currentReview.mentorReview.status === 'approved' ? 'bg-green/5 border-green/20' :
                currentReview.mentorReview.status === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-red/5 border-red/20'
              }`}>
                <h3 className="text-sm font-black uppercase tracking-widest mb-3">Mentor Review Status</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    currentReview.mentorReview.status === 'approved' ? 'bg-green' :
                    currentReview.mentorReview.status === 'pending' ? 'bg-blue-500' : 'bg-red'
                  }`} />
                  <span className="font-bold text-lg capitalize">{currentReview.mentorReview.status.replace('_', ' ')}</span>
                </div>
                {currentReview.mentorReview.feedback && (
                  <div className="bg-white/80 rounded-2xl p-4 border text-sm italic text-foreground/80">
                    "{currentReview.mentorReview.feedback}"
                  </div>
                )}
                {currentReview.mentorReview.reviewedAt && (
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-3">
                     Reviewed on {new Date(currentReview.mentorReview.reviewedAt).toLocaleDateString()}
                   </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
