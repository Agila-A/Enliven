// ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { Mail, Calendar, MapPin, Settings, Flame, Download, Trophy, BookOpen, Shield, Star, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export default function ProfilePage() {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError]       = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [editForm, setEditForm] = useState({ name: "", bio: "", location: "", avatar: "" });

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
          avatar:   data.user.avatar   || `seed-${Math.random().toString(36).substring(7)}`,
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

  const handleShuffleAvatar = () => {
    setEditForm(prev => ({ ...prev, avatar: `seed-${Math.random().toString(36).substring(7)}` }));
  };

  // Profile calculations
  const streak        = profile.streak        ?? 0;
  const longestStreak = profile.longestStreak ?? 0;
  const badgesCount   = profile.badges?.length || 0;
  const enrollments   = profile.enrollments || [];

  const totalXP = (longestStreak * 10) + (badgesCount * 50) + (enrollments.length * 20);
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInCurrentLevel = totalXP % 100;
  
  let rankTitle = "Novice Explorer";
  if (currentLevel >= 5) rankTitle = "Adept Learner";
  if (currentLevel >= 10) rankTitle = "Skilled Scholar";
  if (currentLevel >= 20) rankTitle = "Master Architect";
  if (currentLevel >= 50) rankTitle = "Grandmaster";

  const avatarUrl = profile.avatar 
    ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.avatar}`
    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.email}`;

  return (
    <div className="p-4 md:p-8 w-full flex justify-center bg-cream/20 min-h-screen font-sans">
      <div className="max-w-5xl w-full space-y-8 mt-2">

        {/* ── PASSPORT HEADER ── */}
        <div className="bg-red rounded-[3rem] p-1 shadow-xl relative overflow-hidden group">
           <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[200%] bg-white/5 rounded-full blur-3xl transform rotate-12 pointer-events-none"></div>
           <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[100%] bg-black/10 rounded-full blur-2xl transform -rotate-12 pointer-events-none"></div>

          <div className="bg-white/10 backdrop-blur-md rounded-[2.8rem] p-8 md:p-12 relative z-10 border border-white/20 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
            
            {/* Avatar & Rank */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-40 h-40 rounded-[2.5rem] bg-cream/20 border-4 border-white/40 p-2 shadow-2xl relative overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow/20 to-transparent z-0"></div>
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover relative z-10 drop-shadow-md" />
              </div>
              <div className="mt-4 bg-white/20 border border-white/30 backdrop-blur-sm px-4 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
                 <Star className="w-4 h-4 text-yellow fill-yellow" />
                 <span className="text-white font-bold text-sm tracking-widest uppercase">Level {currentLevel}</span>
              </div>
            </div>

            {/* User Details */}
            <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full pt-2 w-full">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">{profile.name}</h1>
                 <button
                   className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center shrink-0 backdrop-blur-sm hover:-translate-y-0.5 text-sm"
                   onClick={() => setIsEditing(true)}
                 >
                   <Settings className="w-4 h-4 mr-2" /> Edit Passport
                 </button>
               </div>
               
               <p className="text-yellow font-bold text-lg uppercase tracking-widest mb-6 drop-shadow-sm">{rankTitle}</p>

               <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-white/80 font-medium mb-6 text-sm">
                 <p className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg border border-white/5">
                   <Mail className="w-4 h-4" /> {profile.email}
                 </p>
                 <p className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg border border-white/5">
                   <Calendar className="w-4 h-4" /> Joined {new Date(profile.createdAt).toLocaleDateString()}
                 </p>
                 {profile.location && (
                   <p className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg border border-white/5">
                     <MapPin className="w-4 h-4" /> {profile.location}
                   </p>
                 )}
               </div>

               <div className="bg-black/20 border border-white/10 rounded-2xl p-5 text-white/90 text-sm leading-relaxed shadow-inner max-w-2xl font-medium">
                  {profile.bio || "No bio added yet. Tell us about yourself!"}
               </div>

               {/* XP Bar */}
               <div className="mt-8 max-w-xl">
                 <div className="flex justify-between text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
                   <span>XP Progress</span>
                   <span>{xpInCurrentLevel} / 100 XP</span>
                 </div>
                 <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden border border-white/10 shadow-inner mb-3">
                   <div 
                     className="h-full bg-gradient-to-r from-yellow to-green rounded-full transition-all duration-1000 ease-out relative"
                     style={{ width: `${xpInCurrentLevel}%` }}
                   >
                     <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                   </div>
                 </div>
                 <div className="bg-black/20 px-4 py-2 rounded-xl text-xs text-white/60 font-medium inline-block border border-white/5">
                   <span className="text-yellow font-bold">XP Breakdown:</span> Earn <span className="text-white">10 XP</span> per longest streak day, <span className="text-white">50 XP</span> per badge, and <span className="text-white">20 XP</span> per enrolled course!
                 </div>
               </div>

            </div>
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

        {/* ── COURSES SHOWCASE ── */}
        <div className="bg-white border-2 border-cream rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-3 mb-8">
             <div className="p-3 bg-red/10 rounded-xl text-red">
               <BookOpen className="w-6 h-6" />
             </div>
             <h3 className="text-2xl font-bold text-foreground tracking-tight">Active Learning Paths</h3>
           </div>

           {enrollments.length === 0 ? (
             <div className="text-center py-12 bg-cream/20 rounded-2xl border-2 border-dashed border-cream/50">
               <p className="text-foreground/60 font-medium">You haven't enrolled in any courses yet.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {enrollments.map((course, idx) => (
                 <div key={idx} className="border-2 border-cream rounded-2xl p-6 hover:border-red/30 transition-colors bg-gradient-to-b from-white to-cream/10 group cursor-pointer">
                   <div className="flex justify-between items-start mb-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-red bg-red/10 px-3 py-1 rounded-lg">
                       {course.skillLevel}
                     </span>
                     <Shield className="w-5 h-5 text-cream group-hover:text-yellow transition-colors" />
                   </div>
                   <h4 className="font-bold text-lg text-foreground mb-1 capitalize">
                     {course.domain.replace(/-/g, " ")}
                   </h4>
                   <p className="text-xs text-foreground/50 font-bold uppercase tracking-widest mb-4">
                     Enrolled {new Date(course.enrolledAt).toLocaleDateString()}
                   </p>
                 </div>
               ))}
             </div>
           )}
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
                  <div className="flex items-center gap-4 mb-6 bg-cream/20 p-4 rounded-2xl border border-cream">
                    <div className="w-20 h-20 rounded-xl bg-white border-2 border-cream p-1 shrink-0 overflow-hidden shadow-sm">
                      <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${editForm.avatar}`} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-2">Profile Avatar</p>
                      <button 
                        onClick={handleShuffleAvatar}
                        className="flex items-center gap-2 text-xs font-bold bg-white border border-cream px-3 py-2 rounded-lg hover:bg-cream/50 transition-colors text-foreground/70 shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3" /> Shuffle
                      </button>
                    </div>
                  </div>

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
