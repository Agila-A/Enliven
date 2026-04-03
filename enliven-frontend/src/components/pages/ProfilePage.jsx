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

  if (loading) return <div className="p-10 flex justify-center"><p className="text-foreground/70 font-medium font-sans">Loading profile…</p></div>;
  if (error && !profile) return <div className="p-10 flex justify-center"><p className="text-red font-bold font-sans">{error}</p></div>;
  if (!profile) return <div className="p-10 flex justify-center"><p className="text-foreground/70 font-sans">Failed to load user data.</p></div>;

  // Streak display helpers
  const streak        = profile.streak        ?? 0;
  const longestStreak = profile.longestStreak ?? 0;

  return (
    <div className="p-8 w-full flex justify-center bg-cream/20 min-h-screen font-sans">
      <div className="max-w-5xl w-full space-y-8 mt-2">

        {/* ── HEADER CARD ── */}
        <div className="bg-red rounded-[2.5rem] p-10 text-white shadow-soft relative overflow-hidden group border-4 border-white">
           <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[120%] bg-white/10 rounded-full blur-3xl transform rotate-12 group-hover:bg-white/20 transition-all"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between relative z-10 gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8 text-center md:text-left">
              <div className="w-36 h-36 border-4 border-white/30 backdrop-blur-sm bg-white/10 rounded-full flex items-center justify-center text-6xl shadow-inner flex-shrink-0">
                👨‍🎓
              </div>
              <div className="pt-2">
                <h1 className="text-4xl font-bold tracking-tight">{profile.name}</h1>
                <div className="flex flex-col md:flex-row gap-3 md:gap-6 text-white/80 font-medium my-4 justify-center md:justify-start">
                  <p className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    <span>{profile.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                  </p>
                  {profile.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      <span>{profile.location}</span>
                    </p>
                  )}
                </div>
                <p className="text-white bg-black/10 px-6 py-4 rounded-2xl max-w-xl font-medium leading-relaxed border border-white/10 text-sm">
                  {profile.bio || "No bio added yet. Tell us about yourself!"}
                </p>
              </div>
            </div>

            <button
              className="bg-white text-red font-bold hover:bg-cream px-6 py-3 rounded-xl shadow-md transition-all flex items-center shrink-0 hover:-translate-y-0.5"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="w-5 h-5 mr-3" /> Edit Profile
            </button>
          </div>
        </div>

        {/* ── STREAK CARD ── */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Current streak */}
          <div className="bg-white border-2 border-yellow/30 rounded-3xl p-8 shadow-sm flex flex-col justify-center transform transition-transform hover:-translate-y-1">
            <div className="flex items-center space-x-6">
              <div className={`p-5 bg-yellow/10 text-yellow border border-yellow/20 rounded-2xl`}>
                <Flame className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-foreground tracking-tight">
                  {streak} {streak === 1 ? "Day" : "Days"} 🔥
                </h3>
                <p className="text-foreground/60 font-bold uppercase tracking-wider text-xs mt-1">Current streak</p>
                <p className="text-foreground/80 font-medium text-sm mt-3 bg-yellow/5 px-3 py-1.5 rounded-lg inline-block">
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
          <div className="bg-white border-2 border-green/30 rounded-3xl p-8 shadow-sm flex flex-col justify-center transform transition-transform hover:-translate-y-1">
            <div className="flex items-center space-x-6">
              <div className="p-5 bg-green/10 text-green border border-green/20 rounded-2xl">
                <Trophy className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-foreground tracking-tight">
                  {longestStreak} {longestStreak === 1 ? "Day" : "Days"} 🏆
                </h3>
                <p className="text-foreground/60 font-bold uppercase tracking-wider text-xs mt-1">Longest streak ever</p>
                <p className="text-foreground/80 font-medium text-sm mt-3 bg-green/5 px-3 py-1.5 rounded-lg inline-block">
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
          <TabsList className="flex w-full mb-8 bg-cream/50 p-1.5 rounded-2xl">
            <TabsTrigger value="achievements" className="flex-1 rounded-xl font-bold py-3 data-[state=active]:bg-white data-[state=active]:text-red data-[state=active]:shadow-sm">Achievements</TabsTrigger>
            <TabsTrigger value="resources" className="flex-1 rounded-xl font-bold py-3 data-[state=active]:bg-white data-[state=active]:text-yellow data-[state=active]:shadow-sm">Saved Resources</TabsTrigger>
          </TabsList>

          {/* Achievements */}
          <TabsContent value="achievements">
            <div className="bg-white border-2 border-cream rounded-3xl p-8 min-h-[400px]">
              <h3 className="text-2xl font-bold mb-8 text-foreground tracking-tight">Your Badges & Trophies</h3>

              {(!profile.badges || profile.badges.length === 0) && (
                <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-24 h-24 bg-cream/50 rounded-full flex items-center justify-center mb-6">
                        <Trophy className="w-10 h-10 text-foreground/30" />
                    </div>
                  <p className="text-foreground/60 font-medium text-lg">
                    No achievements yet. Complete modules to earn badges!
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {profile.badges?.map((badge, index) => (
                  <div
                    key={index}
                    className="pt-8 pb-6 px-6 border-2 border-cream hover:border-yellow/50 rounded-[2rem] shadow-sm hover:shadow-soft transition bg-white flex flex-col items-center text-center transform hover:-translate-y-1"
                  >
                    <img
                      src={badge.icon}
                      alt={badge.name}
                      className="w-28 h-28 object-contain mb-6 drop-shadow-md"
                    />
                    <h4 className="font-bold text-xl text-foreground mb-2">{badge.name}</h4>
                    <p className="text-sm font-medium text-foreground/60 leading-relaxed mb-4">{badge.description}</p>
                    <div className="mt-auto bg-green/10 text-green font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg">
                      Earned {new Date(badge.awardedOn).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Saved Resources */}
          <TabsContent value="resources">
            <div className="bg-white border-2 border-cream rounded-3xl p-8 min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-foreground tracking-tight">Saved Materials</h3>
                <button className="px-5 py-2.5 font-bold text-sm bg-cream/50 hover:bg-cream text-foreground rounded-xl flex items-center transition-colors">
                  <Download className="w-4 h-4 mr-2" /> Export All
                </button>
              </div>

              {(!profile.savedResources || profile.savedResources.length === 0) && (
                <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-24 h-24 bg-cream/50 rounded-full flex items-center justify-center mb-6">
                        <Download className="w-10 h-10 text-foreground/30" />
                    </div>
                  <p className="text-foreground/60 font-medium text-lg">No saved resources yet.</p>
                </div>
              )}

              <div className="space-y-4">
                  {profile.savedResources?.map((r, index) => (
                      <div key={index} className="flex items-center justify-between p-5 border-2 border-cream rounded-2xl mb-2 hover:border-red/30 transition-colors bg-white hover:shadow-sm">
                      <div>
                          <h4 className="font-bold text-lg text-foreground mb-1">{r.title}</h4>
                          <p className="text-sm font-bold text-foreground/50 uppercase tracking-widest text-[10px]">
                          {r.type} <span className="mx-2">•</span> Saved {r.savedDate}
                          </p>
                      </div>
                      <button className="px-6 py-2.5 bg-red/10 text-red hover:bg-red/20 font-bold rounded-xl transition-colors">View</button>
                      </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── EDIT MODAL ── */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-soft border-4 border-cream animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-bold mb-6 text-foreground text-center">Edit Profile</h2>

              {error && <div className="bg-red/10 border border-red/20 text-red font-bold text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2 pl-1">Name</label>
                      <input
                          type="text"
                          className="w-full p-4 border-2 border-cream focus:border-red outline-none rounded-xl font-medium text-foreground transition-colors bg-cream/10"
                          placeholder="Your Name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2 pl-1">Bio</label>
                      <textarea
                          className="w-full p-4 border-2 border-cream focus:border-red outline-none rounded-xl font-medium text-foreground transition-colors bg-cream/10 resize-none"
                          placeholder="Tell us a bit about yourself"
                          rows={4}
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2 pl-1">Location</label>
                      <input
                          type="text"
                          className="w-full p-4 border-2 border-cream focus:border-red outline-none rounded-xl font-medium text-foreground transition-colors bg-cream/10"
                          placeholder="Your Location"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                  </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  className="flex-1 py-4 font-bold text-foreground/70 bg-cream/50 rounded-xl hover:bg-cream transition-colors"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 py-4 font-bold text-white bg-red rounded-xl hover:bg-red/90 shadow-md transition-all disabled:opacity-50"
                  onClick={handleUpdateProfile} disabled={saveLoading}
                >
                  {saveLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
