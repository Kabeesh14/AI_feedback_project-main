import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  UserCog,
  Building2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  Bus,
  Home,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import landingClassroom from '@/assets/landing-classroom.jpg';
import type { Role, PortalType } from '@/types';

interface RoleOption {
  id: Role;
  title: string;
  badge: string;
  emoji: string;
  description: string;
  ctaText: string;
  icon: React.ElementType;
  gradient: string;
  features: string[];
}

const educationRoleOptions: RoleOption[] = [
  {
    id: 'student',
    title: 'STUDENT',
    badge: 'Student Portal',
    emoji: '👨‍🎓',
    description: 'Share your daily college experience, use the AI Feedback Assistant, and track your feedback status from submission to resolution.',
    ctaText: 'Continue as Student',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Submit structured & anonymous feedback', 'Interactive AI Feedback Assistant', 'Real-time status tracking timeline'],
  },
  {
    id: 'faculty',
    title: 'FACULTY',
    badge: 'Faculty Intelligence',
    emoji: '👩‍🏫',
    description: 'Review departmental teaching feedback, view student sentiment trends, and access AI-powered curriculum and issue insights.',
    ctaText: 'Continue as Faculty',
    icon: Sparkles,
    gradient: 'from-teal-500 to-emerald-500',
    features: ['Department teaching & course insights', 'Student sentiment & feedback trends', 'Faculty Issue Intelligence & Analytics'],
  },
  {
    id: 'hod',
    title: 'HOD',
    badge: 'Department Command',
    emoji: '👨‍🏫',
    description: 'Monitor department feedback in real-time, explore AI-detected themes and root causes, and manage corrective actions.',
    ctaText: 'Continue as HOD',
    icon: UserCog,
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Live feedback stream & AI Institutional Pulse', 'Root-cause explorer with evidence panel', 'Action center & impact measurement'],
  },
  {
    id: 'management',
    title: 'MANAGEMENT',
    badge: 'Institutional Command',
    emoji: '👔',
    description: 'Access campus-wide executive intelligence, compare department performance, and measure overall institutional improvement.',
    ctaText: 'Continue as Management',
    icon: Building2,
    gradient: 'from-violet-500 to-purple-500',
    features: ['Campus-wide health overview & map', 'Side-by-side department analytics', 'Ask FeedbackIQ AI assistant'],
  },
];

const busRoleOptions: RoleOption[] = [
  {
    id: 'student',
    title: 'Student',
    badge: 'Bus Student',
    emoji: '👨‍🎓',
    description: 'Submit bus feedback, report issues and track resolutions.',
    ctaText: 'Continue as Student',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Submit bus ride & route feedback', 'Report bus maintenance or driving issues', 'Track issue resolution status'],
  },
  {
    id: 'bus_incharge',
    title: 'Bus Incharge',
    badge: 'Assigned Bus Scope',
    emoji: '🚌',
    description: 'Manage feedback, issues and actions for your assigned bus.',
    ctaText: 'Continue as Bus Incharge',
    icon: Bus,
    gradient: 'from-amber-500 to-orange-500',
    features: ['Assigned bus feedback & sentiment', 'Bus issues & action tracking', 'Route & passenger notifications'],
  },
  {
    id: 'transport_incharge',
    title: 'Transport Incharge',
    badge: 'Transport Operations',
    emoji: '🚍',
    description: 'Monitor transport operations, bus feedback and analytics.',
    ctaText: 'Continue as Transport Incharge',
    icon: Bus,
    gradient: 'from-orange-500 to-amber-600',
    features: ['Transport-wide analytics', 'Multi-bus comparison & issue tracking', 'Transport action center & operations management'],
  },
  {
    id: 'management',
    title: 'Management',
    badge: 'Institutional Oversight',
    emoji: '👨‍💼',
    description: 'View transport performance, analytics and institutional oversight.',
    ctaText: 'Continue as Management',
    icon: Building2,
    gradient: 'from-violet-500 to-purple-500',
    features: ['Executive transport oversight', 'Transport satisfaction & safety trends', 'Multi-portal institutional analytics'],
  },
];

const hostelRoleOptions: RoleOption[] = [
  {
    id: 'student',
    title: 'Student',
    badge: 'Hostel Resident',
    emoji: '👨‍🎓',
    description: 'Submit hostel feedback, report maintenance issues and track resolutions.',
    ctaText: 'Continue as Student',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Submit room & mess feedback', 'Report maintenance, water & Wi-Fi issues', 'Track resolution status & warden actions'],
  },
  {
    id: 'hostel_warden',
    title: 'Hostel Warden',
    badge: 'Assigned Floor Scope',
    emoji: '🏠',
    description: 'Manage feedback, maintenance issues and actions for your assigned floor.',
    ctaText: 'Continue as Hostel Warden',
    icon: Home,
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Assigned floor feedback & ratings', 'Hostel maintenance tickets & actions', 'Floor announcements & student notifications'],
  },
  {
    id: 'management',
    title: 'Management',
    badge: 'Institutional Oversight',
    emoji: '👨‍💼',
    description: 'View hostel performance, analytics and institutional oversight.',
    ctaText: 'Continue as Management',
    icon: Building2,
    gradient: 'from-violet-500 to-purple-500',
    features: ['Executive hostel & mess oversight', 'Floor-by-floor satisfaction trends', 'Multi-portal institutional analytics'],
  },
];

interface RoleSelectionPageProps {
  forcedPortal?: PortalType;
}

export function RoleSelectionPage({ forcedPortal }: RoleSelectionPageProps) {
  const [searchParams] = useSearchParams();
  const rawPortal = forcedPortal || (searchParams.get('portal') as PortalType) || 'education';
  const currentPortal: PortalType = ['education', 'bus', 'hostel'].includes(rawPortal) ? rawPortal : 'education';

  const roleOptions = useMemo(() => {
    if (currentPortal === 'bus') return busRoleOptions;
    if (currentPortal === 'hostel') return hostelRoleOptions;
    return educationRoleOptions;
  }, [currentPortal]);

  const initialRole = (searchParams.get('selected') as Role) || roleOptions[0].id;
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleContinue = (role: Role) => {
    navigate(`/login?portal=${currentPortal}&role=${role}`);
  };

  const portalMeta = useMemo(() => {
    if (currentPortal === 'bus') {
      return {
        badge: 'Bus Portal Roles',
        title: 'Bus Portal',
        subtitle: 'Select your role to continue.',
        color: 'from-amber-400 to-orange-300',
      };
    }
    if (currentPortal === 'hostel') {
      return {
        badge: 'Hostel Portal Roles',
        title: 'Hostel Portal',
        subtitle: 'Select your role to continue.',
        color: 'from-emerald-400 to-teal-300',
      };
    }
    return {
      badge: 'Interactive Role Selection',
      title: 'Welcome to FeedbackIQ',
      subtitle: 'Select your role to continue. Experience how FeedbackIQ delivers tailored insights for students, faculty, HODs, and college management.',
      color: 'from-blue-400 to-violet-300',
    };
  }, [currentPortal]);

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-x-hidden">
      
      {/* 100vw × 100vh FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${landingClassroom})` }}
      />

      {/* SOFT TRANSLUCENT OVERLAY */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-[3px] z-10 pointer-events-none" />

      {/* PAGE CONTENT ABOVE FULLSCREEN IMAGE LAYER */}
      <div className="relative z-20 flex-1 flex flex-col justify-between min-h-screen">

        {/* Translucent Glass Top Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-30">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">FEEDBACKIQ</h1>
              <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">
                {currentPortal.toUpperCase()} PORTAL
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/portal-selection"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all backdrop-blur-md"
            >
              <ArrowLeft size={14} />
              <span>Back to Portal Selection</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
              title="Toggle color theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link
              to={`/login?portal=${currentPortal}`}
              className="text-xs font-semibold text-white hover:text-blue-300 px-3 py-2 rounded-lg transition-colors"
            >
              Direct Login
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center w-full">
          
          {/* Title Banner */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-semibold mb-4 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              {portalMeta.badge}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              {currentPortal === 'education' ? (
                <>Welcome to <span className={`bg-gradient-to-r ${portalMeta.color} bg-clip-text text-transparent`}>FeedbackIQ</span></>
              ) : (
                <span className={`bg-gradient-to-r ${portalMeta.color} bg-clip-text text-transparent`}>{portalMeta.title}</span>
              )}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              {portalMeta.subtitle}
            </p>
          </div>

          {/* Interactive Role Cards with Glassmorphism */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${roleOptions.length === 3 ? 'lg:grid-cols-3 max-w-5xl' : 'lg:grid-cols-4'} gap-6 mb-10 mx-auto w-full`}>
            {roleOptions.map((option) => {
              const isSelected = selectedRole === option.id;
              const Icon = option.icon;

              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedRole(option.id)}
                  className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 border-2 transition-all duration-300 cursor-pointer group backdrop-blur-xl ${
                    isSelected
                      ? 'border-blue-500 bg-slate-900/80 shadow-2xl shadow-blue-500/20 -translate-y-1.5'
                      : 'border-white/15 bg-slate-900/60 hover:border-white/30 hover:-translate-y-1 hover:shadow-xl'
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
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-lg text-white transition-transform duration-300 group-hover:scale-110 flex-shrink-0`}
                      >
                        <Icon size={26} />
                      </div>
                      <div>
                        <span className="text-2xl">{option.emoji}</span>
                        <h2 className="text-lg font-bold text-white leading-tight">{option.title}</h2>
                        <p className="text-[11px] font-medium text-slate-300">{option.badge}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                      {option.description}
                    </p>

                    {/* Feature Checklist */}
                    <div className="space-y-2.5 mb-8 border-t border-white/10 pt-4">
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
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
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
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/15 p-4 text-center text-xs text-slate-300 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto w-full">
            <Link
              to="/portal-selection"
              className="text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
            >
              <ArrowLeft size={14} />
              <span>← Back to Portal Selection</span>
            </Link>
            <button
              onClick={() => handleContinue(selectedRole)}
              className="text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              Enter with {selectedRole.toUpperCase()} Role <ArrowRight size={14} />
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl text-center text-xs text-slate-300">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
