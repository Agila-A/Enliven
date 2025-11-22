import React from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Target, 
  Award,
  BookOpen,
  Brain,
  Zap,
  CheckCircle
} from 'lucide-react';
import { StatsCard } from '../StatsCard';
import { ProgressBar } from '../ProgressBar';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function AnalyticsPage() {
  const weeklyProgress = [
    { week: 'Week 1', hours: 8, completed: 3 },
    { week: 'Week 2', hours: 12, completed: 5 },
    { week: 'Week 3', hours: 10, completed: 4 },
    { week: 'Week 4', hours: 15, completed: 7 },
    { week: 'Week 5', hours: 18, completed: 8 },
    { week: 'Week 6', hours: 14, completed: 6 }
  ];

  const performanceBySubject = [
    { subject: 'React', score: 85 },
    { subject: 'JavaScript', score: 92 },
    { subject: 'CSS', score: 78 },
    { subject: 'Node.js', score: 75 },
    { subject: 'TypeScript', score: 88 }
  ];

  const skillsRadar = [
    { skill: 'Frontend', current: 85, target: 95 },
    { skill: 'Backend', current: 65, target: 85 },
    { skill: 'Database', current: 70, target: 80 },
    { skill: 'DevOps', current: 55, target: 75 },
    { skill: 'Testing', current: 75, target: 90 }
  ];

  const timeDistribution = [
    { name: 'Video Lessons', value: 45, color: '#3b82f6' },
    { name: 'Practice', value: 30, color: '#582B5B' },
    { name: 'Assessments', value: 15, color: '#864F6C' },
    { name: 'Reading', value: 10, color: '#DFB6B2' }
  ];

  const strengths = [
    { topic: 'Component Lifecycle', score: 95, trend: 'up' },
    { topic: 'State Management', score: 92, trend: 'up' },
    { topic: 'Hooks & Effects', score: 88, trend: 'stable' }
  ];

  const weaknesses = [
    { topic: 'Performance Optimization', score: 62, trend: 'up' },
    { topic: 'Testing', score: 58, trend: 'stable' },
    { topic: 'TypeScript Integration', score: 65, trend: 'up' }
  ];

  const learningPace = {
    current: 'On Track',
    compared: '+15% faster than average',
    color: 'success'
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics & Insights</h1>
        <p className="text-muted-foreground">
          Track your progress, identify strengths, and discover areas for improvement
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Study Time"
          value="87h"
          icon={Clock}
          trend={{ value: '+12h this week', positive: true }}
          color="primary"
        />
        <StatsCard 
          title="Avg. Score"
          value="82%"
          icon={Target}
          trend={{ value: '+5% from last month', positive: true }}
          color="purple"
        />
        <StatsCard 
          title="Modules Completed"
          value="24"
          icon={CheckCircle}
          trend={{ value: '+6 this month', positive: true }}
          color="success"
        />
        <StatsCard 
          title="Learning Streak"
          value="15"
          icon={Award}
          trend={{ value: 'Best: 23 days', positive: true }}
          color="pink"
        />
      </div>

      {/* Performance Overview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Weekly Learning Activity</h3>
              <p className="text-sm text-muted-foreground">Study hours and completed lessons</p>
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProgress}>
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
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Study Hours"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#582B5B" 
                strokeWidth={3}
                name="Lessons Completed"
                dot={{ fill: '#582B5B', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Subject */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Performance by Subject</h3>
              <p className="text-sm text-muted-foreground">Average assessment scores</p>
            </div>
            <Target className="w-5 h-5 text-[#582B5B]" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceBySubject} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
              <YAxis dataKey="subject" type="category" stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="score" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Skills Radar & Time Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skills Radar */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Skills Assessment</h3>
              <p className="text-sm text-muted-foreground">Current vs Target proficiency</p>
            </div>
            <Brain className="w-5 h-5 text-primary" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={skillsRadar}>
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
              <Legend />
              <Radar name="Current Level" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name="Target Level" dataKey="target" stroke="#582B5B" fill="#582B5B" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Time Distribution */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Time Distribution</h3>
              <p className="text-sm text-muted-foreground">How you spend your learning time</p>
            </div>
            <Clock className="w-5 h-5 text-[#864F6C]" />
          </div>
          
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={timeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {timeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-success/10 rounded-lg">
              <Zap className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Your Strengths</h3>
              <p className="text-sm text-muted-foreground">Topics you've mastered</p>
            </div>
          </div>

          <div className="space-y-4">
            {strengths.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{item.topic}</span>
                    {item.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-success" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-success">{item.score}%</span>
                </div>
                <ProgressBar progress={item.score} color="success" />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-success/5 rounded-lg border border-success/20">
            <p className="text-sm">
              <span className="font-semibold text-success">Great job!</span> You're performing exceptionally 
              well in these areas. Consider helping others or exploring advanced topics.
            </p>
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Areas for Improvement</h3>
              <p className="text-sm text-muted-foreground">Topics to focus on</p>
            </div>
          </div>

          <div className="space-y-4">
            {weaknesses.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{item.topic}</span>
                    {item.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-warning">{item.score}%</span>
                </div>
                <ProgressBar progress={item.score} color="warning" />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm">
              <span className="font-semibold text-primary">Keep practicing!</span> We've curated 
              personalized exercises and resources to help you improve in these areas.
            </p>
          </div>
        </div>
      </div>

      {/* Learning Pace */}
      <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-6 h-6" />
              <h3 className="text-2xl font-semibold">Learning Pace Analysis</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/80 text-sm mb-1">Current Pace</p>
                <p className="text-2xl font-bold">{learningPace.current}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/80 text-sm mb-1">Compared to Average</p>
                <p className="text-2xl font-bold">{learningPace.compared}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/80 text-sm mb-1">Estimated Completion</p>
                <p className="text-2xl font-bold">3 weeks</p>
              </div>
            </div>

            <p className="text-white/90 mb-4">
              You're making excellent progress! Your learning pace is steady and consistent. 
              At this rate, you'll complete your current track ahead of schedule.
            </p>

            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 rounded-lg px-4 py-2">
                <span className="text-sm">✓ Consistent study habits</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2">
                <span className="text-sm">✓ High engagement rate</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2">
                <span className="text-sm">✓ Strong assessment performance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Personalized Recommendations</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2">📚 Study More</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Focus on Testing and Performance Optimization to balance your skillset
            </p>
            <a href="#" className="text-sm text-primary font-semibold hover:underline">
              View resources →
            </a>
          </div>

          <div className="p-4 bg-success/5 rounded-lg border border-success/20">
            <h4 className="font-semibold mb-2">🎯 Practice</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Take additional practice quizzes to reinforce your weak areas
            </p>
            <a href="#" className="text-sm text-success font-semibold hover:underline">
              Start practicing →
            </a>
          </div>

          <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
            <h4 className="font-semibold mb-2">🚀 Level Up</h4>
            <p className="text-sm text-muted-foreground mb-3">
              You're ready for advanced React patterns and optimization techniques
            </p>
            <a href="#" className="text-sm text-[#582B5B] font-semibold hover:underline">
              Explore advanced →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
