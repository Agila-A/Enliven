import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  Circle, 
  Lock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Download,
  Bookmark,
  Share2,
  Clock
} from 'lucide-react';
import { Button } from '../ui/button';
import { ProgressBar } from '../ProgressBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function CoursePage() {
  const [activeLesson, setActiveLesson] = useState('1-2');
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState([
    {
      id: '1',
      title: 'Getting Started with React',
      expanded: true,
      lessons: [
        { id: '1-1', title: 'Introduction to React', duration: '12:30', status: 'completed', type: 'video' },
        { id: '1-2', title: 'Setting up Your Environment', duration: '8:45', status: 'current', type: 'video' },
        { id: '1-3', title: 'Your First Component', duration: '15:20', status: 'upcoming', type: 'video' },
        { id: '1-4', title: 'Quiz: React Basics', duration: '10 min', status: 'upcoming', type: 'quiz' }
      ]
    },
    {
      id: '2',
      title: 'Components and Props',
      expanded: false,
      lessons: [
        { id: '2-1', title: 'Understanding Components', duration: '14:15', status: 'upcoming', type: 'video' },
        { id: '2-2', title: 'Props and Data Flow', duration: '18:30', status: 'upcoming', type: 'video' },
        { id: '2-3', title: 'Component Composition', duration: '16:45', status: 'upcoming', type: 'video' },
        { id: '2-4', title: 'Reading: Best Practices', duration: '15 min', status: 'upcoming', type: 'reading' }
      ]
    },
    {
      id: '3',
      title: 'State and Lifecycle',
      expanded: false,
      lessons: [
        { id: '3-1', title: 'Introduction to State', duration: '12:00', status: 'upcoming', type: 'video' },
        { id: '3-2', title: 'useState Hook', duration: '20:15', status: 'upcoming', type: 'video' },
        { id: '3-3', title: 'useEffect Hook', duration: '22:30', status: 'upcoming', type: 'video' },
        { id: '3-4', title: 'Quiz: Hooks', duration: '15 min', status: 'upcoming', type: 'quiz' }
      ]
    }
  ]);

  const toggleSection = (sectionId) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const getLessonIcon = (lesson) => {
    if (lesson.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-success" />;
    } else if (lesson.status === 'current') {
      return <Play className="w-5 h-5 text-primary fill-primary" />;
    } else {
      return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const totalLessons = sections.reduce((acc, section) => acc + section.lessons.length, 0);
  const completedLessons = sections.reduce((acc, section) => 
    acc + section.lessons.filter(l => l.status === 'completed').length, 0
  );
  const progress = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Course Header */}
        <div className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">React Fundamentals</h1>
              <p className="text-muted-foreground">Build interactive UIs with React</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm">
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Course Progress</span>
              <span className="text-sm font-semibold">{completedLessons} of {totalLessons} lessons completed</span>
            </div>
            <ProgressBar progress={progress} />
          </div>
        </div>

        {/* Video/Content Panel */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-6">
            {/* Video Player Placeholder */}
            <div className="bg-[#1e293b] rounded-xl overflow-hidden mb-6 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-primary fill-primary" />
                </div>
                <h3 className="text-xl text-white font-semibold mb-2">Setting up Your Environment</h3>
                <p className="text-white/70">8:45 minutes</p>
              </div>
            </div>

            {/* Lesson Controls */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline">
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Previous Lesson
              </Button>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Resources
                </Button>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Tabs for Content, Notes, Discussion */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  My Notes
                </TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Transcript
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="text-xl font-semibold mb-4">About this lesson</h3>
                  <p className="text-muted-foreground mb-4">
                    In this lesson, you'll learn how to set up your development environment for React. 
                    We'll cover installing Node.js, setting up a code editor, and creating your first 
                    React application using Create React App.
                  </p>

                  <h4 className="font-semibold mb-3">What you'll learn:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Install and configure Node.js and npm</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Set up VS Code with React extensions</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Create a new React project using Create React App</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span>Understand the project structure</span>
                    </li>
                  </ul>

                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start space-x-3">
                      <FileText className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">Downloadable Resources</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Get the code examples and setup guide for this lesson
                        </p>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download Resources
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="text-xl font-semibold mb-4">Your Notes</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Take notes while watching the lesson. Your notes are automatically saved.
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Start typing your notes here..."
                    className="w-full h-64 p-4 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Last saved: Just now</p>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Notes
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="transcript" className="mt-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="text-xl font-semibold mb-4">Video Transcript</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      <span className="text-primary font-semibold">[00:00]</span> Welcome to this lesson on 
                      setting up your React development environment. In this video, we're going to cover 
                      everything you need to get started with React development.
                    </p>
                    <p>
                      <span className="text-primary font-semibold">[00:15]</span> First, let's talk about 
                      the prerequisites. You'll need to have Node.js installed on your machine. Node.js 
                      comes with npm, which is the package manager we'll use to install React and other dependencies.
                    </p>
                    <p>
                      <span className="text-primary font-semibold">[00:35]</span> To check if you have Node.js 
                      installed, open your terminal and type "node --version". If you see a version number, 
                      you're good to go. If not, head over to nodejs.org to download and install it.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Course Curriculum Sidebar */}
      <div className="w-96 bg-card border-l border-border overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Course Content</h2>
            <span className="text-sm text-muted-foreground">{totalLessons} lessons</span>
          </div>

          <div className="space-y-2">
            {sections.map((section) => (
              <div key={section.id} className="border border-border rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {section.expanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-left">{section.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{section.lessons.length}</span>
                </button>

                {/* Lessons */}
                {section.expanded && (
                  <div className="border-t border-border">
                    {section.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson.id)}
                        disabled={lesson.status === 'upcoming'}
                        className={`w-full flex items-center space-x-3 p-4 hover:bg-secondary transition-colors text-left ${
                          activeLesson === lesson.id ? 'bg-primary/5' : ''
                        } ${lesson.status === 'upcoming' ? 'opacity-50' : ''}`}
                      >
                        {getLessonIcon(lesson)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {lesson.duration}
                            </span>
                            {lesson.type === 'quiz' && (
                              <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                                Quiz
                              </span>
                            )}
                            {lesson.type === 'reading' && (
                              <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                                Reading
                              </span>
                            )}
                          </div>
                        </div>
                        {lesson.status === 'upcoming' && (
                          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
