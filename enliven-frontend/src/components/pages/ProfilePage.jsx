import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Calendar,
  MapPin,
  Award,
  Flame,
  Target,
  BookOpen,
  Edit,
  Settings,
  Trophy,
  Bookmark,
  Download,
  CheckCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { ProgressBar } from '../ProgressBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  const profileData = {
    name: 'Alex Thompson',
    email: 'alex.thompson@email.com',
    joinDate: 'January 2024',
    location: 'San Francisco, CA',
    bio: 'Passionate about web development and learning new technologies. Currently focused on mastering React and building full-stack applications.',
    level: 5,
    xp: 350,
    nextLevelXp: 500,
    streak: 15,
    longestStreak: 23
  };

  const skillsData = [
    { skill: 'React', proficiency: 85 },
    { skill: 'JavaScript', proficiency: 92 },
    { skill: 'CSS/Styling', proficiency: 78 },
    { skill: 'Node.js', proficiency: 70 },
    { skill: 'TypeScript', proficiency: 75 },
    { skill: 'Git', proficiency: 88 }
  ];

  const achievements = [
    { id: 1, title: 'Quick Learner', description: 'Complete 10 lessons in one week', icon: '⚡', unlocked: true, date: 'Nov 10, 2024' },
    { id: 2, title: 'Streak Master', description: 'Maintain a 14-day learning streak', icon: '🔥', unlocked: true, date: 'Nov 18, 2024' },
    { id: 3, title: 'Perfect Score', description: 'Score 100% on any assessment', icon: '💯', unlocked: true, date: 'Nov 5, 2024' },
    { id: 4, title: 'Early Bird', description: 'Complete lessons before 8 AM 5 times', icon: '🌅', unlocked: true, date: 'Nov 12, 2024' },
  ];

  const savedResources = [
    { id: 1, title: 'Advanced React Patterns Guide', type: 'Article', savedDate: '2 days ago' },
    { id: 2, title: 'TypeScript Best Practices', type: 'Video', savedDate: '1 week ago' },
    { id: 3, title: 'CSS Grid Layout Cheat Sheet', type: 'Resource', savedDate: '1 week ago' }
  ];

  const learningStats = [
    { label: 'Courses Enrolled', value: '8', icon: BookOpen, color: 'text-primary' },
    { label: 'Courses Completed', value: '3', icon: CheckCircle, color: 'text-success' },
    { label: 'Total Study Hours', value: '87', icon: Target, color: 'text-[#582B5B]' },
    { label: 'Achievements', value: '4/8', icon: Trophy, color: 'text-warning' }
  ];

  return (
    <div className="p-8 w-full flex justify-center">
      <div className="max-w-5xl w-full space-y-8 mt-6">

        {/* HEADER CARD */}
        <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-2xl p-8 text-white relative overflow-hidden shadow-md">
          
          {/* Trophy Background */}
          <div className="absolute top-0 right-0 opacity-10">
            <Trophy className="w-64 h-64" />
          </div>

          <div className="relative flex items-start justify-between">
            
            {/* Avatar */}
            <div className="flex items-start space-x-6">
              <div className="relative">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-6xl backdrop-blur-sm shadow-inner">
                  👨‍🎓
                </div>
                <button className="absolute bottom-0 right-0 bg-white text-primary p-2 rounded-full shadow-lg hover:bg-white/90 transition">
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold">{profileData.name}</h1>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    Level {profileData.level}
                  </span>
                </div>

                <div className="space-y-1 text-white/90 mb-4">
                  <p className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>{profileData.email}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {profileData.joinDate}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{profileData.location}</span>
                  </p>
                </div>

                <p className="text-white/90 max-w-xl">{profileData.bio}</p>
              </div>
            </div>

            <Button className="bg-white text-primary hover:bg-white/90 shadow" onClick={() => setIsEditing(!isEditing)}>
              <Settings className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span>Progress to Level {profileData.level + 1}</span>
              <span className="font-semibold">{profileData.xp} / {profileData.nextLevelXp} XP</span>
            </div>
            <ProgressBar progress={(profileData.xp / profileData.nextLevelXp) * 100} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6">
          {learningStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl border p-6 shadow-sm">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Streak Card */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-xl bg-orange-500 text-white">
                <Flame className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-orange-900">{profileData.streak} Day Streak! 🔥</h3>
                <p className="text-orange-700">Keep it up! Longest streak: {profileData.longestStreak} days</p>
              </div>
            </div>
            <p className="text-orange-600 text-right text-sm">
              Don't break the chain! <br />
              Study today to maintain your streak
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="skills">
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="skills">Skills & Progress</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="resources">Saved Resources</TabsTrigger>
          </TabsList>

          {/* SKILLS TAB */}
          <TabsContent value="skills">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Radar */}
              <div className="bg-white border rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-6">Skill Proficiency</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={skillsData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Tooltip />
                    <Radar name="Proficiency" dataKey="proficiency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Skill List */}
              <div className="bg-white border rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-6">Skill Breakdown</h3>

                <div className="space-y-4">
                  {skillsData.map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between">
                        <span>{skill.skill}</span>
                        <span className="text-primary font-semibold">{skill.proficiency}%</span>
                      </div>
                      <ProgressBar progress={skill.proficiency} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ACHIEVEMENTS TAB */}
          <TabsContent value="achievements">
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Your Achievements</h3>

              <div className="grid md:grid-cols-2 gap-4">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 border rounded-xl bg-primary/5 border-primary/30 shadow-sm"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{a.icon}</div>
                      <div>
                        <h4 className="font-semibold">{a.title}</h4>
                        <p className="text-sm text-gray-600">{a.description}</p>
                        <p className="text-xs text-green-600 mt-1">Unlocked on {a.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* RESOURCES TAB */}
          <TabsContent value="resources">
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Saved Resources</h3>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" /> Export All
                </Button>
              </div>

              {savedResources.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Bookmark className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{r.title}</h4>
                      <p className="text-sm text-gray-500">{r.type} • Saved {r.savedDate}</p>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
            </div>
          </TabsContent>

        </Tabs>

      </div>
    </div>
  );
}
