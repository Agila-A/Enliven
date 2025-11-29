import { useEffect, useState } from "react";

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
      <div className="text-center text-lg font-semibold mt-20">
        Loading your roadmap...
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="text-center text-lg font-semibold mt-20 text-red-600">
        No roadmap found. Generate one first!
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 mb-20 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Your Personalized Roadmap
      </h1>

      <p className="text-gray-600 mb-8">
        Domain: <b>{roadmap.domain}</b> | Skill Level:{" "}
        <b>{roadmap.skillLevel}</b>
      </p>

      <div className="space-y-6">
        {roadmap.topics.map((topic, index) => (
          <div
            key={index}
            className="p-5 shadow-md rounded-xl border border-gray-200 bg-white transition hover:shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-white bg-blue-600 px-3 py-1 rounded-full text-sm">
                Step {topic.sequenceNumber}
              </span>
              <h2 className="text-xl font-semibold text-gray-800">
                {topic.title}
              </h2>
            </div>

            <p className="text-gray-600 mb-3">{topic.description}</p>

            {topic.videoLinks?.length > 0 && (
              <div>
                <p className="font-medium mb-1 text-gray-700">Recommended Videos:</p>
                <ul className="list-disc ml-6 text-blue-600 underline">
                  {topic.videoLinks.map((link, i) => (
                    <li key={i}>
                      <a href={link} target="_blank">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
