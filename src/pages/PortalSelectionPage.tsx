import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  Bus,
  Home,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import landingClassroom from '@/assets/landing-classroom.jpg';
import type { PortalType } from '@/types';

interface PortalOption {
  id: PortalType;
  title: string;
  badge: string;
  emoji: string;
  description: string;
  ctaText: string;
  icon: typeof GraduationCap;
  gradient: string;
  features: string[];
  route: string;
}

const portalOptions: PortalOption[] = [
  {
    id: 'education',
    title: 'Education Portal',
    badge: 'Academic Intelligence',
    emoji: '🎓',
    description: 'Academic feedback, faculty, departments and institutional analytics.',
    ctaText: 'Continue to Education',
    icon: GraduationCap,
    gradient: 'from-blue-600 to-indigo-600',
    features: [
      'Course, subject & faculty teaching feedback',
      'Faculty & HOD departmental analytics',
      'Curriculum insights & root-cause tracking',
    ],
    route: '/role-selection?portal=education',
  },
  {
    id: 'bus',
    title: 'Bus Portal',
    badge: 'Bus Transport',
    emoji: '🚌',
    description: 'Transport feedback, bus issues, operations and bus analytics.',
    ctaText: 'Continue to Bus',
    icon: Bus,
    gradient: 'from-amber-500 to-orange-600',
    features: [
      'Route, boarding point & driver feedback',
      'Bus Incharge assigned bus issue resolution',
      'Comprehensive transport management & safety analytics',
    ],
    route: '/role-selection?portal=bus',
  },
  {
    id: 'hostel',
    title: 'Hostel Portal',
    badge: 'Residential & Facilities',
    emoji: '🏠',
    description: 'Hostel feedback, maintenance issues, floor operations and analytics.',
    ctaText: 'Continue to Hostel',
    icon: Home,
    gradient: 'from-emerald-500 to-teal-600',
    features: [
      'Room, mess, water & Wi-Fi maintenance feedback',
      'Hostel Warden assigned floor ticket management',
      'Residential action tracking & facility analytics',
    ],
    route: '/role-selection?portal=hostel',
  },
];

export function PortalSelectionPage() {
  const [selectedPortal, setSelectedPortal] = useState<PortalType>('education');
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleContinue = (portal: PortalType) => {
    navigate(`/role-selection?portal=${portal}`);
  };

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col overflow-x-hidden">
      
      {/* 100vw × 100vh FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${landingClassroom})` }}
      />

      {/* SOFT TRANSLUCENT OVERLAY */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-[3px] z-10 pointer-events-none" />

      {/* PAGE CONTENT ABOVE FULLSCREEN IMAGE LAYER */}
      <div className="relative z-20 flex-1 flex flex-col w-full">

        {/* Translucent Glass Top Header */}
        <header className="w-full px-6 py-3.5 flex items-center justify-between border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-30">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">FEEDBACKIQ</h1>
              <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">Institutional Intelligence</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all backdrop-blur-md"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
              title="Toggle color theme"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <Link
              to="/login"
              className="text-xs font-semibold text-white hover:text-blue-300 px-3 py-2 rounded-lg transition-colors"
            >
              Direct Login
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col justify-center w-full">
          
          {/* Title Banner */}
          <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-semibold mb-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Portal Directory
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
              Choose Your Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Select the portal you want to access.
            </p>
          </div>

          {/* 3 Interactive Portal Cards with Glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 max-w-6xl mx-auto w-full">
            {portalOptions.map((option) => {
              const isSelected = selectedPortal === option.id;
              const Icon = option.icon;

              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedPortal(option.id)}
                  className={`relative flex flex-col justify-between rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-2 transition-all duration-300 cursor-pointer group backdrop-blur-xl ${
                    isSelected
                      ? 'border-blue-500 bg-slate-900/80 shadow-2xl shadow-blue-500/20 -translate-y-1'
                      : 'border-white/15 bg-slate-900/60 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-xl'
                  }`}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-md animate-in fade-in zoom-in-95 duration-200">
                      <CheckCircle2 size={12} />
                      Selected
                    </div>
                  )}

                  <div>
                    {/* Icon Header */}
                    <div className="flex items-center gap-3 mb-3.5">
                      <div
                        className={`h-12 w-12 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-lg text-white transition-transform duration-300 group-hover:scale-105 flex-shrink-0`}
                      >
                        <Icon size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{option.emoji}</span>
                          <h2 className="text-lg font-bold text-white leading-tight">{option.title}</h2>
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-medium text-slate-300 mt-0.5">{option.badge}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-300 mb-3.5 leading-relaxed">
                      {option.description}
                    </p>

                    {/* Feature Checklist */}
                    <div className="space-y-1.5 mb-4 border-t border-white/10 pt-3">
                      {option.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <ShieldCheck size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContinue(option.id);
                    }}
                    className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-white/10 hover:bg-blue-600 text-white border border-white/10'
                    }`}
                  >
                    <span>{option.ctaText}</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/15 p-2.5 sm:p-3 text-center text-xs text-slate-300 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2 max-w-4xl mx-auto w-full mb-2">
            <Link
              to="/"
              className="text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors font-medium text-xs"
            >
              <ArrowLeft size={13} />
              <span>Back to Landing Page</span>
            </Link>
            <button
              onClick={() => handleContinue(selectedPortal)}
              className="text-blue-400 font-bold hover:underline flex items-center gap-1 text-xs"
            >
              Continue to {selectedPortal.toUpperCase()} Portal Role Selection <ArrowRight size={13} />
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-3 px-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl text-center text-[11px] text-slate-300">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
