import React, { useState } from 'react';
import { 
  Sparkles, 
  Target, 
  Zap, 
  Users, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';
import { Button } from '../ui/button';

// Inline ImageWithFallback component
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

function ImageWithFallback({ src, alt, className, style, ...rest }) {
  const [didError, setDidError] = useState(false);
  const handleError = () => setDidError(true);

  return didError ? (
    <div className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`} style={style}>
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  );
}

export function LandingPage({ onGetStarted, onTryDemo }) {
  const features = [
    { icon: Target, title: 'Personalized Learning', description: 'AI-powered adaptive learning paths tailored to your pace and learning style', color: 'from-blue-50 to-blue-100 text-primary' },
    { icon: Zap, title: 'Skip What You Know', description: 'Smart assessments identify your strengths so you focus on what matters', color: 'from-purple-50 to-purple-100 text-[#582B5B]' },
    { icon: TrendingUp, title: 'Progress Tracking', description: 'Visualize your learning journey with detailed analytics and insights', color: 'from-pink-50 to-pink-100 text-[#864F6C]' },
    { icon: Users, title: 'Adaptive Difficulty', description: 'Content adjusts to your level - never too easy, never too overwhelming', color: 'from-green-50 to-green-100 text-success' }
  ];

  const steps = [
    { number: '01', title: 'Take an Assessment', description: 'We identify your current knowledge level and learning preferences' },
    { number: '02', title: 'Get Your Path', description: 'Receive a personalized learning roadmap designed just for you' },
    { number: '03', title: 'Learn & Grow', description: 'Study at your own pace with adaptive content that evolves with you' },
    { number: '04', title: 'Track Progress', description: 'Monitor your achievements and see how far you\'ve come' }
  ];

  const testimonials = [
    { name: 'Sarah Chen', role: 'Computer Science Student', content: 'Enliven helped me skip the basics I already knew and dive deep into advanced topics. Saved me months of time!', rating: 5 },
    { name: 'Marcus Rodriguez', role: 'Self-Learner', content: 'Finally, a platform that adapts to MY pace. No more feeling rushed or bored. This is the future of learning.', rating: 5 },
    { name: 'Priya Patel', role: 'High School Senior', content: 'The personalized learning path made complex subjects so much easier to understand. My grades improved significantly!', rating: 5 }
  ];

  const problems = [
    'Fixed syllabi that don\'t account for prior knowledge',
    'Repeating basics you already understand',
    'Overwhelming amount of resources with no clear path',
    'One-size-fits-all approach leaving slow learners frustrated',
    'No feedback on strengths and weaknesses'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm">Personalized Learning Platform</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Where Learning Comes{' '}
                <span className="bg-gradient-to-r from-primary to-[#582B5B] bg-clip-text text-transparent">Alive</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Break free from traditional learning. Get a personalized education that adapts to your pace, 
                skips what you know, and focuses on what matters to you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={onGetStarted} className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button onClick={onTryDemo} variant="outline" className="px-8 py-6 text-lg border-2">
                  Try Demo
                </Button>
              </div>
              <div className="flex items-center space-x-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#582B5B] border-2 border-white"></div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold">10,000+ Students</p>
                  <p className="text-xs text-muted-foreground">Already learning smarter</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1752920299210-0b727800ea50?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmclMjBib29rc3xlbnwxfHx8fDE3NjM2MTMzNzV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Student learning"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              {/* Floating Stats */}
              <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">85% Faster</p>
                    <p className="text-xs text-muted-foreground">Learning Progress</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-card rounded-xl p-4 shadow-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="bg-success/10 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold">98% Success</p>
                    <p className="text-xs text-muted-foreground">Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Traditional Learning is Broken</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Students face frustrations that hold them back from reaching their potential
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {problems.map((problem, index) => (
              <div key={index} className="flex items-start space-x-3 bg-card p-6 rounded-xl border border-destructive/20">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center mt-1">
                  <span className="text-destructive text-sm">✕</span>
                </div>
                <p className="text-foreground">{problem}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <div className="inline-flex items-center space-x-2 bg-primary/10 rounded-full px-6 py-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">Enliven solves all of this</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Four simple steps to personalized learning</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="text-6xl font-bold text-primary/10 mb-4">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground">Everything you need for effective, personalized learning</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by Students</h2>
            <p className="text-xl text-muted-foreground">See what learners are saying about Enliven</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card rounded-xl p-6 shadow-sm border border-border">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{testimonial.content}"</p>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-[#582B5B] rounded-full"></div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-[#582B5B] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 text-white/90">Join thousands of students who are learning smarter, not harder</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg">
              Start Learning Free
            </Button>
            <Button onClick={onTryDemo} variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-6 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#190019] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-6 h-6" />
                <span className="text-xl font-semibold">Enliven</span>
              </div>
              <p className="text-white/70">Personalized learning that adapts to you.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/70">
            <p>© 2025 Enliven. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
