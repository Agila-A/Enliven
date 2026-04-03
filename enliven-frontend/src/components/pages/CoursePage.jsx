/*
  COURSEPAGE.JSX — MODULE LOCKING + MODULE TESTS + FINAL TEST
  
  KEY FIXES:
  1. Module unlock gate now reads moduleStatus from the DB (via /api/progress/:courseId),
     NOT from localStorage — so progress persists after logout/login.
  2. The first module is always unlocked for new users.
  3. Sections correctly start locked except module 1.
  4. "Take Test" only appears when ALL videos in a section are completed.
*/

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Play,
  CheckCircle,
  Lock,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  LoaderCircle,
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
  const location = useLocation();  // FIX: detect navigation back from assessment
  const courseId = useMemo(() => buildCourseId(domain, level), [domain, level]);

  const [sections, setSections] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [autoNotes, setAutoNotes] = useState("");
  const [error, setError] = useState("");

  // BUG FIX: moduleStatus now lives in state (loaded from DB), not localStorage.
  // This is the source of truth for which modules are unlocked after login.
  const [moduleStatus, setModuleStatus] = useState({}); // { "1": "completed", "2": "completed", ... }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");

        // Fetch course content (merged roadmap + JSON videos)
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

        // Fetch progress from DB (persists across logout/login)
        const pres = await fetch(
          `${import.meta.env.VITE_API_URL}/api/progress/${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const pjson = pres.ok
          ? await pres.json()
          : { success: true, progress: [], moduleStatus: {}, finalCompleted: false };

        const progressMap = normalizeProgress(pjson.progress || []);

        // BUG FIX: load moduleStatus from DB response (not localStorage)
        const dbModuleStatus = pjson.moduleStatus || {};
        if (mounted) setModuleStatus(dbModuleStatus);

        // Build sections
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

        // BUG FIX: determine which modules are unlocked using DB moduleStatus.
        // Module 1 is always unlocked.
        // Module N is unlocked only if module N-1's test is "completed" in DB.
        for (let i = 0; i < builtSections.length; i++) {
          const sec = builtSections[i];
          const isFirstModule = i === 0;
          const prevModuleId = i > 0 ? builtSections[i - 1].id : null;
          const prevTestPassed = prevModuleId
            ? dbModuleStatus[prevModuleId] === "completed"
            : false;

          const isUnlocked = isFirstModule || prevTestPassed;

          if (isUnlocked) {
            // Unlock the first video in this section
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

        // Overlay saved progress on top of the unlock state
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

        // Default: open the first lesson of module 1 if nothing is in progress
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
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (lesson.status === "current")
      return <Play className="w-5 h-5 text-blue-500" />;
    return <Lock className="w-5 h-5 text-gray-400" />;
  };

  const isSectionCompleted = (section) => {
    const videos = section.lessons.filter((l) => l.type === "video");
    if (videos.length === 0) return false;
    return videos.every((l) => l.status === "completed");
  };

  const allModulesCompleted =
    sections.length > 0 && sections.every(isSectionCompleted);

  // Save video progress to DB
  // FIX: also send videoCount (total videos in this topic) so dashboard
  // can calculate accurate overall progress % across all modules.
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
          videoCount, // real total for this topic from merged course content
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

      // Save video progress to DB
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

        // Count total videos in this section from the lessons array
        const totalVideosInSection = currentSection.lessons.filter(
          l => l.type === "video" && l.videoIndex != null
        ).length;

        saveProgress({
          topicId: currentTopicId,
          videoProgressMap,
          currentIndex,
          videoCount: totalVideosInSection, // FIX: send real total
        });
      }

      // Unlock next lesson within same module
      if (next && next.status === "locked") {
        const nextModuleId = next.topicId;
        const currentModuleId = currentTopicId;

        if (nextModuleId === currentModuleId) {
          // Next video is in same module — unlock it
          updated.forEach((sec) => {
            sec.lessons = sec.lessons.map((l) =>
              l.id === next.id ? { ...l, status: "current" } : l
            );
            if (sec.lessons.some((l) => l.id === next.id)) sec.expanded = true;
          });
          setTimeout(() => setActiveLesson(next), 0);
        } else {
          // BUG FIX: check DB moduleStatus (in state), not localStorage
          const testPassed = moduleStatus[currentModuleId] === "completed";

          if (!testPassed) {
            alert("Complete the module test to unlock the next module.");
            setTimeout(() => setActiveLesson(activeLesson), 0);
            return updated;
          }

          // Module test passed — unlock first lesson of next module
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

  // FIX: whenever the user navigates back to this page (e.g. from AssessmentPage),
  // re-fetch moduleStatus from the DB so newly-passed modules unlock immediately.
  // This runs on every location.key change (every navigation to this page).
  useEffect(() => {
    if (!courseId) return;
    refreshModuleStatus();
  }, [location.key]); // eslint-disable-line

  // Called when the user returns from the assessment page after passing a module test.
  // We refresh moduleStatus from the DB so the next module unlocks immediately.
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

        // FIX: also unlock sections in state based on new moduleStatus
        // so lessons become clickable without a full page reload
        setSections(prev => {
          const updated = prev.map((sec, i) => {
            const isFirst  = i === 0;
            const prevSec  = i > 0 ? prev[i - 1] : null;
            const unlocked = isFirst || (prevSec && newStatus[prevSec.id] === "completed");

            if (!unlocked) return sec; // still locked — no change

            // Already has unlocked lessons — don't reset their status
            const hasUnlocked = sec.lessons.some(l => l.status !== "locked");
            if (hasUnlocked) return sec;

            // Unlock first video in this section
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

  if (loading) return <p className="p-10 text-center">Loading…</p>;
  if (error) return <p className="p-10 text-red-600">{error}</p>;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-card p-6 border-b">
          <h1 className="text-2xl font-bold">
            {toTitleCase(domain)} ({cap1(level)})
          </h1>
          <p className="text-muted-foreground">
            Personalized course content based on your roadmap.
          </p>
          <div className="mt-4">
            <ProgressBar progress={progress} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeLesson?.type === "video" ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                width="100%"
                height="100%"
                src={activeLesson.url}
                allowFullScreen
                title="Lesson video"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 text-white rounded-xl flex items-center justify-center">
              <FileText className="w-10 h-10 mr-2" /> Reading Material
            </div>
          )}

          <Button className="mt-4" onClick={completeCurrentLesson}>
            Mark as Completed
          </Button>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notes">AI Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="p-4 border rounded-xl mt-4 bg-card">
                <h2 className="font-semibold text-xl">{activeLesson?.title}</h2>
                {activeLesson?.resource && (
                  <div className="mt-4">
                    <a href={activeLesson.resource} target="_blank" rel="noreferrer">
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" /> Download Resource
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="mt-4 p-4 border rounded-xl bg-card">
                <Button onClick={generateNotes} disabled={notesLoading}>
                  {notesLoading ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : (
                    "✨ Generate Notes"
                  )}
                </Button>
                {autoNotes && (
                  <div className="mt-4 prose">
                    <ReactMarkdown>{autoNotes}</ReactMarkdown>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-card border-l overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Course Content</h2>

        {sections.map((section, sIdx) => {
          // FIX: derive lock state from DB moduleStatus at render time
          // so it updates immediately when refreshModuleStatus() is called.
          // Module 1 is always unlocked.
          // Module N is unlocked only if module N-1's test is "completed" in DB.
          const isFirstModule = sIdx === 0;
          const prevSection   = sIdx > 0 ? sections[sIdx - 1] : null;
          const prevPassed    = prevSection
            ? moduleStatus[prevSection.id] === "completed"
            : false;
          const isLocked = !isFirstModule && !prevPassed;

          return (
            <div key={section.id} className="border rounded-lg mb-2">
              <button
                onClick={() =>
                  setSections((prev) =>
                    prev.map((s) =>
                      s.id === section.id ? { ...s, expanded: !s.expanded } : s
                    )
                  )
                }
                className="w-full flex justify-between items-center p-4"
              >
                <div className="flex items-center gap-2">
                  {isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                  <span className="font-semibold text-left">{section.title}</span>
                </div>
                {section.expanded ? <ChevronDown /> : <ChevronRight />}
              </button>

              {section.expanded && (
                <div>
                  {section.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() =>
                        lesson.status !== "locked" && setActiveLesson(lesson)
                      }
                      disabled={lesson.status === "locked"}
                      className={`w-full flex items-center p-4 space-x-3 text-left ${
                        activeLesson?.id === lesson.id ? "bg-primary/10" : ""
                      } ${
                        lesson.status === "locked"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {iconFor(lesson)}
                      <div className="flex-1">
                        <p className="font-medium">{lesson.title}</p>
                      </div>
                    </button>
                  ))}

                  {/* Take Test button — only after ALL videos in this module are done */}
                  {isSectionCompleted(section) &&
                    moduleStatus[section.id] !== "completed" && (
                      <button
                        onClick={() =>
                          navigate(
                            `/assessment?module=${section.id}&domain=${domain}&level=${level}`
                          )
                        }
                        className="w-full mt-3 mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Take Module Test
                      </button>
                    )}

                  {/* Show passed badge if module test is done */}
                  {moduleStatus[section.id] === "completed" && (
                    <div className="mx-4 mb-4 py-2 px-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center">
                      ✅ Module test passed
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
            className="w-full mt-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
          >
            🏆 Take Final Test
          </button>
        )}

        {/* Hidden refresh trigger — called after returning from assessment */}
        <button
          className="hidden"
          id="refresh-module-status"
          onClick={refreshModuleStatus}
        />
      </div>
    </div>
  );
}
