import { useEffect, useState } from "react";
import { Map, Loader2, MapPin, ExternalLink, Compass } from "lucide-react";

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/roadmap/my-roadmap`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setRoadmap(data.roadmap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-red mb-4" />
            <p className="text-foreground/70 font-bold">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-[calc(100vh-6rem)] p-8 flex items-center justify-center font-sans tracking-wide">
        <div className="bg-white border-2 border-cream rounded-[2rem] p-16 max-w-lg w-full text-center shadow-sm">
            <div className="w-24 h-24 bg-cream/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner text-yellow">
                <Map className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">No roadmap found</h2>
            <p className="text-foreground/60 font-medium">
                Generate a roadmap first to see your personalized learning journey here.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream/20 font-sans p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white border-2 border-cream rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[200%] bg-yellow/10 rounded-full blur-3xl transform rotate-45 pointer-events-none group-hover:bg-yellow/20 transition-all"></div>

                <div className="relative z-10 flex items-center gap-5">
                    <div className="w-14 h-14 bg-red/10 text-red rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                        <Compass className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">
                            Your Personalized Roadmap
                        </h1>
                        <p className="text-foreground/60 font-medium text-sm">
                            A step-by-step guide tailored to your goals.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 bg-cream/40 px-5 py-3 rounded-2xl whitespace-nowrap border border-cream shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-1">Learning Profile</p>
                    <p className="font-bold text-foreground">
                        {roadmap.domain} · <span className="text-red">{roadmap.skillLevel}</span>
                    </p>
                </div>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[3.2rem] md:before:mx-auto md:before:translate-x-0 before:-translate-x-px md:before:w-0.5 before:w-1 before:h-full before:bg-cream/80 before:rounded-full">
                {roadmap.topics.map((topic, index) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-red text-white shadow-md z-10 font-black shrink-0 relative ml-6 md:ml-0 md:mx-auto group-hover:scale-110 transition-transform">
                        {topic.sequenceNumber}
                    </div>

                    <div className="w-[calc(100%-5rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 shadow-sm hover:shadow-soft rounded-3xl border-2 border-cream hover:border-yellow/50 transition-all ml-4 md:ml-0">
                        <div className="flex flex-col gap-2 mb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-yellow bg-yellow/10 px-3 py-1 rounded-lg self-start">
                            Step {topic.sequenceNumber}
                            </span>
                            <h2 className="text-xl font-bold text-foreground tracking-tight">
                            {topic.title}
                            </h2>
                        </div>

                        <p className="text-foreground/70 font-medium text-sm leading-relaxed mb-5">
                            {topic.description}
                        </p>

                        {topic.videoLinks?.length > 0 && (
                            <div className="bg-cream/30 p-4 rounded-xl border border-cream/50">
                                <p className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2">Recommended Resources</p>
                                <ul className="space-y-2">
                                    {topic.videoLinks.map((link, i) => (
                                    <li key={i}>
                                        <a href={link} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-red hover:text-red/80 transition-colors font-semibold text-sm group">
                                            <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-red/50 group-hover:text-red transition-colors" />
                                            <span className="break-all">{link}</span>
                                        </a>
                                    </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                ))}
            </div>
            <div className="h-10"></div>
        </div>
    </div>
  );
}
