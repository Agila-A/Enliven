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
  Star,
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

export function ProfilePage() {
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
    {
      id: 1,
      title: 'Quick Learner',
      description: 'Complete 10 lessons in one week',
      icon: '⚡',
      unlocked: true,
      date: 'Nov 10, 2024'
    },
    {
      id: 2,
      title: 'Streak Master',
      description: 'Maintain a 14-day learning streak',
      icon: '🔥',
      unlocked: true,
      date: 'Nov 18, 2024'
    },
    {
      id: 3,
      title: 'Perfect Score',
      description: 'Score 100% on any assessment',
      icon: '💯',
      unlocked: true,
      date: 'Nov 5, 2024'
    },
    {
      id: 4,
      title: 'Early Bird',
      description: 'Complete lessons before 8 AM 5 times',
      icon: '🌅',
      unlocked: true,
      date: 'Nov 12, 2024'
    },
    {
      id: 5,
      title: 'Knowledge Seeker',
      description: 'Complete 50 lessons total',
      icon: '📚',
      unlocked: false,
      progress: 24,
      total: 50
    },
    {
      id: 6,
      title: 'Master of React',
      description: 'Complete the React mastery track',
      icon: '⚛️',
      unlocked: false,
      progress: 68,
      total: 100
    },
    {
      id: 7,
      title: 'Social Learner',
      description: 'Help 10 students in discussions',
      icon: '🤝',
      unlocked: false,
      progress: 3,
      total: 10
    },
    {
      id: 8,
      title: 'Speed Demon',
      description: 'Complete a course in under 2 weeks',
      icon: '🚀',
      unlocked: false,
      progress: 0,
      total: 1
    }
  ];

  const savedResources = [
    {
      id: 1,
      title: 'Advanced React Patterns Guide',
      type: 'Article',
      savedDate: '2 days ago'
    },
    {
      id: 2,
      title: 'TypeScript Best Practices',
      type: 'Video',
      savedDate: '1 week ago'
    },
    {
      id: 3,
      title: 'CSS Grid Layout Cheat Sheet',
      type: 'Resource',
      savedDate: '1 week ago'
    }
  ];

  const learningStats = [
    { label: 'Courses Enrolled', value: '8', icon: BookOpen, color: 'text-primary' },
    { label: 'Courses Completed', value: '3', icon: CheckCircle, color: 'text-success' },
    { label: 'Total Study Hours', value: '87', icon: Target, color: 'text-[#582B5B]' },
    { label: 'Achievements', value: '4/8', icon: Trophy, color: 'text-warning' }
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <Trophy className="w-64 h-64" />
          </div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-6xl backdrop-blur-sm">
                  👨‍🎓
                </div>
                <button className="absolute bottom-0 right-0 bg-white text-primary p-2 rounded-full shadow-lg hover:bg-white/90 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold">{profileData.name}</h1>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    Level {profileData.level}
                  </span>
                </div>
                
                <div className="space-y-2 text-white/90 mb-4">
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

                <p className="text-white/90 max-w-2xl">{profileData.bio}</p>
              </div>
            </div>

            <Button 
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Level Progress */}
          <div className="mt-6 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span>Progress to Level {profileData.level + 1}</span>
              <span className="font-semibold">{profileData.xp} / {profileData.nextLevelXp} XP</span>
            </div>
            <ProgressBar progress={(profileData.xp / profileData.nextLevelXp) * 100} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {learningStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-4 rounded-xl">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-orange-900">
                  {profileData.streak} Day Streak! 🔥
                </h3>
                <p className="text-orange-700">
                  Keep it up! Your longest streak: {profileData.longestStreak} days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-700 mb-1">Don't break the chain!</p>
              <p className="text-xs text-orange-600">Study today to maintain your streak</p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="skills">Skills & Progress</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="resources">Saved Resources</TabsTrigger>
          </TabsList>

          {/* Skills Tab */}
          <TabsContent value="skills">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Skills Radar */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-xl font-semibold mb-6">Skill Proficiency</h3>
                
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={skillsData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="skill" stroke="#64748b" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Radar 
                      name="Proficiency" 
                      dataKey="proficiency" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Skills List */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-xl font-semibold mb-6">Skill Breakdown</h3>
                
                <div className="space-y-4">
                  {skillsData.map((skill, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{skill.skill}</span>
                        <span className="text-sm font-semibold text-primary">
                          {skill.proficiency}%
                        </span>
                      </div>
                      <ProgressBar progress={skill.proficiency} />
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Tip:</span> Focus on improving 
                    your lower-rated skills to become a more well-rounded developer.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Your Achievements</h3>
                <span className="text-muted-foreground">
                  {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      achievement.unlocked
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-muted/30 opacity-70'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`text-4xl ${!achievement.unlocked && 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{achievement.title}</h4>
                          {achievement.unlocked && (
                            <CheckCircle className="w-5 h-5 text-success" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {achievement.description}
                        </p>

                        {achievement.unlocked ? (
                          <p className="text-xs text-success">
                            Unlocked on {achievement.date}
                          </p>
                        ) : achievement.progress !== undefined ? (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-xs font-semibold">
                                {achievement.progress} / {achievement.total}
                              </span>
                            </div>
                            <ProgressBar 
                              progress={(achievement.progress / achievement.total) * 100} 
                              size="sm"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">🔒 Locked</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Saved Resources Tab */}
          <TabsContent value="resources">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Saved Resources</h3>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>

              {savedResources.length > 0 ? (
                <div className="space-y-4">
                  {savedResources.map((resource) => (
                    <div 
                      key={resource.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Bookmark className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{resource.title}</h4>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <span>{resource.type}</span>
                            <span>•</span>
                            <span>Saved {resource.savedDate}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">No saved resources yet</h4>
                  <p className="text-muted-foreground">
                    Start bookmarking helpful resources as you learn
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
