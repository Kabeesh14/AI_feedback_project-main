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
} from 'lucide-react';
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
  const navigate = useNavigate();

  const handleContinue = (portal: PortalType) => {
    navigate(`/role-selection?portal=${portal}`);
  };

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between">
      
      {/* 100vw × 100vh FIXED FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${landingClassroom})` }}
      />

      {/* SOFT TRANSLUCENT OVERLAY */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/60 backdrop-blur-[3px] z-10 pointer-events-none" />

      {/* PAGE CONTENT WRAPPER */}
      <div className="relative z-20 flex flex-col justify-between min-h-screen w-full">

        {/* Fixed Glass Top Header */}
        <header className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between border-b border-white/10 bg-slate-950/70 backdrop-blur-xl z-30 sticky top-0">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group flex-shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none whitespace-nowrap">FEEDBACKIQ</h1>
              <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5 whitespace-nowrap hidden sm:block">Institutional Intelligence</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link
              to="/"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all backdrop-blur-md whitespace-nowrap"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <Link
              to="/login"
              className="text-xs font-semibold text-white hover:text-blue-300 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600/30 border border-blue-400/30 hover:bg-blue-600/50 transition-colors whitespace-nowrap"
            >
              Direct Login
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-start lg:justify-center items-center w-full">
          
          {/* Title Banner */}
          <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-semibold mb-3 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Portal Directory
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Choose Your Portal
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              Select the portal you want to access.
            </p>
          </div>

          {/* 3 Interactive Portal Cards with Glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4 sm:mb-6 max-w-6xl mx-auto w-full">
            {portalOptions.map((option) => {
              const isSelected = selectedPortal === option.id;
              const Icon = option.icon;

              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedPortal(option.id)}
                  className={`relative flex flex-col justify-between rounded-3xl p-5 sm:p-7 border-2 transition-all duration-300 cursor-pointer group backdrop-blur-xl ${
                    isSelected
                      ? 'border-blue-500 bg-slate-900/80 shadow-2xl shadow-blue-500/20 -translate-y-1'
                      : 'border-white/15 bg-slate-900/60 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-xl'
                  }`}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-md animate-in fade-in zoom-in-95 duration-200">
                      <CheckCircle2 size={13} />
                      Selected
                    </div>
                  )}

                  <div>
                    {/* Icon Header */}
                    <div className="flex items-center gap-3.5 mb-4 sm:mb-5">
                      <div
                        className={`h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-lg text-white transition-transform duration-300 group-hover:scale-105 flex-shrink-0`}
                      >
                        <Icon size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{option.emoji}</span>
                          <h2 className="text-xl font-bold text-white leading-tight">{option.title}</h2>
                        </div>
                        <p className="text-[11px] font-medium text-slate-300 mt-0.5">{option.badge}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-300 mb-4 sm:mb-5 leading-relaxed">
                      {option.description}
                    </p>

                    {/* Feature Checklist */}
                    <div className="space-y-2 mb-5 sm:mb-6 border-t border-white/10 pt-3.5">
                      {option.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <ShieldCheck size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
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
                    className={`w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-white/10 hover:bg-blue-600 text-white border border-white/10'
                    }`}
                  >
                    <span>{option.ctaText}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/15 p-3 sm:p-3.5 text-center text-xs text-slate-300 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto w-full">
            <Link
              to="/"
              className="text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
            >
              <ArrowLeft size={14} />
              <span>Back to Landing Page</span>
            </Link>
            <button
              onClick={() => handleContinue(selectedPortal)}
              className="text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              Continue to {selectedPortal.toUpperCase()} Portal Role Selection <ArrowRight size={14} />
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 py-3 px-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl text-center text-xs text-slate-300 z-30">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
