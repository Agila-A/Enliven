import React, { useState } from 'react';
import { 
  Sparkles, 
  Target, 
  Zap, 
  Users, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/button';

// Image fallback
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
    { icon: Target, title: 'Personalized Learning', description: 'AI-powered adaptive learning paths tailored to your pace.', color: 'from-blue-50 to-blue-100 text-primary' },
    { icon: Zap, title: 'Skip What You Know', description: 'Smart assessments highlight strengths and gaps.', color: 'from-purple-50 to-purple-100 text-[#582B5B]' },
    { icon: TrendingUp, title: 'Progress Tracking', description: 'Visualize your learning journey with insights.', color: 'from-pink-50 to-pink-100 text-[#864F6C]' },
    { icon: Users, title: 'Adaptive Difficulty', description: 'Learning evolves based on your level.', color: 'from-green-50 to-green-100 text-success' }
  ];

  const steps = [
    { number: '01', title: 'Take an Assessment', description: 'We identify your current level and preferences.' },
    { number: '02', title: 'Get Your Path', description: 'You receive a custom learning roadmap.' },
    { number: '03', title: 'Learn & Grow', description: 'Learn at your pace with adaptive content.' },
    { number: '04', title: 'Track Progress', description: 'Monitor improvements and achievements.' }
  ];

  const problems = [
    'Fixed syllabi that ignore prior knowledge',
    'Repeating basics you already know',
    'Too many resources with no clear path',
    'One-size-fits-all learning',
    'Lack of personalized feedback'
  ];

  return (
    <div className="min-h-screen">

      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-br from-[#ECF2FF] via-[#F1EDFF] to-[#F8F5FF] py-20 overflow-hidden">
        <div className="w-full px-10 lg:px-20 grid md:grid-cols-2 gap-14 items-center">


          {/* LEFT */}
          <div className="space-y-6">

            <div className="inline-flex items-center bg-white px-4 py-2 rounded-full shadow-md">
              <Sparkles className="w-4 h-4 text-enliven-primary" />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Personalized Learning Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Where Learning Comes{" "}
              <span className="bg-gradient-to-r from-enliven-primary to-enliven-purple bg-clip-text text-transparent">
                Alive
              </span>
            </h1>

            <p className="text-lg text-gray-600 max-w-lg">
              Break free from traditional learning. Get a personalized education that adapts to your pace, skips what you know, and focuses on what matters most.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-enliven-primary text-white rounded-full font-semibold text-lg hover:bg-enliven-primary-dark transition"
              >
                Get Started Free →
              </button>

              <button
                onClick={onTryDemo}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-full font-semibold text-lg hover:bg-gray-100 transition"
              >
                Try Demo
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative mt-10">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1752920299210-0b727800ea50?auto=format&w=800"
              alt="Student learning"
              className="rounded-3xl shadow-xl w-full h-[570px] object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
<section className="py-20 bg-background">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    {/* Heading */}
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold mb-4">Traditional Learning is Broken</h2>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Students face frustrations that hold them back from reaching their potential
      </p>
    </div>

    {/* SAME grid size & spacing */}
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {problems.map((problem, index) => (
        <div
          key={index}
          className="flex items-start space-x-4 bg-white p-6 rounded-xl border border-red-200"
        >
          {/* Updated icon style only */}
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-400 text-sm">✕</span>
          </div>

          {/* Text stays same size */}
          <p className="text-gray-700">{problem}</p>
        </div>
      ))}
    </div>

    {/* Updated but same size CTA */}
    <div className="text-center mt-12">
      <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-6 py-3">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-blue-600">
          Enliven solves all of this
        </span>
      </div>
    </div>

  </div>
</section>



      {/* HOW IT WORKS */}
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

      {/* FEATURES */}
      <section id="features" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground">Everything you need to learn effectively</p>
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

      

      {/* FOOTER */}
      <footer id="about" className="bg-[#190019] text-white py-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    <div className="text-center space-y-4">

      <div className="flex justify-center items-center space-x-2">
        <Sparkles className="w-6 h-6" />
        <span className="text-xl font-semibold">Enliven</span>
      </div>

      <p className="text-white/70 max-w-lg mx-auto">
        A personalized learning concept prototype built for innovation and problem-solving.
      </p>

      <div className="flex flex-wrap justify-center gap-6 text-white/70 text-sm pt-4">
        <a href="#" className="hover:text-white transition">About the Project</a>
        <a href="#" className="hover:text-white transition">GitHub Repo</a>
        <a href="#" className="hover:text-white transition">Pitch Deck</a>
        
      </div>

      
    </div>

    <div className="border-t border-white/20 mt-10 pt-6 text-center text-white/60 text-sm">
      © 2025 Enliven Prototype. Built with ❤️ by Team Enliven.
    </div>

  </div>
</footer>


    </div>
  );
}
