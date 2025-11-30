import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Play,
  CheckCircle,
  Circle,
  Lock,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText
} from "lucide-react";

import { useParams } from "react-router-dom";
import { Button } from "../ui/button";
import { ProgressBar } from "../ProgressBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

export default function CoursePage() {
  const { domain, level } = useParams();
  const [course, setCourse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  const [notes, setNotes] = useState("");
  const [autoNotes, setAutoNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/courses/${domain}/${level}/merged`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();
        if (!data.success) return;

        const builtSections = data.items.map((step) => {
          const lessons = [];

          // Convert raw links → embeddable links
          (step.links || []).forEach((link, idx) => {
            lessons.push({
              id: `${step.sequenceNumber}-${idx + 1}`,
              title: step.title,
              url: convertToEmbed(link),
              type: "video",
              status: idx === 0 ? "current" : "locked",
            });
          });

          // Reading PDFs
          (step.resources || []).forEach((file, idx) => {
            lessons.push({
              id: `${step.sequenceNumber}-R${idx + 1}`,
              title: step.title,
              resource: file,
              type: "reading",
              status: "locked",
            });
          });

          return {
            id: step.sequenceNumber,
            title: step.title,
            expanded: true,
            lessons,
          };
        });

        setCourse(builtSections);

        if (builtSections[0]?.lessons[0]) {
          setActiveLesson(builtSections[0].lessons[0]);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [domain, level]);

  /** Convert normal YouTube links → embed URLs */
  const convertToEmbed = (url) => {
    if (url.includes("watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be")) {
      const id = url.split("youtu.be/")[1];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  /** Mark current lesson as completed + unlock next lesson */
  const completeLesson = () => {
    setCourse((prev) => {
      const updated = [...prev];

      for (let s of updated) {
        for (let i = 0; i < s.lessons.length; i++) {
          if (s.lessons[i].id === activeLesson.id) {
            s.lessons[i].status = "completed";

            // Unlock next lesson
            if (s.lessons[i + 1]) {
              s.lessons[i + 1].status = "current";
            }
          }
        }
      }
      return updated;
    });
  };

  /** Auto Notes Generator — calls backend */
  const generateNotes = async () => {
    if (!activeLesson?.title) return;

    setGenerating(true);
    setAutoNotes("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ videoTitle: activeLesson.title }),
      });

      const data = await res.json();
      if (data.success) {
        setAutoNotes(data.notes);
      }
    } catch (err) {
      console.error(err);
    }

    setGenerating(false);
  };

  if (loading) return <p className="text-center p-10">Loading…</p>;

  const totalLessons = course.reduce((a, b) => a + b.lessons.length, 0);
  const completed = course.reduce(
    (a, b) => a + b.lessons.filter((l) => l.status === "completed").length,
    0
  );

  const progress = Math.round((completed / totalLessons) * 100);

  const getIcon = (lesson) => {
    switch (lesson.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "current":
        return <Play className="w-5 h-5 text-blue-500" />;
      default:
        return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* LEFT — MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-card p-6 border-b">
          <h1 className="text-2xl font-bold">
            {domain.replace("-", " ")} ({level})
          </h1>

          <p className="text-muted-foreground">
            Personalized course content based on your roadmap.
          </p>

          <div className="mt-4">
            <ProgressBar progress={progress} />
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeLesson?.type === "video" ? (
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={activeLesson.url}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 text-white flex items-center justify-center">
              <FileText className="w-10 h-10 mr-2" /> Reading Material
            </div>
          )}

          <Button
            className="mt-4"
            onClick={completeLesson}
          >
            Mark as Completed
          </Button>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notes">My Notes</TabsTrigger>
              <TabsTrigger value="auto">AI Notes</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview">
              <div className="p-4 border rounded-xl mt-4 bg-card">
                <h2 className="font-bold text-xl">{activeLesson?.title}</h2>

                {activeLesson?.resource && (
                  <div className="mt-4">
                    <a href={activeLesson.resource} target="_blank">
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* MY NOTES */}
            <TabsContent value="notes">
              <textarea
                className="w-full h-64 p-4 border rounded-xl mt-4 bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </TabsContent>

            {/* AI NOTES */}
            <TabsContent value="auto">
              <div className="mt-4 p-4 border rounded-xl bg-card">
                <Button onClick={generateNotes} disabled={generating}>
                  {generating ? "Generating..." : "✨ Generate Notes"}
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

      {/* RIGHT — SIDEBAR */}
      <div className="w-96 border-l p-6 overflow-y-auto bg-card">
        <h2 className="text-xl font-semibold mb-4">Course Content</h2>

        {course.map((sec) => (
          <div key={sec.id} className="border rounded-xl mb-2">
            <button
              onClick={() =>
                setCourse((prev) =>
                  prev.map((s) =>
                    s.id === sec.id ? { ...s, expanded: !s.expanded } : s
                  )
                )
              }
              className="w-full flex justify-between p-4"
            >
              <span className="font-semibold">{sec.title}</span>
              {sec.expanded ? <ChevronDown /> : <ChevronRight />}
            </button>

            {sec.expanded && (
              <div>
                {sec.lessons.map((l) => (
                  <button
                    key={l.id}
                    disabled={l.status === "locked"}
                    onClick={() => setActiveLesson(l)}
                    className={`w-full flex p-4 space-x-3 text-left ${
                      activeLesson?.id === l.id ? "bg-primary/10" : ""
                    } ${l.status === "locked" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {getIcon(l)}

                    <div>
                      <p className="font-medium">{l.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
