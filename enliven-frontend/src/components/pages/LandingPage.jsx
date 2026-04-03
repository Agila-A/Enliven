import React, { useState } from 'react';
import { 
  Sparkles, 
  Target, 
  Zap, 
  Users, 
  TrendingUp, 
  ArrowRight
} from 'lucide-react';
import { useNavigate } from "react-router-dom";

// Image fallback
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

function ImageWithFallback({ src, alt, className, style, ...rest }) {
  const [didError, setDidError] = useState(false);
  const handleError = () => setDidError(true);

  return didError ? (
    <div className={`inline-block bg-white/20 backdrop-blur-md text-center align-middle ${className ?? ''}`} style={style}>
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: Target, title: 'Personalized Learning', description: 'AI-powered adaptive learning paths tailored to your pace.', color: 'bg-red/10 text-red' },
    { icon: Zap, title: 'Skip What You Know', description: 'Smart assessments highlight strengths and gaps.', color: 'bg-yellow/20 text-yellow-800' },
    { icon: TrendingUp, title: 'Progress Tracking', description: 'Visualize your learning journey with insights.', color: 'bg-green/20 text-green-800' },
    { icon: Users, title: 'Adaptive Difficulty', description: 'Learning evolves based on your level.', color: 'bg-red/10 text-red' }
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
    <div className="min-h-screen bg-cream font-sans text-foreground">

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        {/* Soft background decor */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-yellow/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[50%] bg-green/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-2 gap-14 items-center relative z-10">

          {/* LEFT */}
          <div className="space-y-8">

            <div className="inline-flex items-center bg-white/60 backdrop-blur-md border border-white/40 px-5 py-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-yellow" />
              <span className="ml-2 text-sm font-semibold text-foreground/80 tracking-wide uppercase">
                Personalized Learning Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-[1.1]">
              Where Learning Comes{" "}
              <span className="text-red">
                Alive
              </span>
            </h1>

            <p className="text-lg md:text-xl text-foreground/70 max-w-lg leading-relaxed">
              Break free from traditional learning. Get a personalized education that adapts to your pace, skips what you know, and focuses on what matters most.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-4 bg-red text-white rounded-full font-semibold text-lg shadow-soft hover:shadow-lg hover:bg-red/90 transform hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              >
                Get Started Free &rarr;
              </button>

              <button
                onClick={() => navigate("/login")}
                className="px-8 py-4 bg-white/70 backdrop-blur-md border border-white text-foreground rounded-full font-semibold text-lg hover:bg-white transition-colors shadow-sm w-full sm:w-auto"
              >
                Try Demo
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative mt-10 md:mt-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-yellow/20 to-red/10 rounded-[2.5rem] transform rotate-3 blur-sm"></div>
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1752920299210-0b727800ea50?auto=format&w=800"
              alt="Student learning"
              className="relative rounded-[2.5rem] shadow-soft w-full h-[500px] md:h-[600px] object-cover object-center border-4 border-white"
            />
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">Traditional Learning is Broken</h2>
            <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
              Students face frustrations that hold them back from reaching their full potential.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {problems.map((problem, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 bg-cream/30 p-6 rounded-2xl border border-cream/50 transition-transform hover:-translate-y-1"
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-red/10 flex items-center justify-center">
                  <span className="text-red font-bold">✕</span>
                </div>
                <p className="text-foreground font-medium text-lg">{problem}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <div className="inline-flex items-center space-x-3 bg-green/10 border border-green/20 rounded-full px-8 py-4 shadow-sm">
              <Sparkles className="w-6 h-6 text-green font-bold" />
              <span className="font-bold text-green-800 text-lg">
                Enliven solves all of this
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-cream relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">

          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-foreground/60">Four simple steps to mastery</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-soft transition-all duration-300 h-full border border-white/50 relative z-10">
                  <div className="text-7xl font-bold text-green/10 mb-6 group-hover:text-green/20 transition-colors">{step.number}</div>
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-foreground/70 text-lg leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-0">
                    <ArrowRight className="w-10 h-10 text-yellow opacity-50" />
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Powerful Features</h2>
            <p className="text-xl text-foreground/60">Everything you need to learn exactly what you need.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-cream/20 rounded-3xl p-8 border border-cream/50 hover:border-yellow/50 transition-all shadow-sm hover:shadow-soft">
                  <div className={`inline-flex p-4 rounded-2xl ${feature.color} mb-6`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-foreground/70 text-lg leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer id="about" className="bg-foreground text-cream py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="text-center space-y-6">

            <div className="flex justify-center items-center space-x-3">
              <Sparkles className="w-8 h-8 text-yellow" />
              <span className="text-3xl font-bold tracking-tight">Enliven</span>
            </div>

            <p className="text-cream/70 max-w-lg mx-auto text-lg">
              A personalized learning concept prototype built for innovation and efficiency.
            </p>

            <div className="flex flex-wrap justify-center gap-8 text-cream/80 text-base pt-6">
              <a href="#" className="hover:text-yellow transition-colors">About the Project</a>
              <a href="#" className="hover:text-yellow transition-colors">GitHub Repo</a>
              <a href="#" className="hover:text-yellow transition-colors">Pitch Deck</a>
            </div>

          </div>

          <div className="border-t border-cream/10 mt-12 pt-8 text-center text-cream/50 text-base">
            © 2025 Enliven Prototype. Built with <span className="text-red">❤️</span> by Team Enliven.
          </div>

        </div>
      </footer>

    </div>
  );
}
