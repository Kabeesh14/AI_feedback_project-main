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
} from 'lucide-react';
import landingClassroom from '@/assets/landing-classroom.jpg';

const demoMetrics = [
  { label: '486 Feedback Responses', sub: 'Received this month', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-slate-900/70 border-blue-500/30' },
  { label: '7 Emerging Issues', sub: 'Under active review', icon: Activity, color: 'text-violet-400', bg: 'bg-slate-900/70 border-violet-500/30' },
  { label: '3 Critical Alerts', sub: 'HOD attention needed', icon: Zap, color: 'text-red-400', bg: 'bg-slate-900/70 border-red-500/30' },
  { label: '82% Overall Satisfaction', sub: '+12% improvement rate', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-slate-900/70 border-emerald-500/30' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between">
      
      {/* 100vw × 100vh FIXED FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${landingClassroom})` }}
      />

      {/* SOFT TRANSLUCENT OVERLAY */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/55 backdrop-blur-[2px] z-10 pointer-events-none" />

      {/* PAGE CONTENT WRAPPER */}
      <div className="relative z-20 flex flex-col justify-between min-h-screen w-full">
        
        {/* Fixed Glass Top Navbar */}
        <header className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl z-30 sticky top-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo & Subtitle */}
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group flex-shrink-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                <Sparkles size={18} className="text-white sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white leading-none whitespace-nowrap">FEEDBACKIQ</h1>
                <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5 whitespace-nowrap hidden sm:block">Institutional Intelligence</p>
              </div>
            </Link>

            {/* Controls: Get Started Button (Light mode toggle removed) */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => navigate('/portal-selection')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <span>GET STARTED</span>
                <ArrowRight size={14} className="hidden sm:inline" />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex items-center py-6 sm:py-8 lg:py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
              
              {/* Hero Left Content */}
              <div className="lg:col-span-6 text-center lg:text-left">
                {/* AI Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-400/40 text-blue-300 text-xs font-bold mb-4 shadow-md backdrop-blur-md">
                  <Sparkles size={14} className="text-blue-400 animate-pulse" />
                  <span>AI-POWERED INSTITUTIONAL INTELLIGENCE</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5 drop-shadow-md">
                  Turn Student Voice Into{' '}
                  <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
                    Institutional Action
                  </span>
                </h1>

                {/* Description */}
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-6 max-w-2xl mx-auto lg:mx-0 drop-shadow">
                  FEEDBACKIQ continuously analyzes student feedback to help institutions identify important themes, recurring issues and possible contributing factors, enabling faster and better decisions.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6">
                  <button
                    onClick={() => navigate('/portal-selection')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/40 active:scale-[0.98] transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => navigate('/portal-selection')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 text-white border border-white/20 font-bold text-sm shadow-lg backdrop-blur-md active:scale-[0.98] transition-all"
                  >
                    <Brain size={18} className="text-violet-400" />
                    <span>Explore Demo</span>
                  </button>
                </div>

                {/* Supporting Items */}
                <div className="flex items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-300 border-t border-white/15 pt-4">
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
                <div className="rounded-3xl bg-slate-950/65 border border-white/15 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                  
                  {/* Pipeline Header */}
                  <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
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
                  <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-white/10 mb-5 backdrop-blur-md">
                    <div className="grid grid-cols-3 gap-3 text-center mb-4">
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
        <footer className="flex-shrink-0 py-3 px-6 border-t border-white/10 bg-slate-950/50 backdrop-blur-xl text-center text-xs text-slate-300 z-30">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
