import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Search, Bell, LogOut, Menu, X, Sparkles, LayoutDashboard, MessageSquarePlus, History, MessageSquare, Layers, AlertTriangle, GitBranch, BellRing, CheckSquare, FileText, MessageCircle, Activity, Building2 } from 'lucide-react';
import { useState } from 'react';
import type { Role } from '@/types';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard /> },
  { label: 'Give Feedback', path: '/student/feedback', icon: <MessageSquarePlus /> },
  { label: 'AI Assistant', path: '/student/ai-assistant', icon: <Sparkles /> },
  { label: 'My Feedback', path: '/student/history', icon: <History /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell /> },
];

const hodNav: NavItem[] = [
  { label: 'Overview', path: '/hod/dashboard', icon: <LayoutDashboard /> },
  { label: 'Feedback', path: '/hod/feedback', icon: <MessageSquare /> },
  { label: 'AI Insights', path: '/hod/ai-insights', icon: <Sparkles /> },
  { label: 'Themes', path: '/hod/themes', icon: <Layers /> },
  { label: 'Issues', path: '/hod/issues', icon: <AlertTriangle /> },
  { label: 'Root Cause', path: '/hod/root-cause', icon: <GitBranch /> },
  { label: 'Alerts', path: '/hod/alerts', icon: <BellRing /> },
  { label: 'Actions', path: '/hod/actions', icon: <CheckSquare /> },
  { label: 'Reports', path: '/hod/reports', icon: <FileText /> },
  { label: 'AI Assistant', path: '/hod/ai-assistant', icon: <MessageCircle /> },
];

const managementNav: NavItem[] = [
  { label: 'Overview', path: '/management/dashboard', icon: <LayoutDashboard /> },
  { label: 'Institution Pulse', path: '/management/pulse', icon: <Activity /> },
  { label: 'Departments', path: '/management/departments', icon: <Building2 /> },
  { label: 'Themes', path: '/management/themes', icon: <Layers /> },
  { label: 'Issues', path: '/management/issues', icon: <AlertTriangle /> },
  { label: 'Root Cause', path: '/management/root-cause', icon: <GitBranch /> },
  { label: 'Alerts', path: '/management/alerts', icon: <BellRing /> },
  { label: 'Actions', path: '/management/actions', icon: <CheckSquare /> },
  { label: 'Reports', path: '/management/reports', icon: <FileText /> },
  { label: 'AI Assistant', path: '/management/ai-assistant', icon: <MessageCircle /> },
];

// Icon components

function getNavForRole(role: Role): NavItem[] {
  if (role === 'student') return studentNav;
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

  const nav = getNavForRole(user.role);
  const roleLabel = user.role === 'student' ? 'Student' : user.role === 'hod' ? 'HOD' : 'Management';
  const roleColor = user.role === 'student' ? 'text-blue-600 dark:text-blue-400' : user.role === 'hod' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar - Desktop */}
      <aside className={`fixed left-0 top-0 z-30 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col transition-transform duration-300 hidden lg:flex`}>
        <SidebarContent nav={nav} role={user.role} department={user.department} roleLabel={roleLabel} userName={user.name} roleColor={roleColor} onLogout={() => { logout(); navigate('/'); }} />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:hidden">
            <SidebarContent nav={nav} role={user.role} department={user.department} roleLabel={roleLabel} userName={user.name} roleColor={roleColor} onLogout={() => { logout(); navigate('/'); }} onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Demo Environment
                </span>
                {user.role === 'hod' && user.department && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Department-scoped view: {user.department}
                  </span>
                )}
                {user.role === 'management' && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                    {user.department ? `Scoped to: ${user.department}` : 'Institution-wide view'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" aria-label="Search">
                <Search size={18} />
              </button>
              <div className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors relative" aria-label="Notifications">
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </button>
                {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
              </div>
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" aria-label="Toggle theme">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-3 ml-1 border-l border-slate-200 dark:border-slate-700">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.name}</p>
                  <p className={`text-xs font-semibold ${roleColor}`}>
                    {roleLabel} · {user.role === 'management' ? (user.department || 'Institution-wide') : (user.department || 'General')}
                  </p>
                </div>
                <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" aria-label="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function SidebarContent({ nav, role, department, roleLabel, userName, roleColor, onLogout, onClose }: { nav: NavItem[]; role: Role; department?: string | null; roleLabel: string; userName: string; roleColor: string; onLogout: () => void; onClose?: () => void }) {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">FEEDBACKIQ</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Institutional Intelligence</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {nav.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{userName}</p>
            <p className={`text-xs font-semibold ${roleColor}`}>
              {roleLabel} · {role === 'management' ? (department || 'Institution-wide') : (department || 'General')}
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
