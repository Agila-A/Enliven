// ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { Mail, Calendar, MapPin, Settings, Flame, Download, Trophy } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export default function ProfilePage() {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError]       = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [editForm, setEditForm] = useState({ name: "", bio: "", location: "" });

  // ── LOAD PROFILE ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      try {
        setError("");
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/profile/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Profile load failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        if (!data.success || !data.user) throw new Error("Invalid profile payload.");

        setProfile(data.user);
        setEditForm({
          name:     data.user.name     || "",
          bio:      data.user.bio      || "",
          location: data.user.location || "",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // ── UPDATE PROFILE ────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    setSaveLoading(true);
    try {
      setError("");
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profile/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Update failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      if (!data.success || !data.user) throw new Error("Invalid profile update payload.");

      setProfile(data.user);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError("Update failed. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <p className="p-10">Loading profile…</p>;
  if (error && !profile) return <p className="p-10 text-red-600">{error}</p>;
  if (!profile) return <p className="p-10">Failed to load user data.</p>;

  // Streak display helpers
  const streak        = profile.streak        ?? 0;
  const longestStreak = profile.longestStreak ?? 0;

  // Pick a flame color based on streak length
  const streakColor =
    streak >= 30 ? "from-red-400 to-orange-500"
    : streak >= 7 ? "from-orange-400 to-amber-500"
    : "from-orange-300 to-orange-400";

  return (
    <div className="p-8 w-full flex justify-center">
      <div className="max-w-5xl w-full space-y-8 mt-6">

        {/* ── HEADER CARD ── */}
        <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-2xl p-8 text-white shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-6xl shadow-inner">
                👨‍🎓
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <div className="space-y-1 text-white/90 mb-4 mt-2">
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{profile.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(profile.createdAt).toDateString()}</span>
                  </p>
                  {profile.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </p>
                  )}
                </div>
                <p className="text-white/80 max-w-xl">{profile.bio}</p>
              </div>
            </div>

            <Button
              className="bg-white text-primary hover:bg-white/90 shadow"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </div>
        </div>

        {/* ── STREAK CARD ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Current streak */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-4 bg-gradient-to-br ${streakColor} text-white rounded-xl`}>
                <Flame className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-orange-900">
                  {streak} {streak === 1 ? "Day" : "Days"} 🔥
                </h3>
                <p className="text-orange-700 text-sm font-medium">Current streak</p>
                <p className="text-orange-600 text-xs mt-1">
                  {streak === 0
                    ? "Visit daily to build your streak!"
                    : streak === 1
                    ? "You just started — keep it going!"
                    : `${streak} days in a row. Keep it up!`}
                </p>
              </div>
            </div>
          </div>

          {/* Longest streak */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-amber-400 to-yellow-500 text-white rounded-xl">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-amber-900">
                  {longestStreak} {longestStreak === 1 ? "Day" : "Days"} 🏆
                </h3>
                <p className="text-amber-700 text-sm font-medium">Longest streak ever</p>
                <p className="text-amber-600 text-xs mt-1">
                  {longestStreak === 0
                    ? "Start your first streak today!"
                    : longestStreak === streak && streak > 1
                    ? "You're at your personal best!"
                    : `Your record to beat`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <Tabs defaultValue="achievements">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="resources">Saved</TabsTrigger>
          </TabsList>

          {/* Achievements */}
          <TabsContent value="achievements">
            <div className="bg-white border rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6">Achievements</h3>

              {(!profile.badges || profile.badges.length === 0) && (
                <p className="text-gray-500">
                  No achievements yet. Complete modules to earn badges!
                </p>
              )}

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {profile.badges?.map((badge, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-xl shadow-sm hover:shadow-md transition bg-primary/5 flex flex-col items-center text-center"
                  >
                    <img
                      src={badge.icon}
                      alt={badge.name}
                      className="w-24 h-24 object-contain mb-3 drop-shadow-md"
                    />
                    <h4 className="font-semibold text-lg">{badge.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
                    <p className="text-xs text-green-600 mt-2">
                      Earned on {new Date(badge.awardedOn).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Saved Resources */}
          <TabsContent value="resources">
            <div className="bg-white border rounded-xl p-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-xl font-semibold">Saved Resources</h3>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
              </div>

              {(!profile.savedResources || profile.savedResources.length === 0) && (
                <p className="text-gray-500">No saved resources yet.</p>
              )}

              {profile.savedResources?.map((r, index) => (
                <div key={index} className="flex justify-between p-4 border rounded-lg mb-2">
                  <div>
                    <h4 className="font-semibold">{r.title}</h4>
                    <p className="text-sm text-gray-500">
                      {r.type} • Saved {r.savedDate}
                    </p>
                  </div>
                  <Button variant="ghost">View</Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── EDIT MODAL ── */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Edit Profile</h2>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <input
                type="text"
                className="w-full mb-3 p-3 border rounded-lg"
                placeholder="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />

              <textarea
                className="w-full mb-3 p-3 border rounded-lg"
                placeholder="Bio"
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />

              <input
                type="text"
                className="w-full mb-3 p-3 border rounded-lg"
                placeholder="Location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />

              <div className="flex justify-end space-x-3">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateProfile} disabled={saveLoading}>
                  {saveLoading ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
