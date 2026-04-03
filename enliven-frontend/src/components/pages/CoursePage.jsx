/*
  COURSEPAGE.JSX — MODULE LOCKING + MODULE TESTS + FINAL TEST
*/

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Play,
  CheckCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  LoaderCircle,
  BookOpen
} from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js";

const toTitleCase = (s = "") =>
  s.replace(/-/g, " ").split(" ").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const cap1 = (s = "") => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const convertToEmbed = (url = "") => {
  try {
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be")) {
      const id = url.split("youtu.be/")[1].split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url;
  }
};

const buildCourseId = (domain, level) => `${domain}-${level}`;
const buildTopicId = (sequenceNumber) => String(sequenceNumber);

function normalizeProgress(progressArray = []) {
  const map = new Map();
  for (const p of progressArray) {
    const vp = new Map();
    if (p.videoProgress && typeof p.videoProgress === "object") {
      for (const [k, v] of Object.entries(p.videoProgress))
        vp.set(Number(k), !!v);
    }
    map.set(String(p.topicId), {
      videoProgress: vp,
      currentIndex: Number(p.currentIndex ?? 0),
    });
  }
  return map;
}

const mapToObj = (m) => {
  const o = {};
  for (const [k, v] of m.entries()) o[String(k)] = !!v;
  return o;
};

export default function CoursePage() {
  const { domain, level } = useParams();
  const navigate = useNavigate();
  const location = useLocation();  
  const courseId = useMemo(() => buildCourseId(domain, level), [domain, level]);

  const [sections, setSections] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [autoNotes, setAutoNotes] = useState("");
  const [error, setError] = useState("");

  const [moduleStatus, setModuleStatus] = useState({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/courses/${domain}/${level}/merged`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Course load failed: ${res.status} ${txt}`);
        }

        const data = await res.json();
        if (!data.success) throw new Error("Invalid course response");

        const items = Array.isArray(data.items) ? data.items : [];

        const pres = await fetch(
          `${import.meta.env.VITE_API_URL}/api/progress/${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const pjson = pres.ok
          ? await pres.json()
          : { success: true, progress: [], moduleStatus: {}, finalCompleted: false };

        const progressMap = normalizeProgress(pjson.progress || []);

        const dbModuleStatus = pjson.moduleStatus || {};
        if (mounted) setModuleStatus(dbModuleStatus);

        const builtSections = items.map((step) => {
          const topicId = buildTopicId(step.sequenceNumber);
          const lessons = [];

          (step.videos || []).forEach((video, vidx) => {
            lessons.push({
              id: `${step.sequenceNumber}-V${vidx + 1}`,
              title: video.title || step.title,
              url: convertToEmbed(video.url || ""),
              type: "video",
              status: "locked",
              topicId,
              videoIndex: vidx,
            });
          });

          (step.resources || []).forEach((file, ridx) => {
            lessons.push({
              id: `${step.sequenceNumber}-R${ridx + 1}`,
              title: file.title || step.title,
              resource: file.url || file,
              type: "reading",
              status: "locked",
              topicId,
              videoIndex: null,
            });
          });

          return {
            id: String(step.sequenceNumber),
            title: step.title,
            expanded: false,
            lessons,
          };
        });

        for (let i = 0; i < builtSections.length; i++) {
          const sec = builtSections[i];
          const isFirstModule = i === 0;
          const prevModuleId = i > 0 ? builtSections[i - 1].id : null;
          const prevTestPassed = prevModuleId
            ? dbModuleStatus[prevModuleId] === "completed"
            : false;

          const isUnlocked = isFirstModule || prevTestPassed;

          if (isUnlocked) {
            let firstVideoUnlocked = false;
            sec.lessons = sec.lessons.map((lesson) => {
              if (!firstVideoUnlocked && lesson.type === "video") {
                firstVideoUnlocked = true;
                return { ...lesson, status: "current" };
              }
              return lesson;
            });
          }
        }

        let initialActive = null;

        for (const sec of builtSections) {
          const p = progressMap.get(sec.id);
          if (!p) continue;

          for (const lesson of sec.lessons) {
            if (lesson.type === "video" && lesson.videoIndex != null) {
              const isDone = p.videoProgress.get(lesson.videoIndex);
              if (isDone) lesson.status = "completed";
            }
          }

          const currentIdx = Number.isFinite(p.currentIndex) ? p.currentIndex : 0;
          const currentVideoLesson = sec.lessons.find(
            (l) => l.type === "video" && l.videoIndex === currentIdx
          );

          if (currentVideoLesson) {
            currentVideoLesson.status =
              currentVideoLesson.status === "completed" ? "completed" : "current";

            if (!initialActive) {
              initialActive = currentVideoLesson;
              sec.expanded = true;
            }
          }
        }

        if (!initialActive && builtSections[0]?.lessons[0]) {
          builtSections[0].expanded = true;
          builtSections[0].lessons[0].status = "current";
          initialActive = builtSections[0].lessons[0];
        }

        if (mounted) {
          setSections(builtSections);
          setActiveLesson(initialActive || null);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError(e.message || "Failed to load course");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [domain, level, courseId]);

  const flatLessons = () => sections.flatMap((s) => s.lessons);
  const totalLessons = flatLessons().length || 1;
  const completed = flatLessons().filter((l) => l.status === "completed").length;
  const progress = Math.round((completed / totalLessons) * 100);

  const iconFor = (lesson) => {
    if (lesson.status === "completed")
      return <CheckCircle className="w-5 h-5 text-green" />;
    if (lesson.status === "current")
      return <Play className="w-5 h-5 text-red" />;
    return <Lock className="w-5 h-5 text-foreground/30" />;
  };

  const isSectionCompleted = (section) => {
    const videos = section.lessons.filter((l) => l.type === "video");
    if (videos.length === 0) return false;
    return videos.every((l) => l.status === "completed");
  };

  const allModulesCompleted =
    sections.length > 0 && sections.every(isSectionCompleted);

  const saveProgress = async ({ topicId, videoProgressMap, currentIndex, videoCount }) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${import.meta.env.VITE_API_URL}/api/progress/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          topicId,
          videoProgress: mapToObj(videoProgressMap),
          currentIndex,
          videoCount, 
        }),
      });
    } catch (e) {
      console.error("Progress save error:", e);
    }
  };

  const completeCurrentLesson = async () => {
    if (!activeLesson) return;

    setSections((prev) => {
      const updated = prev.map((sec) => ({
        ...sec,
        lessons: sec.lessons.map((les) =>
          les.id === activeLesson.id ? { ...les, status: "completed" } : les
        ),
      }));

      const all = updated.flatMap((s) => s.lessons);
      const idx = all.findIndex((l) => l.id === activeLesson.id);
      const next = all[idx + 1];

      const currentTopicId = activeLesson.topicId;
      const currentSection = updated.find((s) => s.id === currentTopicId);

      if (currentSection) {
        const videoProgressMap = new Map();
        for (const les of currentSection.lessons) {
          if (les.type === "video" && les.videoIndex != null) {
            videoProgressMap.set(les.videoIndex, les.status === "completed");
          }
        }

        let currentIndex = 0;
        const firstPending = currentSection.lessons.find(
          (l) => l.type === "video" && l.videoIndex != null && l.status !== "completed"
        );

        if (firstPending && typeof firstPending.videoIndex === "number") {
          currentIndex = firstPending.videoIndex;
        } else {
          const keys = [...videoProgressMap.keys()];
          currentIndex = keys.length ? Math.max(...keys) : 0;
        }

        const totalVideosInSection = currentSection.lessons.filter(
          l => l.type === "video" && l.videoIndex != null
        ).length;

        saveProgress({
          topicId: currentTopicId,
          videoProgressMap,
          currentIndex,
          videoCount: totalVideosInSection,
        });
      }

      if (next && next.status === "locked") {
        const nextModuleId = next.topicId;
        const currentModuleId = currentTopicId;

        if (nextModuleId === currentModuleId) {
          updated.forEach((sec) => {
            sec.lessons = sec.lessons.map((l) =>
              l.id === next.id ? { ...l, status: "current" } : l
            );
            if (sec.lessons.some((l) => l.id === next.id)) sec.expanded = true;
          });
          setTimeout(() => setActiveLesson(next), 0);
        } else {
          const testPassed = moduleStatus[currentModuleId] === "completed";

          if (!testPassed) {
            alert("Complete the module test to unlock the next module.");
            setTimeout(() => setActiveLesson(activeLesson), 0);
            return updated;
          }

          updated.forEach((sec) => {
            sec.lessons = sec.lessons.map((l) =>
              l.id === next.id ? { ...l, status: "current" } : l
            );
            if (sec.lessons.some((l) => l.id === next.id)) sec.expanded = true;
          });
          setTimeout(() => setActiveLesson(next), 0);
        }
      } else {
        setTimeout(() => setActiveLesson(activeLesson), 0);
      }

      return updated;
    });

    await updateStudyBuddyContext({
      step: "lesson_completed",
      lessonTitle: activeLesson.title,
      module: activeLesson.topicId,
    });
  };

  useEffect(() => {
    if (!courseId) return;
    refreshModuleStatus();
  }, [location.key]); 

  const refreshModuleStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const pres = await fetch(
        `${import.meta.env.VITE_API_URL}/api/progress/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (pres.ok) {
        const pjson = await pres.json();
        const newStatus = pjson.moduleStatus || {};
        setModuleStatus(newStatus);

        setSections(prev => {
          const updated = prev.map((sec, i) => {
            const isFirst  = i === 0;
            const prevSec  = i > 0 ? prev[i - 1] : null;
            const unlocked = isFirst || (prevSec && newStatus[prevSec.id] === "completed");

            if (!unlocked) return sec;

            const hasUnlocked = sec.lessons.some(l => l.status !== "locked");
            if (hasUnlocked) return sec;

            let firstDone = false;
            return {
              ...sec,
              lessons: sec.lessons.map(l => {
                if (!firstDone && l.type === "video") {
                  firstDone = true;
                  return { ...l, status: "current" };
                }
                return l;
              }),
            };
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("moduleStatus refresh error:", e);
    }
  };

  const generateNotes = async () => {
    if (!activeLesson?.title) return;
    setNotesLoading(true);
    setAutoNotes("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoTitle: activeLesson.title }),
      });
      const data = await res.json();
      if (data.success) setAutoNotes(data.notes);
    } catch (e) {
      console.error(e);
    } finally {
      setNotesLoading(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><p className="text-foreground/70 font-medium">Loading…</p></div>;
  if (error) return <div className="p-10 flex justify-center"><p className="text-red font-medium">{error}</p></div>;

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden bg-cream/20 font-sans mt-3">
      <div className="flex-1 flex flex-col overflow-hidden px-4 md:px-8 pb-8">
        
        {/* Header box */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-cream shadow-sm mb-6 shrink-0 transition-shadow hover:shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <BookOpen className="w-6 h-6 text-red" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {toTitleCase(domain)} <span className="text-foreground/50 text-2xl font-semibold">({cap1(level)})</span>
                </h1>
              </div>
              <p className="text-foreground/60 font-medium ml-9">
                Dynamic adaptive syllabus.
              </p>
            </div>
            <div className="md:w-1/3">
               <ProgressBar progress={progress} colorClass="bg-red" showLabel={true} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
          {activeLesson?.type === "video" ? (
            <div className="aspect-video w-full rounded-3xl overflow-hidden bg-foreground shadow-lg border-4 border-white">
              <iframe
                width="100%"
                height="100%"
                src={activeLesson.url}
                allowFullScreen
                title="Lesson video"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-video bg-white border border-cream rounded-3xl flex flex-col items-center justify-center shadow-inner">
              <div className="w-20 h-20 bg-cream/50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 text-red" />
              </div>
              <p className="text-xl font-bold text-foreground">Reading Material</p>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              className="px-8 py-3 bg-red text-white font-bold rounded-xl shadow-md hover:bg-red/90 transition-all hover:-translate-y-0.5" 
              onClick={completeCurrentLesson}
            >
              Mark as Completed <CheckCircle className="w-5 h-5 ml-2 inline-block" />
            </button>
          </div>

          <Tabs defaultValue="overview" className="mt-8">
            <TabsList className="bg-cream/50 p-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-red data-[state=active]:shadow-sm transition-all px-6 py-2.5">Overview</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-yellow data-[state=active]:shadow-sm transition-all px-6 py-2.5">AI Notes ✨</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="p-8 border border-cream rounded-3xl mt-4 bg-white shadow-sm">
                <h2 className="font-bold text-2xl text-foreground mb-4">{activeLesson?.title || "Lesson Overview"}</h2>
                <p className="text-foreground/60 leading-relaxed font-medium">Pay close attention to this material—it's essential to pass the module test.</p>
                {activeLesson?.resource && (
                  <div className="mt-6">
                    <a href={activeLesson.resource} target="_blank" rel="noreferrer">
                      <button className="px-6 py-3 bg-cream/50 text-foreground font-bold rounded-xl border border-cream hover:bg-cream hover:border-yellow transition-all flex items-center">
                        <Download className="w-5 h-5 mr-3" /> Download Resource
                      </button>
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="mt-4 p-8 border border-cream rounded-3xl bg-white shadow-sm">
                <button 
                  className={`px-6 py-3 font-bold rounded-xl shadow-sm transition-all flex items-center border-2 border-yellow text-yellow bg-white hover:bg-yellow/10`} 
                  onClick={generateNotes} disabled={notesLoading}
                >
                  {notesLoading ? (
                    <LoaderCircle className="w-5 h-5 animate-spin mr-3 text-current" />
                  ) : null}
                  {notesLoading ? "Generating..." : "✨ Ask AI to Generate Notes"}
                </button>
                {autoNotes && (
                  <div className="mt-8 p-6 bg-cream/20 rounded-2xl border border-cream prose prose-slate max-w-none prose-headings:text-foreground prose-a:text-red">
                    <ReactMarkdown>{autoNotes}</ReactMarkdown>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sidebar Course Content */}
      <div className="w-96 bg-white border-l border-cream shadow-sm overflow-y-auto px-6 py-8 rounded-tl-3xl custom-scrollbar hidden xl:block">
        <h2 className="text-2xl font-bold mb-6 text-foreground tracking-tight px-2">Syllabus</h2>

        {sections.map((section, sIdx) => {
          const isFirstModule = sIdx === 0;
          const prevSection   = sIdx > 0 ? sections[sIdx - 1] : null;
          const prevPassed    = prevSection
            ? moduleStatus[prevSection.id] === "completed"
            : false;
          const isLocked = !isFirstModule && !prevPassed;

          const isActiveModule = section.lessons.some(l => l.id === activeLesson?.id);

          return (
            <div key={section.id} className={`border-2 rounded-2xl mb-4 transition-all overflow-hidden ${isActiveModule ? "border-red/30 shadow-sm" : "border-cream"}`}>
              <button
                onClick={() =>
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === section.id ? { ...s, expanded: !s.expanded } : s
                    )
                  )
                }
                className={`w-full flex justify-between items-center p-5 transition-colors ${isActiveModule ? "bg-red/5" : "hover:bg-cream/30"}`}
              >
                <div className="flex items-center gap-3">
                  {isLocked && <Lock className="w-5 h-5 text-foreground/30" />}
                  <span className={`font-bold text-left ${isLocked ? "text-foreground/50" : "text-foreground"}`}>{section.title}</span>
                </div>
                {section.expanded ? <ChevronDown className="w-5 h-5 text-foreground/50" /> : <ChevronRight className="w-5 h-5 text-foreground/50" />}
              </button>

              {section.expanded && (
                <div className="bg-white pb-3 pt-1 border-t border-cream/50">
                  {section.lessons.map((lesson) => {
                      const isActivityActive = activeLesson?.id === lesson.id;
                      return (
                      <button
                        key={lesson.id}
                        onClick={() =>
                          lesson.status !== "locked" && setActiveLesson(lesson)
                        }
                        disabled={lesson.status === "locked"}
                        className={`w-full flex items-center px-6 py-3.5 space-x-4 text-left transition-colors relative ${
                          isActivityActive ? "bg-cream/50" : "hover:bg-cream/20"
                        } ${
                          lesson.status === "locked"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isActivityActive && <div className="absolute left-0 top-0 h-full w-1 bg-red rounded-r-md"></div>}
                        <div className="flex-shrink-0 bg-white shadow-xs p-1.5 rounded-lg border border-cream/50">
                            {iconFor(lesson)}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${isActivityActive ? "text-red font-bold" : "text-foreground/70"}`}>{lesson.title}</p>
                        </div>
                      </button>
                    )
                  })}

                  {/* Take Module Test */}
                  {isSectionCompleted(section) &&
                    moduleStatus[section.id] !== "completed" && (
                      <div className="px-5 mt-4 mb-3">
                        <button
                          onClick={() =>
                            navigate(
                              `/assessment?module=${section.id}&domain=${domain}&level=${level}`
                            )
                          }
                          className="w-full py-3 bg-red text-white font-bold rounded-xl shadow-md hover:bg-red/90 transition-all hover:-translate-y-0.5 tracking-wide"
                        >
                          Take Module Test
                        </button>
                      </div>
                    )}

                  {/* Passed Badge */}
                  {moduleStatus[section.id] === "completed" && (
                    <div className="mx-5 mb-3 mt-4 py-2 px-4 bg-green/10 border border-green/20 text-green font-bold uppercase tracking-wider rounded-xl text-xs text-center flex items-center justify-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> Module test passed
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {allModulesCompleted && (
          <button
            onClick={() =>
              navigate(
                `/assessment?final=true&domain=${domain}&level=${level}`
              )
            }
            className="w-full mt-8 py-4 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl hover:bg-red/90 transition-all transform hover:-translate-y-1"
          >
            🏆 Take Final Test
          </button>
        )}

        <button
          className="hidden"
          id="refresh-module-status"
          onClick={refreshModuleStatus}
        />
      </div>
    </div>
  );
}
