import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Code,
  ShieldCheck,
  Bot
} from "lucide-react";
import { ProgressBar } from "../ProgressBar";

const toTitleCase = (s = "") =>
  s.replace(/-/g, " ").split(" ").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const cap1 = (s = "") => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const toSlug = s => String(s || "").toLowerCase().replace(/\s+/g, "-");
const toLevel = s => String(s || "").replace(/[^a-zA-Z\s]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export default function CoursePage() {
  const { domain, level } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = useMemo(() => `${toSlug(domain)}-${toLevel(level)}`, [domain, level]);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [moduleStatus, setModuleStatus] = useState({});
  const [progressData, setProgressData] = useState([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const [roadmapRes, progressRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/progress/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!roadmapRes.ok) throw new Error("Failed to load roadmap");
      const roadmapData = await roadmapRes.json();
      
      if (roadmapData.success && roadmapData.roadmap) {
        setTopics(roadmapData.roadmap.topics || []);
      }

      if (progressRes.ok) {
        const pjson = await progressRes.json();
        setModuleStatus(pjson.moduleStatus || {});
        setProgressData(pjson.progress || []);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [domain, level, courseId, location.key]);

  const handleStudyWithAI = async (topic) => {
    try {
      const token = localStorage.getItem("token");
      const topicId = String(topic.sequenceNumber);
      await fetch(`${import.meta.env.VITE_API_URL}/api/progress/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          topicId,
          studyStarted: true,
        }),
      });
      await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/context/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          event: "study_started",
          currentModule: topicId,
          currentModuleTitle: topic.title,
          domain: domain,
          skillLevel: level,
          moduleStatus: moduleStatus
        }),
      });
      navigate(`/study-buddy?module=${topic.sequenceNumber}&moduleTitle=${encodeURIComponent(topic.title)}&domain=${domain}&level=${level}`);
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  };

  const handleTakeTest = (topic) => {
    navigate(`/assessment?module=${topic.sequenceNumber}&domain=${domain}&level=${level}&moduleTitle=${encodeURIComponent(topic.title)}`);
  };

  const handleProjectSubmission = (topic) => {
    const isFinal = topic.sequenceNumber === "final" || topic.isFinal;
    const moduleId = isFinal ? "final" : topic.sequenceNumber;
    navigate(`/project/${domain}/${level}/${moduleId}?moduleTitle=${encodeURIComponent(topic.title)}`);
  };



  if (loading) return <div className="p-10 flex justify-center"><p className="text-foreground/70 font-medium">Loading…</p></div>;
  if (error) return <div className="p-10 flex justify-center"><p className="text-red font-medium">{error}</p></div>;

  const totalModules = topics.length;
  const passedModules = Object.values(moduleStatus).filter(v => v === "completed").length;
  const progressPercent = totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-cream/20 font-sans mt-3 px-4 md:px-8 pb-10">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-cream shadow-sm mb-8 transition-shadow hover:shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <BookOpen className="w-6 h-6 text-red" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {toTitleCase(domain)} <span className="text-foreground/50 text-2xl font-semibold">({cap1(level)})</span>
              </h1>
            </div>
            <p className="text-foreground/60 font-medium ml-9">
              Interactive AI Learning Modules
            </p>
          </div>
          <div className="md:w-1/3">
             <ProgressBar progress={progressPercent} colorClass="bg-red" showLabel={true} />
             <p className="text-sm font-bold text-foreground/50 text-right mt-1">{passedModules} / {totalModules} Modules Passed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic, i) => {
          const topicId = String(topic.sequenceNumber);
          const isFirst = i === 0;
          const prevTopicId = i > 0 ? String(topics[i-1].sequenceNumber) : null;
          const prevPassed = prevTopicId ? moduleStatus[prevTopicId] === "completed" : false;
          
          const isLocked = !isFirst && !prevPassed;
          const testPassed = moduleStatus[topicId] === "completed";
          const progressEntry = progressData.find(p => String(p.topicId) === topicId);
          const studyStarted = progressEntry?.studyStarted === true;

          return (
            <div key={topicId} className={`bg-white rounded-3xl border-2 p-6 flex flex-col justify-between transition-all shadow-sm ${
              isLocked ? "border-cream/50 opacity-70" : testPassed ? "border-green/50" : "border-cream hover:border-red hover:shadow-md"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-foreground/50 uppercase tracking-widest">Step {topic.sequenceNumber}</span>
                  {isLocked ? (
                    <span className="flex items-center text-xs font-bold text-foreground/40 bg-cream/30 px-3 py-1 rounded-full"><Lock className="w-3 h-3 mr-1"/> Locked</span>
                  ) : testPassed ? (
                    <span className="flex items-center text-xs font-bold text-green bg-green/10 px-3 py-1 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1"/> Passed</span>
                  ) : moduleStatus[topicId] === "coding_passed" ? (
                    <span className="flex items-center text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">Coding Passed</span>
                  ) : moduleStatus[topicId] === "mcq_passed" ? (
                    <span className="flex items-center text-xs font-bold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">MCQ Passed</span>
                  ) : studyStarted ? (
                    <span className="flex items-center text-xs font-bold text-red bg-red/10 px-3 py-1 rounded-full">Study Started</span>
                  ) : null}
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isLocked ? "text-foreground/60" : "text-foreground"}`}>{topic.title}</h3>
                {topic.description && (
                  <p className="text-foreground/60 text-sm font-medium mb-6 line-clamp-3">{topic.description}</p>
                )}
              </div>
              
              <div className="space-y-3 mt-4">
                {isLocked ? (
                  <div className="text-center py-3 text-sm font-semibold text-foreground/40 border-2 border-dashed border-cream/50 rounded-xl">
                    Pass previous test to unlock
                  </div>
                ) : testPassed ? (
                  <button 
                    onClick={() => handleStudyWithAI(topic)}
                    className="w-full py-3 bg-cream text-foreground font-bold rounded-xl hover:bg-cream/70 transition-all flex items-center justify-center gap-2"
                  >
                    <Bot size={18} /> Review with AI
                  </button>
                ) : moduleStatus[topicId] === "coding_passed" ? (
                  <>
                    <button 
                      onClick={() => handleProjectSubmission(topic)}
                      className="w-full py-3 bg-red text-white font-bold rounded-xl hover:bg-red/90 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Code size={18} /> Submit Project
                    </button>
                    <button 
                      onClick={() => handleStudyWithAI(topic)}
                      className="w-full py-3 bg-cream text-foreground font-bold rounded-xl hover:bg-cream/70 transition-all flex items-center justify-center gap-2"
                    >
                      <Bot size={18} /> Review with AI
                    </button>
                  </>
                ) : moduleStatus[topicId] === "mcq_passed" ? (
                  <>
                    <button 
                      onClick={() => navigate(`/coding-assessment?module=${topic.sequenceNumber}&domain=${domain}&level=${level}`)}
                      className="w-full py-3 bg-red text-white font-bold rounded-xl hover:bg-red/90 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Code size={18} /> Take Coding Test
                    </button>
                    <button 
                      onClick={() => handleStudyWithAI(topic)}
                      className="w-full py-3 bg-cream text-foreground font-bold rounded-xl hover:bg-cream/70 transition-all flex items-center justify-center gap-2"
                    >
                      <Bot size={18} /> {studyStarted ? "Continue with AI" : "Study with AI"}
                    </button>
                    <button 
                      onClick={() => handleProjectSubmission(topic)}
                      className="w-full py-3 bg-white text-foreground border-2 border-cream font-bold rounded-xl hover:bg-cream/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Code size={18} /> Submit Project
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleStudyWithAI(topic)}
                      className="w-full py-3 bg-red text-white font-bold rounded-xl hover:bg-red/90 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Bot size={18} /> {studyStarted ? "Continue with AI" : "Study with AI"}
                    </button>
                    <button 
                      onClick={() => handleTakeTest(topic)}
                      className="w-full py-3 bg-white text-red border-2 border-red font-bold rounded-xl hover:bg-red/5 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={18} /> Take Test
                    </button>
                    <button 
                      onClick={() => handleProjectSubmission(topic)}
                      className="w-full py-3 bg-white text-foreground border-2 border-cream font-bold rounded-xl hover:bg-cream/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Code size={18} /> Submit Project
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

        {passedModules === totalModules && totalModules > 0 && (
          <div className="bg-gradient-to-br from-red to-red-700 rounded-3xl border-2 border-red/20 p-8 flex flex-col justify-between transition-all shadow-xl text-white col-span-full mt-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black uppercase tracking-[0.3em] opacity-80">Final Stage</span>
                <span className="flex items-center text-xs font-black bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md">⭐ Certification Path</span>
              </div>
              <h3 className="text-3xl font-black mb-3">Final Certification Project</h3>
              <p className="text-white/80 text-sm font-bold mb-8 max-w-2xl leading-relaxed">
                Congratulations! You've mastered all modules. Now, implement your final project to showcase your skills. 
                This project will be reviewed by a human mentor for official certification.
              </p>
            </div>
            
            <button 
              onClick={() => handleProjectSubmission({ sequenceNumber: "final", title: "Final Project" })}
              className="w-full md:w-max px-10 py-4 bg-white text-red font-black rounded-2xl hover:bg-cream transition-all shadow-2xl flex items-center justify-center gap-3 transform active:scale-95"
            >
              <Code size={20} /> Begin Final Project Review
            </button>
          </div>
        )}

    </div>
  );
}
