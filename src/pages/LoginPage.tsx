import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  UserCog,
  Building2,
  Loader2,
  Sun,
  Moon,
  Building,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { OFFICIAL_DEPARTMENTS, type Role, type Department } from '@/types';
import loginClassroom from '@/assets/login-classroom.jpg';

const demoAccounts: { role: Role; email: string; label: string; btnLabel: string; desc: string; icon: typeof GraduationCap; color: string }[] = [
  { role: 'student', email: 'student@demo.com', label: 'Student', btnLabel: 'Sign In as Student', desc: 'Feedback submission & AI assistant', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
  { role: 'hod', email: 'hod@demo.com', label: 'Faculty / HOD', btnLabel: 'Sign In as Faculty / HOD', desc: 'Department pulse, root cause & action center', icon: UserCog, color: 'from-emerald-500 to-teal-500' },
  { role: 'management', email: 'management@demo.com', label: 'Management', btnLabel: 'Sign In as Management', desc: 'Institution comparison & strategic tracking', icon: Building2, color: 'from-violet-500 to-purple-500' },
];

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const roleFromUrl = (searchParams.get('role') as Role) || 'student';
  
  const [selectedRole, setSelectedRole] = useState<Role>(roleFromUrl);
  const [selectedDept, setSelectedDept] = useState<Department | ''>(
    selectedRole === 'management' ? '' : 'Artificial Intelligence & Data Science'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, loginAsRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleDemoLogin = (role: Role) => {
    if ((role === 'student' || role === 'hod') && !selectedDept) {
      setErrorMsg('Please select your department to continue.');
      return;
    }
    setLoadingRole(role);
    setErrorMsg(null);
    setTimeout(() => {
      loginAsRole(role, selectedDept || null);
      const paths: Record<Role, string> = {
        student: '/student/dashboard',
        hod: '/hod/dashboard',
        management: '/management/dashboard',
      };
      navigate(paths[role]);
    }, 400);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if ((selectedRole === 'student' || selectedRole === 'hod') && !selectedDept) {
      setErrorMsg('Please select your department to continue.');
      return;
    }
    if (email && (!email.includes('@') || !email.includes('.'))) {
      setErrorMsg('Please enter a valid college email address.');
      return;
    }
    setLoadingRole(selectedRole);
    setErrorMsg(null);
    setTimeout(() => {
      login(email || `${selectedRole}@demo.com`, selectedRole, selectedDept || null);
      const paths: Record<Role, string> = {
        student: '/student/dashboard',
        hod: '/hod/dashboard',
        management: '/management/dashboard',
      };
      navigate(paths[selectedRole]);
    }, 400);
  };

  const activeAccount = demoAccounts.find(a => a.role === selectedRole) || demoAccounts[0];

  return (
    <div className="relative min-h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-x-hidden">
      
      {/* 100vw × 100vh FULL-SCREEN CLASSROOM BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${loginClassroom})` }}
      />

      {/* LIGHT/MODERATE TRANSLUCENT OVERLAY (~30% OPACITY FOR CLEAR CLASSROOM INTERIOR VISIBILITY) */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/30 dark:bg-slate-950/35 backdrop-blur-[1px] z-10 pointer-events-none" />

      {/* PAGE CONTENT ABOVE FULL-SCREEN BACKGROUND */}
      <div className="relative z-20 flex-1 flex flex-col justify-between min-h-screen">

        {/* Translucent Glass Top Navbar (NO "Change Role" button anywhere) */}
        <header className="px-6 py-4 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">FEEDBACKIQ</h1>
                <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">Institutional Intelligence</p>
              </div>
            </Link>

            {/* Right side: Theme toggle only (No Change Role button) */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
                title="Toggle color theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area: Floating Glassmorphism Login Card Centered on Fullscreen Image */}
        <main className="flex-1 flex items-center justify-center lg:justify-end max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 lg:py-16">
          
          {/* FLOATING GLASSMORPHISM CARD */}
          <div className="w-full max-w-lg rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 p-7 sm:p-9 text-slate-100">
            
            {/* Header */}
            <div className="mb-6 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
                <Sparkles size={13} className="text-blue-400" />
                <span>Institutional Sign In</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">Welcome Back</h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Sign in to continue to FeedbackIQ
              </p>
            </div>

            {/* Interactive Role Selector INSIDE Login Card */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
                {demoAccounts.map(account => {
                  const isActive = selectedRole === account.role;
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(account.role);
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={15} />
                      <span className="truncate">{account.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleFormLogin} className="space-y-4 mb-6">
              
              {/* Department Dropdown for All Roles */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Department {selectedRole !== 'management' && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <Building size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <select
                    value={selectedDept}
                    onChange={e => {
                      setSelectedDept(e.target.value as Department | '');
                      setErrorMsg(null);
                    }}
                    className="w-full pl-10 pr-9 py-3 rounded-2xl border border-white/15 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors text-xs sm:text-sm appearance-none cursor-pointer"
                  >
                    {selectedRole === 'management' ? (
                      <option value="" className="bg-slate-900 text-white py-1">
                        [ All Departments ▼ ] (Institution-wide)
                      </option>
                    ) : (
                      <option value="" disabled className="bg-slate-900 text-slate-400">
                        [ Select Department ▼ ]
                      </option>
                    )}
                    {OFFICIAL_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept} className="bg-slate-900 text-white py-1">
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {selectedRole === 'management' && (
                  <p className="text-[11px] text-violet-300 mt-1.5 flex items-center gap-1.5">
                    <span>💡 Management has access to all 9 departments or can focus on a specific department.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  College Email / ID
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={`${selectedRole}@demo.com`}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/15 bg-slate-950/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-white/15 bg-slate-950/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Demo Environment: You can enter any password or use 1-Click Demo Login below!')}
                  className="text-blue-400 font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Dynamic Sign In Button */}
              <button
                type="submit"
                disabled={!!loadingRole}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingRole ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>{activeAccount.btnLabel}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Demo Environment 1-Click Access Section */}
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  ⚡ Demo Environment (1-Click Access)
                </span>
                <span className="text-[10px] text-slate-400">Instant Demo Login</span>
              </div>

              <div className="space-y-2">
                {demoAccounts.map(account => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => handleDemoLogin(account.role)}
                      disabled={!!loadingRole}
                      className="w-full flex items-center justify-between p-3 rounded-2xl border border-white/10 bg-slate-950/50 hover:bg-blue-600/20 hover:border-blue-400/50 transition-all text-left group backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${account.color} flex items-center justify-center text-white shadow-sm`}>
                          {loadingRole === account.role ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{account.label} Demo</p>
                          <p className="text-[10px] text-slate-400">{account.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Log in <ArrowRight size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </main>

        {/* Translucent Glass Footer */}
        <footer className="py-6 px-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl text-center text-xs text-slate-300">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
