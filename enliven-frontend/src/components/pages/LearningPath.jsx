import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Target,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { ProgressBar } from '../ProgressBar';

export default function LearningPath() {
  const [selectedModule, setSelectedModule] = useState(null);

  const modules = [
    {
      id: '1',
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of HTML, CSS, and basic JavaScript',
      level: 'Beginner',
      status: 'completed',
      lessons: 12,
      duration: '4 hours',
      progress: 100,
      objectives: [
        'Understand HTML structure and semantics',
        'Master CSS styling and layouts',
        'Learn JavaScript basics and DOM manipulation'
      ],
      outcomes: [
        'Build responsive web pages',
        'Style components with CSS',
        'Add interactivity with JavaScript'
      ]
    },
    {
      id: '2',
      title: 'Modern JavaScript & ES6+',
      description: 'Deep dive into modern JavaScript features and best practices',
      level: 'Beginner',
      status: 'completed',
      lessons: 15,
      duration: '6 hours',
      progress: 100,
      objectives: [
        'Master ES6+ features',
        'Understand async programming',
        'Learn functional programming concepts'
      ],
      outcomes: [
        'Write clean, modern JavaScript code',
        'Handle asynchronous operations',
        'Apply functional programming patterns'
      ]
    },
    {
      id: '3',
      title: 'React Fundamentals',
      description: 'Build interactive UIs with React components and hooks',
      level: 'Intermediate',
      status: 'current',
      lessons: 18,
      duration: '8 hours',
      progress: 68,
      objectives: [
        'Understand React components and props',
        'Master React hooks',
        'Learn state management patterns'
      ],
      outcomes: [
        'Build component-based applications',
        'Manage application state effectively',
        'Create reusable React components'
      ]
    },
    {
      id: '4',
      title: 'Advanced React Patterns',
      description: 'Custom hooks, context, performance optimization',
      level: 'Intermediate',
      status: 'locked',
      lessons: 20,
      duration: '10 hours',
      progress: 0,
      objectives: [
        'Create custom hooks',
        'Implement advanced patterns',
        'Optimize React performance'
      ],
      outcomes: [
        'Build scalable React applications',
        'Apply design patterns effectively',
        'Improve app performance'
      ]
    },
    {
      id: '5',
      title: 'State Management with Redux',
      description: 'Master Redux for complex state management',
      level: 'Intermediate',
      status: 'locked',
      lessons: 16,
      duration: '7 hours',
      progress: 0,
      objectives: [
        'Understand Redux architecture',
        'Implement Redux Toolkit',
        'Handle async actions with Redux'
      ],
      outcomes: [
        'Manage complex application state',
        'Debug state changes effectively',
        'Integrate Redux in React apps'
      ]
    },
    {
      id: '6',
      title: 'Full-Stack Development',
      description: 'Connect frontend with backend APIs and databases',
      level: 'Advanced',
      status: 'locked',
      lessons: 25,
      duration: '12 hours',
      progress: 0,
      objectives: [
        'Build RESTful APIs',
        'Integrate with databases',
        'Implement authentication'
      ],
      outcomes: [
        'Create full-stack applications',
        'Handle data persistence',
        'Secure applications properly'
      ]
    }
  ];

  const levelColors = {
    Beginner: 'from-green-500 to-green-600',
    Intermediate: 'from-blue-500 to-blue-600',
    Advanced: 'from-purple-500 to-purple-600'
  };

  const statusIcons = {
    completed: <CheckCircle2 className="w-6 h-6 text-success" />,
    current: <Circle className="w-6 h-6 text-primary fill-primary" />,
    locked: <Lock className="w-6 h-6 text-muted-foreground" />
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Learning Path</h1>
        <p className="text-muted-foreground">
          Follow your personalized journey to mastery. Complete modules sequentially to unlock new content.
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-primary to-[#582B5B] rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Web Development Track</h2>
            <p className="text-white/80">Beginner to Advanced</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">56%</p>
            <p className="text-sm text-white/80">Complete</p>
          </div>
        </div>
        
        <ProgressBar progress={56} className="mb-4" />
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Completed</span>
            </div>
            <p className="text-2xl font-bold">2 / 6</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Time Invested</span>
            </div>
            <p className="text-2xl font-bold">25h</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-sm">Achievements</span>
            </div>
            <p className="text-2xl font-bold">8</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Learning Path Flow */}
        <div className="lg:col-span-2 space-y-6">
          {modules.map((module, index) => {
            const isLocked = module.status === 'locked';
            const isCurrent = module.status === 'current';
            
            return (
              <div key={module.id} className="relative">
                {/* Connector Line */}
                {index < modules.length - 1 && (
                  <div className="absolute left-12 top-20 w-0.5 h-12 bg-border"></div>
                )}
                
                <div
                  className={`bg-card rounded-xl border-2 p-6 transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-primary shadow-lg'
                      : isLocked
                      ? 'border-border opacity-60'
                      : 'border-border hover:shadow-md'
                  }`}
                  onClick={() => !isLocked && setSelectedModule(module)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Status Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      isLocked ? 'bg-secondary' : 'bg-primary/10'
                    }`}>
                      {statusIcons[module.status]}
                    </div>

                    {/* Module Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-1 rounded bg-gradient-to-r ${levelColors[module.level]} text-white`}>
                              {module.level}
                            </span>
                            {isCurrent && (
                              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                                In Progress
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-semibold mb-1">{module.title}</h3>
                          <p className="text-muted-foreground text-sm">{module.description}</p>
                        </div>
                      </div>

                      {/* Module Stats */}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3 mb-4">
                        <span className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          {module.lessons} lessons
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {module.duration}
                        </span>
                      </div>

                      {/* Progress Bar (only for non-locked modules) */}
                      {!isLocked && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">{module.progress}%</span>
                          </div>
                          <ProgressBar progress={module.progress} />
                        </div>
                      )}

                      {/* Action Button */}
                      {!isLocked && (
                        <Button 
                          className={`mt-4 ${isCurrent ? 'bg-primary hover:bg-primary/90' : ''}`}
                          variant={isCurrent ? 'default' : 'outline'}
                          onClick={() => setSelectedModule(module)}
                        >
                          {module.status === 'completed' ? 'Review Module' : 'Continue Learning'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}

                      {isLocked && (
                        <div className="mt-4 flex items-center text-sm text-muted-foreground">
                          <Lock className="w-4 h-4 mr-2" />
                          Complete previous modules to unlock
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Module Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
            {selectedModule ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{selectedModule.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedModule.description}</p>
                </div>

                {/* Learning Objectives */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Target className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Learning Objectives</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedModule.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expected Outcomes */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-[#582B5B]" />
                    <h4 className="font-semibold">Expected Outcomes</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedModule.outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Award className="w-4 h-4 text-[#864F6C] mt-0.5 flex-shrink-0" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedModule.status !== 'locked' && (
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    {selectedModule.status === 'current' ? 'Continue Module' : 'Start Module'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Select a module to view details, objectives, and expected outcomes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
