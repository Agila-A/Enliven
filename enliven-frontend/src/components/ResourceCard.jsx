import React from "react"

const typeConfig = {
  article:       { label: "Article",       icon: "📄", color: "bg-blue-50 border-blue-200 text-blue-700" },
  documentation: { label: "Docs",          icon: "📚", color: "bg-purple-50 border-purple-200 text-purple-700" },
  tool:          { label: "Tool",          icon: "🔧", color: "bg-amber-50 border-amber-200 text-amber-700" },
  practice:      { label: "Practice",      icon: "💪", color: "bg-green-50 border-green-200 text-green-700" },
  video:         { label: "Video",         icon: "🎬", color: "bg-red-50 border-red-200 text-red-700" },
  other:         { label: "Resource",      icon: "🔗", color: "bg-gray-50 border-gray-200 text-gray-700" },
}

const difficultyColor = {
  beginner:     "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced:     "bg-red-100 text-red-700",
  all:          "bg-gray-100 text-gray-600",
}

const getHostname = (url) => {
  try { return new URL(url).hostname.replace("www.", "") }
  catch { return "external link" }
}

export default function ResourceCard({ resource }) {
  const config = typeConfig[resource.type] || typeConfig.other

  const handleClick = () => {
    window.open(resource.url, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer bg-white border rounded-2xl p-5 hover:shadow-xl transition-all hover:border-primary/40 hover:-translate-y-1 relative overflow-hidden"
    >
      {/* Visual background accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform group-hover:scale-125 ${config.color.split(' ')[0]}`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border ${config.color}`}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {resource.title}
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
              {getHostname(resource.url)}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border flex-shrink-0 ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Description */}
      {resource.description && (
        <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed line-clamp-3 mb-4 pl-1">
          {resource.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-cream/30 relative z-10">
        <div className="flex items-center gap-2">
          {resource.difficulty && resource.difficulty !== "all" && (
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${difficultyColor[resource.difficulty]}`}>
              {resource.difficulty}
            </span>
          )}
          {resource.isFree && (
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-black uppercase tracking-wider">
              Free
            </span>
          )}
        </div>
        <div className="w-6 h-6 rounded-full bg-cream/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-45">
          <span className="text-[10px]">↗</span>
        </div>
      </div>
    </div>
  )
}
