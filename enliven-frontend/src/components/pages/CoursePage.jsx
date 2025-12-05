/*  
  COURSEPAGE.JSX — MODULE LOCKING + MODULE TESTS + FINAL TEST
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
  LoaderCircle
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { updateStudyBuddyContext } from "../../utils/studyBuddy.js";

const toTitleCase = (s = "") =>
  s
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
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
      currentIndex: Number(p.currentIndex ?? 0)
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
  const courseId = useMemo(() => buildCourseId(domain, level), [domain, level]);

  const [sections, setSections] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [autoNotes, setAutoNotes] = useState("");
  const [error, setError] = useState("");

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

        const pjson = pres.ok ? await pres.json() : { success: true, progress: [] };
        const progressMap = normalizeProgress(pjson.progress || []);

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
              videoIndex: vidx
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
              videoIndex: null
            });
          });

          return {
            id: String(step.sequenceNumber),
            title: step.title,
            expanded: false,
            lessons
          };
        });

        // UNLOCK NEXT MODULES (if previous module test is done)
        for (let i = 0; i < builtSections.length; i++) {
          const sec = builtSections[i];
          const prevModuleId = builtSections[i - 1]?.id;

          if (!prevModuleId) continue;

          const testKey = `test-${domain}-${level}-${prevModuleId}`;
          const testDone = localStorage.getItem(testKey) === "done";

          if (testDone) {
            sec.expanded = true;

            let unlocked = false;
            sec.lessons = sec.lessons.map((lesson) => {
              if (!unlocked && lesson.type === "video") {
                unlocked = true;
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
              currentVideoLesson.status === "completed"
                ? "completed"
                : "current";

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
    return () => {
      mounted = false;
    };
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

  const saveProgress = async ({ topicId, videoProgressMap, currentIndex }) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${import.meta.env.VITE_API_URL}/api/progress/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          topicId,
          videoProgress: mapToObj(videoProgressMap),
          currentIndex
        })
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
        )
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
          (l) =>
            l.type === "video" &&
            l.videoIndex != null &&
            l.status !== "completed"
        );

        if (firstPending && typeof firstPending.videoIndex === "number") {
          currentIndex = firstPending.videoIndex;
        } else {
          const keys = [...videoProgressMap.keys()];
          currentIndex = keys.length ? Math.max(...keys) : 0;
        }

        saveProgress({
          topicId: currentTopicId,
          videoProgressMap,
          currentIndex
        });
      }

      // ====== FIXED MODULE UNLOCK BLOCK ======
      if (next && next.status === "locked") {
        const nextModuleId = next.topicId;
        const currentModuleId = currentTopicId;

        if (nextModuleId === currentModuleId) {
          updated.forEach((sec) => {
            sec.lessons = sec.lessons.map((l) =>
              l.id === next.id ? { ...l, status: "current" } : l
            );
          });

          updated.forEach((sec) => {
            if (sec.lessons.some((l) => l.id === next.id))
              sec.expanded = true;
          });

          setTimeout(() => setActiveLesson(next), 0);
        } else {
          const testKey = `test-${domain}-${level}-${currentModuleId}`;
          let testDone = localStorage.getItem(testKey) === "done";

          if (!testDone) {
            testDone = localStorage.getItem(testKey) === "done";
          }

          if (!testDone) {
            alert("Please take the module test to unlock the next module.");
            setTimeout(() => setActiveLesson(activeLesson), 0);
            return updated;
          }

          updated.forEach((sec) => {
            sec.lessons = sec.lessons.map((l) =>
              l.id === next.id ? { ...l, status: "current" } : l
            );
          });

          updated.forEach((sec) => {
            if (sec.lessons.some((l) => l.id === next.id))
              sec.expanded = true;
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
      module: activeLesson.topicId
    });
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ videoTitle: activeLesson.title })
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
                <h2 className="font-semibold text-xl">
                  {activeLesson?.title}
                </h2>
                {activeLesson?.resource && (
                  <div className="mt-4">
                    <a
                      href={activeLesson.resource}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" /> Download
                        Resource
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

      <div className="w-96 bg-card border-l overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Course Content</h2>

        {sections.map((section) => (
          <div key={section.id} className="border rounded-lg mb-2">
            <button
              onClick={() =>
                setSections((prev) =>
                  prev.map((s) =>
                    s.id === section.id
                      ? { ...s, expanded: !s.expanded }
                      : s
                  )
                )
              }
              className="w-full flex justify-between p-4"
            >
              <span className="font-semibold">{section.title}</span>
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

                {isSectionCompleted(section) && (
                  <button
                    onClick={() =>
                      navigate(
                        `/assessment?module=${section.id}&domain=${domain}&level=${level}`
                      )
                    }
                    className="w-full mt-3 mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Take Test
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {allModulesCompleted && (
          <button
            onClick={() =>
              navigate(`/assessment?final=true&domain=${domain}&level=${level}`)
            }
            className="w-full mt-6 py-3 bg-purple-600 text-white rounded-xl"
          >
            Take Final Test
          </button>
        )}
      </div>
    </div>
  );
}
