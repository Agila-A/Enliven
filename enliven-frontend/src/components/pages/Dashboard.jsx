import React from 'react';
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Play,
  ChevronRight,
  Flame,
  Target,
  Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { ProgressBar } from '../ProgressBar';
import { StatsCard } from '../StatsCard';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const weeklyData = [
  { day: 'Mon', hours: 2.5 },
  { day: 'Tue', hours: 3 },
  { day: 'Wed', hours: 1.5 },
  { day: 'Thu', hours: 4 },
  { day: 'Fri', hours: 2 },
  { day: 'Sat', hours: 3.5 },
  { day: 'Sun', hours: 2.5 }
];

const progressData = [
  { week: 'Week 1', progress: 20 },
  { week: 'Week 2', progress: 35 },
  { week: 'Week 3', progress: 50 },
  { week: 'Week 4', progress: 68 }
];

export function Dashboard({ onNavigate }) {
  const continueLearning = [
    {
      id: 1,
      title: 'Advanced React Patterns',
      subject: 'Web Development',
      progress: 68,
      timeLeft: '2h 30m',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',
      nextLesson: 'Custom Hooks & Context'
    },
    {
      id: 2,
      title: 'Data Structures & Algorithms',
      subject: 'Computer Science',
      progress: 42,
      timeLeft: '4h 15m',
      thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400',
      nextLesson: 'Binary Trees'
    },
    {
      id: 3,
      title: 'UI/UX Design Principles',
      subject: 'Design',
      progress: 85,
      timeLeft: '45m',
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
      nextLesson: 'Final Project'
    }
  ];

  const recommended = [
    {
      id: 4,
      title: 'TypeScript Mastery',
      subject: 'Programming',
      level: 'Intermediate',
      duration: '8 hours',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 5,
      title: 'Machine Learning Basics',
      subject: 'AI & ML',
      level: 'Beginner',
      duration: '12 hours',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 6,
      title: 'System Design',
      subject: 'Architecture',
      level: 'Advanced',
      duration: '10 hours',
      color: 'from-pink-500 to-pink-600'
    }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, Alex! 👋</h1>
          <p className="text-muted-foreground">Ready to continue your learning journey?</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-xl px-4 py-3 flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-xs text-orange-800">Daily Streak</p>
              <p className="text-xl font-bold text-orange-900">12 Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Card & Stats */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-primary to-[#582B5B] rounded-xl p-6 text-white">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">👨‍🎓</span>
            </div>
            <h3 className="text-xl font-semibold mb-1">Alex Thompson</h3>
            <p className="text-white/80 text-sm mb-4">Intermediate Learner</p>
            
            <div className="bg-white/10 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Level Progress</span>
                <span>Level 5</span>
              </div>
              <ProgressBar progress={65} color="primary" />
              <p className="text-xs text-white/70 mt-2">350 / 500 XP</p>
            </div>
            
            <Button 
              variant="secondary" 
              className="w-full bg-white text-primary hover:bg-white/90"
              onClick={() => onNavigate('profile')}
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-6">
          <StatsCard 
            title="Courses Enrolled"
            value="8"
            icon={BookOpen}
            trend={{ value: '+2 this month', positive: true }}
            color="primary"
          />
          <StatsCard 
            title="Hours Learned"
            value="47.5"
            icon={Clock}
            trend={{ value: '+5.2 this week', positive: true }}
            color="purple"
          />
          <StatsCard 
            title="Achievements"
            value="24"
            icon={Trophy}
            trend={{ value: '+3 unlocked', positive: true }}
            color="success"
          />
        </div>
      </div>

      {/* Continue Learning */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Continue Learning</h2>
          <Button variant="ghost" onClick={() => onNavigate('courses')}>
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {continueLearning.map((course) => (
            <div 
              key={course.id}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onNavigate('courses', course)}
            >
              <div className="relative h-40 bg-gradient-to-br from-primary/20 to-[#582B5B]/20 flex items-center justify-center">
                <Play className="w-16 h-16 text-primary opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    {course.subject}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {course.timeLeft}
                  </span>
                </div>
                
                <h3 className="font-semibold mb-3">{course.title}</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{course.progress}%</span>
                  </div>
                  <ProgressBar progress={course.progress} />
                  
                  <p className="text-sm text-muted-foreground mt-3">
                    Next: {course.nextLesson}
                  </p>
                </div>
                
                <Button className="w-full mt-4 bg-primary hover:bg-primary/90">
                  Continue Learning
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Weekly Activity</h3>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total this week</span>
            <span className="font-semibold">19 hours</span>
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Monthly Progress</h3>
            <Target className="w-5 h-5 text-[#582B5B]" />
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="progress" 
                stroke="#582B5B" 
                strokeWidth={3}
                dot={{ fill: '#582B5B', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Average completion</span>
            <span className="font-semibold text-success">+48% this month</span>
          </div>
        </div>
      </div>

      {/* Recommended for You */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Recommended for You</h2>
            <p className="text-muted-foreground text-sm">Based on your learning profile and goals</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {recommended.map((course) => (
            <div 
              key={course.id}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => onNavigate('courses', course)}
            >
              <div className={`h-32 bg-gradient-to-r ${course.color} flex items-center justify-center`}>
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {course.subject}
                  </span>
                  <div className="flex items-center text-warning">
                    <Star className="w-3 h-3 fill-warning mr-1" />
                    <span className="text-xs font-semibold">4.8</span>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-3">{course.title}</h3>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span className="bg-secondary px-2 py-1 rounded text-xs">{course.level}</span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {course.duration}
                  </span>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors"
                >
                  Explore Course
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
