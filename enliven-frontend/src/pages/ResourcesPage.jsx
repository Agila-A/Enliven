import React, { useEffect, useRef, useState } from "react"
import { BookOpen, ChevronRight } from "lucide-react"
import ResourceCard from "../components/ResourceCard"

const CATEGORIES = [
  { key: "articles",      label: "Articles",       icon: "📄" },
  { key: "documentation", label: "Documentation",  icon: "📚" },
  { key: "tools",         label: "Tools",          icon: "🔧" },
  { key: "practice",      label: "Practice",       icon: "💪" },
  { key: "videos",        label: "Videos",         icon: "🎬" },
]

function formatTimeAgo(dateStr) {
  if (!dateStr) return "Never"
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return "just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return `${Math.floor(diff / 86400)} days ago`
}

export default function ResourcesPage() {
  const [roadmap,      setRoadmap]      = useState(null)
  const [courseId,     setCourseId]     = useState(null)
  const [enrollments,  setEnrollments]  = useState([])
  const [showPicker,   setShowPicker]   = useState(false)
  const [byModule,     setByModule]     = useState({})

  const [activeModule, setActiveModule] = useState(null)
  const [activeCategory, setActiveCategory] = useState("articles")
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const pollRefs = useRef({})

  const token = localStorage.getItem("token")

  const formatCourseId = (id = "") => {
    return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const startPollingModule = (moduleId, cid) => {
    // Don't start duplicate polls
    if (pollRefs.current[moduleId]) return

    const interval = setInterval(async () => {
      try {
        const res  = await fetch(
          `${import.meta.env.VITE_API_URL}/api/resources/${moduleId}?courseId=${cid}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()

        if (data.status === "ready") {
          setByModule(prev => ({
            ...prev,
            [moduleId]: {
              status:     "ready",
              resources:  data.resources,
              fetchedAt:  data.fetchedAt,
              topicTitle: data.topicTitle,
            }
          }))
          clearInterval(pollRefs.current[moduleId])
          delete pollRefs.current[moduleId]
        } else if (data.status === "failed") {
          setByModule(prev => ({
            ...prev,
            [moduleId]: { ...(prev[moduleId] || {}), status: "failed" }
          }))
          clearInterval(pollRefs.current[moduleId])
          delete pollRefs.current[moduleId]
        }
      } catch { /* keep polling */ }
    }, 4000)

    pollRefs.current[moduleId] = interval
  }

  const triggerFetchForModule = async (moduleId, cid) => {
    try {
      const res  = await fetch(
        `${import.meta.env.VITE_API_URL}/api/resources/${moduleId}?courseId=${cid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()

      if (data.status === "ready") {
        setByModule(prev => ({
          ...prev,
          [moduleId]: {
            status:     "ready",
            resources:  data.resources,
            fetchedAt:  data.fetchedAt,
            topicTitle: data.topicTitle,
          }
        }))
      } else if (data.status === "pending") {
        setByModule(prev => ({
          ...prev,
          [moduleId]: { ...(prev[moduleId] || {}), status: "pending" }
        }))
        startPollingModule(moduleId, cid)
      }
    } catch (err) {
      console.error(`Trigger fetch error for module ${moduleId}:`, err.message)
    }
  }

  const loadCourseData = async (cid) => {
    try {
      setLoading(true);
      // Clean up previous polls
      Object.values(pollRefs.current).forEach(clearInterval);
      pollRefs.current = {};
      setByModule({});
      setActiveModule(null);

      const rRes = await fetch(`${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap?courseId=${cid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rData = await rRes.json();
      if (!rData.success || !rData.roadmap) { setLoading(false); return; }

      const rm = rData.roadmap;
      setRoadmap(rm);

      if (rm.topics?.length) setActiveModule(String(rm.topics[0].sequenceNumber));

      const cRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/resources/all?courseId=${cid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cData = await cRes.json();
      if (cData.success) setByModule(cData.byModule || {});

      const topicsToFetch = rm.topics.filter(topic => {
        const mid = String(topic.sequenceNumber);
        const entry = cData.byModule?.[mid];
        return !entry || entry.status === "failed" || 
               (entry.status === "ready" && entry.fetchedAt && 
               (Date.now() - new Date(entry.fetchedAt)) > 7 * 24 * 60 * 60 * 1000);
      });

      const processQueue = async () => {
        for (let i = 0; i < topicsToFetch.length; i++) {
          const topic = topicsToFetch[i];
          const mid = String(topic.sequenceNumber);
          await triggerFetchForModule(mid, cid);
          if (i < topicsToFetch.length - 1) {
            await new Promise(r => setTimeout(r, 4000));
          }
        }
      };
      processQueue();

      for (const topic of rm.topics) {
        const mid = String(topic.sequenceNumber);
        if (cData.byModule?.[mid]?.status === "pending") {
          startPollingModule(mid, cid);
        }
      }
    } catch (err) {
      console.error("ResourcesPage loadCourse error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const eRes = await fetch(`${import.meta.env.VITE_API_URL}/api/user/enrollments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const eData = await eRes.json();
        const list = eData.enrollments || [];
        setEnrollments(list);

        let activeCourseId = localStorage.getItem("activeCourseId");
        if (!activeCourseId && list.length > 0) {
          activeCourseId = list[0].courseId;
          localStorage.setItem("activeCourseId", activeCourseId);
        }
        if (!activeCourseId) {
          setLoading(false);
          return;
        }
        setCourseId(activeCourseId);
        await loadCourseData(activeCourseId);
      } catch (err) {
        console.error("Init err", err);
        setLoading(false);
      }
    }
    init();

    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, [token]);

  const switchCourse = async (newCourseId) => {
    if (newCourseId === courseId) { setShowPicker(false); return; }
    setCourseId(newCourseId);
    localStorage.setItem("activeCourseId", newCourseId);
    setShowPicker(false);
    await loadCourseData(newCourseId);
  };

  const handleManualRefresh = async (moduleId) => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/resources/${moduleId}/refresh`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ courseId }),
        }
      )
      const data = await res.json()
      if (data.success) {
        setByModule(prev => ({
          ...prev,
          [moduleId]: { ...(prev[moduleId] || {}), status: "pending" }
        }))
        startPollingModule(moduleId, courseId)
      }
    } catch (err) {
      console.error("Manual refresh error:", err)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[400px] font-sans">
      <div className="w-12 h-12 border-4 border-cream border-t-primary rounded-full animate-spin mb-6" />
      <p className="font-black text-muted-foreground uppercase tracking-[0.2em] text-xs">Curating your roadmap resources...</p>
    </div>
  )

  if (!roadmap) return (
    <div className="p-10 text-center font-sans">
       <div className="w-20 h-20 bg-cream/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-3xl">🗺️</div>
       <h2 className="text-2xl font-black mb-2">Roadmap Required</h2>
       <p className="text-muted-foreground font-bold max-w-md mx-auto leading-relaxed">
         Complete your initial assessment to unlock curated resources for each module in your personalized learning path.
       </p>
    </div>
  )

  const currentModuleData = activeModule ? byModule[activeModule] : null
  const currentResources  = currentModuleData?.resources
  const currentStatus     = currentModuleData?.status || "pending"

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-visible">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
           <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
             <div>
               <h1 className="text-4xl font-black tracking-tight mb-2">Web Explorer <span className="text-primary">Agent</span></h1>
               <p className="text-muted-foreground font-bold max-w-2xl leading-relaxed">
                 Every module in your roadmap is automatically analyzed weekly. Our agent explores the web to find the most relevant and up-to-date learning materials for your specific skill level.
               </p>
             </div>
             
             {/* Course Switcher */}
             <div className="relative flex-shrink-0 z-20">
               {enrollments.length > 1 ? (
                 <button
                   onClick={() => setShowPicker((v) => !v)}
                   className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-cream/30 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-cream/50 transition-colors border-2 border-cream/50 hover:border-primary/30"
                 >
                   <BookOpen className="w-4 h-4 text-primary" />
                   {courseId ? formatCourseId(courseId) : "Select Course"}
                   <ChevronRight className={`w-4 h-4 transition-transform text-muted-foreground ${showPicker ? "rotate-90" : ""}`} />
                 </button>
               ) : (
                 <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-cream/30 text-xs font-bold uppercase tracking-widest text-foreground border-2 border-cream/50">
                   <BookOpen className="w-4 h-4 text-primary" />
                   {courseId ? formatCourseId(courseId) : "No course"}
                 </div>
               )}

               {showPicker && enrollments.length > 1 && (
                 <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-cream/50 rounded-2xl p-3 shadow-xl z-50 flex flex-col gap-2">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 pb-1">Switch Course</p>
                   {enrollments.map((e) => (
                     <button
                       key={e.courseId}
                       onClick={() => switchCourse(e.courseId)}
                       className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                         e.courseId === courseId
                           ? "bg-primary text-white"
                           : "hover:bg-cream/50 text-foreground"
                       }`}
                     >
                       {formatCourseId(e.courseId)}
                     </button>
                   ))}
                 </div>
               )}
             </div>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left sidebar — module list */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 pl-2">
                Your Roadmap Modules
              </h3>
              <div className="space-y-2">
                {roadmap.topics
                  .slice()
                  .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                  .map(topic => {
                    const mid    = String(topic.sequenceNumber)
                    const entry  = byModule[mid]
                    const status = entry?.status || "pending"
                    const isActive = activeModule === mid

                    return (
                      <button
                        key={mid}
                        onClick={() => { setActiveModule(mid); setActiveCategory("articles") }}
                        className={`w-full text-left px-5 py-4 rounded-2xl transition-all group relative border-2 ${
                          isActive
                            ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                            : "bg-white border-cream hover:border-primary/30 text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-white/60" : "text-muted-foreground"}`}>Module {topic.sequenceNumber}</span>
                          <span className="flex-shrink-0">
                            {status === "ready"   && <span className={`w-2 h-2 rounded-full block ${isActive ? "bg-white" : "bg-green"}`} />}
                            {status === "pending" && (
                              <span className={`w-2 h-2 rounded-full block animate-pulse ${isActive ? "bg-white/40" : "bg-amber-500"}`} />
                            )}
                            {status === "failed"  && <span className="text-red font-black text-xs">✕</span>}
                          </span>
                        </div>
                        <p className="font-bold text-sm truncate leading-tight">{topic.title}</p>
                        {status === "ready" && entry?.fetchedAt && (
                          <p className={`text-[9px] mt-2 font-bold uppercase tracking-wider ${isActive ? "text-white/50" : "text-muted-foreground/60"}`}>
                            Updated {formatTimeAgo(entry.fetchedAt)}
                          </p>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>

          {/* Right — resource content */}
          <div className="flex-1 min-w-0">
            {activeModule ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Module header with refresh button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight mb-1">
                      {roadmap.topics.find(t => String(t.sequenceNumber) === activeModule)?.title}
                    </h2>
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 bg-cream/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                         {currentStatus === "ready" ? "Current & Validated" : "Analyzing Content"}
                       </span>
                       {currentModuleData?.fetchedAt && (
                         <span className="text-xs font-bold text-muted-foreground opacity-60">
                           Auto-refreshing in {7 - Math.floor((Date.now() - new Date(currentModuleData.fetchedAt)) / 86400000)} days
                         </span>
                       )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleManualRefresh(activeModule)}
                    disabled={refreshing || currentStatus === "pending"}
                    className="flex items-center justify-center gap-3 px-6 py-3 bg-foreground text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-foreground/90 transition-all disabled:opacity-50 transform active:scale-95 shadow-lg"
                  >
                    {currentStatus === "pending" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Curating...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg leading-none">↻</span>
                        <span>Request Fresh Curation</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 p-1 bg-cream/30 rounded-2xl overflow-x-auto no-scrollbar border-2 border-cream/50">
                  {CATEGORIES.map(cat => {
                    const count = currentResources?.[cat.key]?.length || 0
                    const isActive = activeCategory === cat.key
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                          isActive
                            ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span>{cat.label}</span>
                        {count > 0 && (
                          <span className={`ml-1 w-5 h-5 flex items-center justify-center rounded-lg text-[10px] ${
                            isActive ? "bg-primary text-white" : "bg-cream text-muted-foreground"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Resource grid */}
                <div className="min-h-[400px]">
                  {currentStatus === "pending" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-48 bg-white/50 rounded-3xl border-2 border-dashed border-cream animate-pulse flex items-center justify-center">
                           <div className="text-center opacity-30">
                              <div className="w-10 h-10 bg-cream rounded-full mx-auto mb-2" />
                              <div className="w-20 h-2 bg-cream rounded-full mx-auto" />
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : currentStatus === "failed" ? (
                    <div className="bg-white rounded-[2.5rem] p-12 border-2 border-dashed border-red/20 text-center">
                       <div className="w-20 h-20 bg-red/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
                       <h3 className="text-xl font-black mb-2">Curation Interrupted</h3>
                       <p className="text-muted-foreground font-bold max-w-xs mx-auto leading-relaxed mb-8">
                         Our explorer agent encountered a technical error while scraping resources.
                       </p>
                       <button
                         onClick={() => handleManualRefresh(activeModule)}
                         className="px-10 py-4 bg-red text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red/90 transition-all shadow-xl shadow-red/20"
                       >
                         Try Again
                       </button>
                    </div>
                  ) : currentResources ? (
                    <>
                      {(currentResources[activeCategory] || []).length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-16 border-2 border-dashed border-cream text-center">
                           <div className="text-4xl mb-6 opacity-30">🔍</div>
                           <p className="text-muted-foreground font-black uppercase tracking-widest text-xs mb-4">No {activeCategory} identified</p>
                           <p className="text-muted-foreground font-bold max-w-xs mx-auto text-sm leading-relaxed mb-8">
                             The agent couldn't find verified {activeCategory} for this specific module yet.
                           </p>
                           <button
                             onClick={() => handleManualRefresh(activeModule)}
                             className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline"
                           >
                             Re-run Explorer
                           </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {(currentResources[activeCategory] || []).map((resource, i) => (
                            <ResourceCard key={i} resource={resource} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-dashed border-cream">
                 <div className="w-24 h-24 bg-cream/30 rounded-[2.5rem] flex items-center justify-center mb-8 text-4xl">🔭</div>
                 <h2 className="text-2xl font-black mb-2">Explorer Agent Ready</h2>
                 <p className="text-muted-foreground font-bold max-w-sm leading-relaxed">
                   Select a module from the left to view curated learning materials specifically chosen for your skill level.
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
