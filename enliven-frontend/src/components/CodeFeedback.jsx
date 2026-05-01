import React from "react"

export default function CodeFeedback({ review, language }) {
  if (!review) return null;

  const scoreColor =
    review.overallScore >= 80 ? "text-green" :
    review.overallScore >= 60 ? "text-amber-600" : "text-red"

  const typeBadge = {
    error:      "bg-red/10 text-red border-red/20",
    warning:    "bg-amber-100 text-amber-700 border-amber-200",
    suggestion: "bg-blue-100 text-blue-700 border-blue-200",
    praise:     "bg-green/10 text-green border-green/20",
  }

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header with Score */}
      <div className="p-6 border-b-2 border-cream/50 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">AI Code Review</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Senior Engineer Instance</p>
        </div>
        {review.overallScore != null && (
          <div className="text-center bg-cream/10 rounded-2xl p-3 border-2 border-cream min-w-[80px]">
             <p className={`text-3xl font-black leading-none ${scoreColor}`}>{review.overallScore}</p>
             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Quality Score</p>
          </div>
        )}
      </div>

      <div className="p-6 space-y-8 overflow-y-auto">
        {/* Summary */}
        {review.summary && (
          <div className="relative">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
            <p className="text-sm font-medium leading-relaxed text-foreground/80 italic pl-3">
              "{review.summary}"
            </p>
          </div>
        )}

        {/* Complexity Analysis */}
        {(review.timeComplexity || review.spaceComplexity) && (
          <div className="grid grid-cols-1 gap-3">
            {review.timeComplexity && (
              <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-2xl flex items-start gap-3">
                <span className="text-xl">⏱️</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1">Time Complexity</p>
                  <p className="text-sm font-bold text-purple-900">{review.timeComplexity}</p>
                </div>
              </div>
            )}
            {review.spaceComplexity && (
              <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-start gap-3">
                <span className="text-xl">💾</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Space Complexity</p>
                  <p className="text-sm font-bold text-indigo-900">{review.spaceComplexity}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* What went well */}
        {review.whatWentWell?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-green flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-green/10 flex items-center justify-center text-xs">✓</span>
              Engineering Strengths
            </h3>
            <ul className="space-y-3 pl-2">
              {review.whatWentWell.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm font-medium text-foreground/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-green mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {review.issues?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-red flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red/10 flex items-center justify-center text-xs">!</span>
              Critical Feedback
            </h3>
            <ul className="space-y-3 pl-2">
              {review.issues.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm font-medium text-foreground/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-red mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Line comments */}
        {review.lineComments?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <span className="w-6 h-6 rounded-lg bg-cream/30 flex items-center justify-center text-xs">#</span>
               Source Analysis
            </h3>
            <div className="space-y-3">
              {review.lineComments.map((c, i) => (
                <div key={i} className={`p-4 rounded-2xl border-2 transition-all ${typeBadge[c.type] || typeBadge.suggestion}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="capitalize text-[9px] font-black uppercase tracking-widest opacity-70">[{c.type}]</span>
                    {c.line && (
                      <span className="font-mono font-black text-[10px] bg-white/40 px-2 py-0.5 rounded-md">LINE {c.line}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold leading-snug">{c.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {review.suggestions?.length > 0 && (
          <div className="space-y-4 pt-4 border-t-2 border-cream/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs">💡</span>
               Actionable Improvements
            </h3>
            <div className="space-y-3">
              {review.suggestions.map((s, i) => (
                <div key={i} className="flex gap-4 p-4 bg-cream/5 border-2 border-cream/30 rounded-2xl group hover:border-primary/20 transition-all">
                  <span className="w-6 h-6 bg-cream text-foreground rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                    {i + 1}
                  </span>
                  <p className="text-sm font-bold text-foreground/80 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
