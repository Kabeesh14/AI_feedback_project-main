import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Search, Bell, LogOut, Menu, X, Sparkles, LayoutDashboard, MessageSquarePlus, History, MessageSquare, Layers, AlertTriangle, GitBranch, BellRing, CheckSquare, FileText, MessageCircle, Activity, Building2, Send, ShieldCheck, Users, TrendingUp, Bus, Home } from 'lucide-react';
import { useState } from 'react';
import type { Role, PortalType } from '@/types';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { getUnreadAlerts } from '@/services/alertService';
import { FluidBackground } from '@/components/common/FluidBackground';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Give Feedback', path: '/student/feedback', icon: <MessageSquarePlus size={18} /> },
  { label: 'AI Assistant', path: '/student/ai-assistant', icon: <Sparkles size={18} /> },
  { label: 'My Feedback', path: '/student/history', icon: <History size={18} /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell size={18} /> },
];

const busStudentNav: NavItem[] = [
  { label: 'Bus Dashboard', path: '/bus/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Give Feedback', path: '/bus/feedback', icon: <MessageSquarePlus size={18} /> },
  { label: 'My Feedback', path: '/bus/feedback', icon: <History size={18} /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell size={18} /> },
];

const busInchargeNav: NavItem[] = [
  { label: 'Bus Overview', path: '/bus/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Bus Feedback', path: '/bus/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Bus Issues', path: '/bus/issues', icon: <AlertTriangle size={18} /> },
  { label: 'Corrective Actions', path: '/bus/actions', icon: <CheckSquare size={18} /> },
  { label: 'Bus Analytics', path: '/bus/analytics', icon: <TrendingUp size={18} /> },
];

const transportInchargeNav: NavItem[] = [
  { label: 'Bus Overview', path: '/bus/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Bus Feedback', path: '/bus/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Bus Issues', path: '/bus/issues', icon: <AlertTriangle size={18} /> },
  { label: 'Bus Actions', path: '/bus/actions', icon: <CheckSquare size={18} /> },
  { label: 'Transport Analytics', path: '/bus/analytics', icon: <TrendingUp size={18} /> },
];

const hostelStudentNav: NavItem[] = [
  { label: 'Hostel Dashboard', path: '/hostel/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Give Feedback', path: '/hostel/feedback', icon: <MessageSquarePlus size={18} /> },
  { label: 'My Feedback', path: '/hostel/feedback', icon: <History size={18} /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell size={18} /> },
];

const hostelWardenNav: NavItem[] = [
  { label: 'Floor Overview', path: '/hostel/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Floor Feedback', path: '/hostel/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Floor Issues', path: '/hostel/issues', icon: <AlertTriangle size={18} /> },
  { label: 'Corrective Actions', path: '/hostel/actions', icon: <CheckSquare size={18} /> },
  { label: 'Floor Analytics', path: '/hostel/analytics', icon: <TrendingUp size={18} /> },
];

const facultyNav: NavItem[] = [
  { label: 'Dashboard', path: '/faculty/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Faculty Survey', path: '/faculty/surveys', icon: <FileText size={18} /> },
  { label: 'Participation', path: '/faculty/forms', icon: <Users size={18} /> },
  { label: 'Student Feedback', path: '/faculty/student-feedback', icon: <MessageSquare size={18} /> },
  { label: 'My Feedback', path: '/faculty/history', icon: <History size={18} /> },
  { label: 'Department Issues', path: '/faculty/issues', icon: <AlertTriangle size={18} /> },
  { label: 'AI Assistant', path: '/faculty/ai-assistant', icon: <MessageCircle size={18} /> },
  { label: 'Notifications', path: '/faculty/notifications', icon: <Bell size={18} /> },
];

const hodNav: NavItem[] = [
  { label: 'Overview', path: '/hod/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Feedback', path: '/hod/forms', icon: <MessageSquare size={18} /> },
  { label: 'Issues', path: '/hod/issues', icon: <AlertTriangle size={18} /> },
  { label: 'AI Insights', path: '/hod/ai-insights', icon: <Sparkles size={18} /> },
  { label: 'Themes', path: '/hod/themes', icon: <Layers size={18} /> },
  { label: 'Reports', path: '/hod/reports', icon: <FileText size={18} /> },
  { label: 'AI Assistant', path: '/hod/ai-assistant', icon: <MessageCircle size={18} /> },
];

const managementNav: NavItem[] = [
  { label: 'Overview', path: '/management/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Feedback', path: '/management/feedback', icon: <MessageSquare size={18} /> },
  { label: 'Departments', path: '/management/departments', icon: <Building2 size={18} /> },
  { label: 'Issues', path: '/management/issues', icon: <AlertTriangle size={18} /> },
  { label: 'Themes', path: '/management/themes', icon: <Layers size={18} /> },
  { label: 'Bus Portal', path: '/bus/dashboard', icon: <Bus size={18} /> },
  { label: 'Hostel Portal', path: '/hostel/dashboard', icon: <Home size={18} /> },
  { label: 'Reports', path: '/management/reports', icon: <FileText size={18} /> },
  { label: 'AI Assistant', path: '/management/ai-assistant', icon: <MessageCircle size={18} /> },
];

function getNavForRole(role: Role, portal?: string): NavItem[] {
  if (role === 'bus_incharge') return busInchargeNav;
  if (role === 'transport_incharge') return transportInchargeNav;
  if (role === 'hostel_warden') return hostelWardenNav;
  if (role === 'student') {
    if (portal === 'bus') return busStudentNav;
    if (portal === 'hostel') return hostelStudentNav;
    return studentNav;
  }
  if (role === 'faculty') return facultyNav;
  if (role === 'hod') return hodNav;
  return managementNav;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) return null;

  const nav = getNavForRole(user.role, user.portal);

  const roleLabelMap: Record<Role, string> = {
    student: user.portal === 'bus' ? 'Bus Student' : user.portal === 'hostel' ? 'Hostel Student' : 'Student',
    faculty: 'Faculty',
    hod: 'HOD',
    management: 'Management',
    bus_incharge: 'Bus Incharge',
    transport_incharge: 'Transport Incharge',
    hostel_warden: 'Hostel Warden',
  };
  const roleLabel = roleLabelMap[user.role] || 'User';

  const roleColorMap: Record<Role, string> = {
    student: 'text-cyan-400',
    faculty: 'text-teal-400',
    hod: 'text-emerald-400',
    management: 'text-violet-400',
    bus_incharge: 'text-amber-400',
    transport_incharge: 'text-orange-400',
    hostel_warden: 'text-purple-400',
  };
  const roleColor = roleColorMap[user.role] || 'text-cyan-400';

  const userScope = user.role === 'transport_incharge'
    ? 'Bus Transport'
    : user.role === 'bus_incharge'
    ? (user.bus_number ? `Bus: ${user.bus_number}` : 'Bus 14')
    : user.portal === 'bus'
    ? (user.bus_number ? `Bus: ${user.bus_number}` : 'Bus Transport')
    : user.role === 'hostel_warden' || user.portal === 'hostel'
    ? (user.assigned_floor || user.floor || 'Hostel Residence')
    : (user.department || 'Institution-wide');

  return (
    <div className="min-h-screen bg-[#04050c] text-slate-100 relative overflow-x-hidden font-['Onest',sans-serif]">
      {/* 1. Global WebGL Fluid Simulation Background across ALL pages */}
      <FluidBackground />

      {/* 2. Sidebar - Desktop (Black Glass with glowing accents) */}
      <aside className="fixed left-0 top-0 z-30 h-screen w-64 bg-[#04050c]/85 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-all duration-300 hidden lg:flex shadow-[4px_0_30px_rgba(0,0,0,0.7)]">
        <SidebarContent
          nav={nav}
          role={user.role}
          department={userScope}
          roleLabel={roleLabel}
          userName={user.name}
          roleColor={roleColor}
          onLogout={() => { logout(); navigate('/'); }}
        />
      </aside>

      {/* 3. Sidebar - Mobile Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-screen w-64 bg-[#04050c]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 lg:hidden shadow-2xl">
            <SidebarContent
              nav={nav}
              role={user.role}
              department={userScope}
              roleLabel={roleLabel}
              userName={user.name}
              roleColor={roleColor}
              onLogout={() => { logout(); navigate('/'); }}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* 4. Main content column */}
      <div className="lg:pl-64 relative z-10 flex flex-col min-h-screen">
        {/* Top bar - Black Glass with subtle border */}
        <header className="sticky top-0 z-20 bg-[#04050c]/75 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Demo Environment
                </span>
                {userScope && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {userScope}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all shadow-sm relative active:scale-95"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {getUnreadAlerts(user.role === 'management' ? null : user.department).length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)] animate-pulse" />
                  )}
                </button>
                {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-white/10">
                <div className="text-right">
                  <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
                  <p className={`text-xs font-semibold ${roleColor}`}>
                    {roleLabel} · {userScope}
                  </p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-300 transition-all shadow-sm active:scale-95"
                  aria-label="Logout"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={location.pathname === '/student/dashboard' ? "w-full min-h-[calc(100vh-4rem)] p-0 relative z-10 flex-1" : "p-4 lg:p-8 max-w-7xl mx-auto relative z-10 flex-1 w-full text-slate-100"}>
          {children}
        </main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function SidebarContent({
  nav,
  role,
  department,
  roleLabel,
  userName,
  roleColor,
  onLogout,
  onClose
}: {
  nav: NavItem[];
  role: Role;
  department?: string | null;
  roleLabel: string;
  userName: string;
  roleColor: string;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform">
            <Sparkles size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent leading-tight">
              FEEDBACKIQ
            </h1>
            <p className="text-[10px] text-cyan-400/80 uppercase tracking-widest font-semibold">
              Institutional Intelligence
            </p>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation List with glowing animated active state */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
        {nav.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group overflow-hidden ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-violet-500/20 text-white border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.25)] font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10'
              }`}
            >
              {/* Left animated accent pill on active */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-cyan-400 to-violet-500 rounded-r-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
              <span className={`transition-all duration-200 ${active ? 'text-cyan-400 scale-105' : 'text-slate-400 group-hover:text-cyan-300 group-hover:scale-105'}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {/* Subtle right glowing dot on active */}
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile & Sign Out Footer */}
      <div className="border-t border-white/10 p-4 bg-black/30 backdrop-blur-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 p-[2px] shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <div className="w-full h-full rounded-full bg-[#04050c] flex items-center justify-center text-sm font-semibold text-white">
              {userName.charAt(0)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className={`text-xs font-semibold ${roleColor} truncate`}>
              {roleLabel} · {role === 'management' ? (department || 'Institution-wide') : (department || 'General')}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition-all active:scale-[0.98]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
