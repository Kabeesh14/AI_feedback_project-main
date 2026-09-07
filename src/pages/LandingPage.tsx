import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  GraduationCap,
  Building2,
  Brain,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import landingClassroom from '@/assets/landing-classroom.jpg';

const demoMetrics = [
  { label: '486 Feedback Responses', sub: 'Received this month', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-slate-900/70 border-blue-500/30' },
  { label: '7 Emerging Issues', sub: 'Under active review', icon: Activity, color: 'text-violet-400', bg: 'bg-slate-900/70 border-violet-500/30' },
  { label: '3 Critical Alerts', sub: 'HOD attention needed', icon: Zap, color: 'text-red-400', bg: 'bg-slate-900/70 border-red-500/30' },
  { label: '82% Overall Satisfaction', sub: '+12% improvement rate', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-slate-900/70 border-emerald-500/30' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-x-hidden">
      
      {/* 100vw × 100vh FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${landingClassroom})` }}
      />

      {/* SOFT TRANSLUCENT OVERLAY (~45% OPACITY + SUBTLE BLUR FOR ULTRA READABILITY) */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/50 dark:bg-slate-950/65 backdrop-blur-[2px] z-10 pointer-events-none" />

      {/* PAGE CONTENT ABOVE FULLSCREEN IMAGE LAYER */}
      <div className="relative z-20 flex-1 flex flex-col justify-between min-h-screen">
        
        {/* Translucent Glass Top Navbar */}
        <header className="px-6 py-4 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo & Subtitle */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">FEEDBACKIQ</h1>
                <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">Institutional Intelligence</p>
              </div>
            </Link>

            {/* Controls: Theme Toggle & Get Started (No Sign In button in navbar as required) */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
                title="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              
              <button
                onClick={() => navigate('/role-selection')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all"
              >
                <span>GET STARTED</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex items-center py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Hero Left Content */}
              <div className="lg:col-span-6 text-center lg:text-left">
                {/* AI Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-400/40 text-blue-300 text-xs font-bold mb-6 shadow-md backdrop-blur-md">
                  <Sparkles size={14} className="text-blue-400 animate-pulse" />
                  <span>AI-POWERED INSTITUTIONAL INTELLIGENCE</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6 drop-shadow-md">
                  Turn Student Voice Into{' '}
                  <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
                    Institutional Action
                  </span>
                </h1>

                {/* Description */}
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0 drop-shadow">
                  FEEDBACKIQ continuously analyzes student feedback to help institutions identify important themes, recurring issues and possible contributing factors, enabling faster and better decisions.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                  <button
                    onClick={() => navigate('/role-selection')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/40 active:scale-[0.98] transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => navigate('/role-selection')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 text-white border border-white/20 font-bold text-sm shadow-lg backdrop-blur-md active:scale-[0.98] transition-all"
                  >
                    <Brain size={18} className="text-violet-400" />
                    <span>Explore Demo</span>
                  </button>
                </div>

                {/* Supporting Items */}
                <div className="flex items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-300 border-t border-white/15 pt-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Mock Anonymous Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span>Role-Based Command Centers</span>
                  </div>
                </div>
              </div>

              {/* Hero Right Visual: Floating Glass Card Container on top of full-screen background */}
              <div className="lg:col-span-6 relative">
                <div className="rounded-3xl bg-slate-950/65 border border-white/15 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                  
                  {/* Pipeline Header */}
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-300 ml-2">FEEDBACKIQ — Real-Time Pipeline</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[11px] font-bold">
                      ● Live Monitoring
                    </span>
                  </div>

                  {/* Real-Time Pipeline Visual: Students → AI Engine → Institution */}
                  <div className="bg-slate-900/80 rounded-2xl p-5 border border-white/10 mb-6 backdrop-blur-md">
                    <div className="grid grid-cols-3 gap-3 text-center mb-5">
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 shadow-sm">
                        <GraduationCap size={22} className="mx-auto text-blue-400 mb-1" />
                        <p className="text-[11px] font-bold text-slate-100">Students</p>
                        <p className="text-[10px] text-slate-400">Feedback Input</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-violet-500/30 shadow-sm">
                        <Brain size={22} className="mx-auto text-violet-400 mb-1" />
                        <p className="text-[11px] font-bold text-slate-100">AI Engine</p>
                        <p className="text-[10px] text-slate-400">Theme Clustering</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 shadow-sm">
                        <Building2 size={22} className="mx-auto text-emerald-400 mb-1" />
                        <p className="text-[11px] font-bold text-slate-100">Institution</p>
                        <p className="text-[10px] text-slate-400">Action & Impact</p>
                      </div>
                    </div>

                    {/* Progress Flow */}
                    <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                      <div className="absolute top-0 bottom-0 left-0 w-3/4 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-center font-medium text-slate-300">
                      Continuous feedback loop with automated root-cause evidence mapping
                    </p>
                  </div>

                  {/* 4 Demo Analytics Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {demoMetrics.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={i}
                          className={`p-3.5 rounded-2xl border ${item.bg} backdrop-blur-md shadow-sm transition-all duration-300 hover:scale-[1.02]`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={16} className={item.color} />
                            <span className={`text-xs font-bold ${item.color}`}>{item.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">{item.sub}</p>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Translucent Glass Footer */}
        <footer className="py-6 px-6 border-t border-white/10 bg-slate-950/50 backdrop-blur-xl text-center text-xs text-slate-300">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
