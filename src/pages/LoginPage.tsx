import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  UserCog,
  Building2,
  Loader2,
  Building,
  ChevronDown,
  Bus,
  Home,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_DEPARTMENTS, type Role, type PortalType, type Department } from '@/types';
import loginClassroom from '@/assets/login-classroom.jpg';

interface RoleTabConfig {
  role: Role;
  label: string;
  btnLabel: string;
  idLabel: string;
  idPlaceholder: string;
  icon: React.ElementType;
}

const educationRoleTabs: RoleTabConfig[] = [
  { role: 'student', label: 'Student', btnLabel: 'Sign In as Student', idLabel: 'Register Number / College Email', idPlaceholder: 'e.g. 2024CS001 or student@college.edu', icon: GraduationCap },
  { role: 'faculty', label: 'Faculty', btnLabel: 'Sign In as Faculty', idLabel: 'Faculty ID / College Email', idPlaceholder: 'e.g. FAC-102 or faculty@college.edu', icon: Sparkles },
  { role: 'hod', label: 'HOD', btnLabel: 'Sign In as HOD', idLabel: 'HOD ID / College Email', idPlaceholder: 'e.g. HOD-AI or hod@college.edu', icon: UserCog },
  { role: 'management', label: 'Management', btnLabel: 'Sign In as Management', idLabel: 'Management ID / College Email', idPlaceholder: 'e.g. MGT-01 or management@college.edu', icon: Building2 },
];

const busRoleTabs: RoleTabConfig[] = [
  { role: 'student', label: 'Student', btnLabel: 'Sign In as Bus Student', idLabel: 'Student Email / ID', idPlaceholder: 'e.g. student@college.edu', icon: GraduationCap },
  { role: 'bus_incharge', label: 'Bus Incharge', btnLabel: 'Sign In as Bus Incharge', idLabel: 'Bus Incharge Email', idPlaceholder: 'e.g. busincharge.test@feedbackiq.com', icon: Bus },
  { role: 'transport_incharge', label: 'Transport Head', btnLabel: 'Sign In as Transport Incharge', idLabel: 'Transport Incharge Email', idPlaceholder: 'e.g. transport.test@feedbackiq.com', icon: Bus },
  { role: 'management', label: 'Management', btnLabel: 'Sign In as Management', idLabel: 'Management Email', idPlaceholder: 'e.g. management.test@feedbackiq.com', icon: Building2 },
];

const hostelRoleTabs: RoleTabConfig[] = [
  { role: 'student', label: 'Student', btnLabel: 'Sign In as Hostel Student', idLabel: 'Student Email / ID', idPlaceholder: 'e.g. student@college.edu', icon: GraduationCap },
  { role: 'hostel_warden', label: 'Hostel Warden', btnLabel: 'Sign In as Hostel Warden', idLabel: 'Hostel Warden Email', idPlaceholder: 'e.g. warden.test@feedbackiq.com', icon: Home },
  { role: 'management', label: 'Management', btnLabel: 'Sign In as Management', idLabel: 'Management Email', idPlaceholder: 'e.g. management.test@feedbackiq.com', icon: Building2 },
];

const allRoleTabs = [...educationRoleTabs, ...busRoleTabs, ...hostelRoleTabs];

const roleRedirectPaths: Record<Role, string> = {
  student: '/student/dashboard',
  faculty: '/faculty/dashboard',
  hod: '/hod/dashboard',
  management: '/management/dashboard',
  bus_incharge: '/bus/dashboard',
  transport_incharge: '/bus/dashboard',
  hostel_warden: '/hostel/dashboard',
};

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const roleFromUrl = (searchParams.get('role') as Role) || 'student';
  const portalFromUrl = (searchParams.get('portal') as PortalType) || 'education';
  
  const initialPortal: PortalType = ['education', 'bus', 'hostel'].includes(portalFromUrl)
    ? portalFromUrl
    : (roleFromUrl === 'bus_incharge' || roleFromUrl === 'transport_incharge')
    ? 'bus'
    : roleFromUrl === 'hostel_warden'
    ? 'hostel'
    : 'education';

  const [selectedPortal, setSelectedPortal] = useState<PortalType>(initialPortal);
  const [selectedRole, setSelectedRole] = useState<Role>(roleFromUrl);

  const availableRoleTabs = useMemo(() => {
    if (selectedPortal === 'bus') return busRoleTabs;
    if (selectedPortal === 'hostel') return hostelRoleTabs;
    return educationRoleTabs;
  }, [selectedPortal]);

  // Ensure selectedRole is valid for current portal
  useEffect(() => {
    const isValid = availableRoleTabs.some(t => t.role === selectedRole);
    if (!isValid) {
      setSelectedRole(availableRoleTabs[0].role);
    }
  }, [availableRoleTabs, selectedRole]);

  const currentRoleTab = useMemo(() => {
    return availableRoleTabs.find(r => r.role === selectedRole) || availableRoleTabs[0];
  }, [availableRoleTabs, selectedRole]);

  const [selectedDept, setSelectedDept] = useState<Department | ''>(
    selectedRole === 'management' || selectedPortal !== 'education'
      ? ''
      : 'Artificial Intelligence & Data Science'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();

  // Process query parameters from OAuth redirects or callbacks
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const tokenParam = searchParams.get('token');
    const roleParam = searchParams.get('role') as Role | null;
    const portalParam = searchParams.get('portal') as PortalType | null;

    if (errorParam) {
      setErrorMsg(decodeURIComponent(errorParam));
    } else if (tokenParam) {
      (async () => {
        setLoadingRole(roleParam || 'student');
        setErrorMsg(null);
        try {
          const authenticatedUser = await loginWithToken(tokenParam);
          const targetRole = authenticatedUser.role || roleParam || 'student';
          const targetPortal = authenticatedUser.portal || portalParam || selectedPortal;
          if (targetRole === 'student') {
            if (targetPortal === 'bus') navigate('/bus/dashboard', { replace: true });
            else if (targetPortal === 'hostel') navigate('/hostel/dashboard', { replace: true });
            else navigate('/student/dashboard', { replace: true });
          } else if (targetRole === 'management') {
            if (targetPortal === 'bus') navigate('/bus/dashboard', { replace: true });
            else if (targetPortal === 'hostel') navigate('/hostel/dashboard', { replace: true });
            else navigate('/management/dashboard', { replace: true });
          } else {
            navigate(roleRedirectPaths[targetRole] || '/student/dashboard', { replace: true });
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to authenticate session with Google token.');
        } finally {
          setLoadingRole(null);
        }
      })();
    }
  }, [searchParams, loginWithToken, navigate, selectedPortal]);

  const getEffectivePortal = (): PortalType => {
    if (selectedRole === 'bus_incharge' || selectedRole === 'transport_incharge') return 'bus';
    if (selectedRole === 'hostel_warden') return 'hostel';
    if (selectedRole === 'student') return selectedPortal;
    if (selectedRole === 'management') return selectedPortal;
    return 'education';
  };

  const handleGoogleSignIn = () => {
    if (selectedRole !== 'student') {
      setErrorMsg('Google sign-in is only available for students.');
      return;
    }
    setErrorMsg(null);
    const effectivePortal = getEffectivePortal();
    const apiUrl = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://ai-feedback-project-main.onrender.com/api' : 'http://localhost:5000/api')).replace(/\/+$/, '');
    window.location.href = `${apiUrl}/auth/google?role=student&portal=${encodeURIComponent(effectivePortal)}`;
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email/ID and password.');
      return;
    }

    const effectivePortal = getEffectivePortal();

    if (
      (selectedRole === 'student' && effectivePortal === 'education') ||
      selectedRole === 'faculty' ||
      selectedRole === 'hod'
    ) {
      if (!selectedDept) {
        setErrorMsg('Please select your department to continue.');
        return;
      }
    }

    setLoadingRole(selectedRole);
    setErrorMsg(null);
    try {
      await login(
        email.trim(),
        selectedRole,
        selectedDept || null,
        password,
        effectivePortal
      );

      if (selectedRole === 'student') {
        if (effectivePortal === 'bus') navigate('/bus/dashboard');
        else if (effectivePortal === 'hostel') navigate('/hostel/dashboard');
        else navigate('/student/dashboard');
      } else if (selectedRole === 'management') {
        if (effectivePortal === 'bus') navigate('/bus/dashboard');
        else if (effectivePortal === 'hostel') navigate('/hostel/dashboard');
        else navigate('/management/dashboard');
      } else {
        navigate(roleRedirectPaths[selectedRole]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="relative h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-hidden">
      
      {/* 100vw × 100vh FIXED FULL-SCREEN CLASSROOM BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${loginClassroom})` }}
      />

      {/* LIGHT/MODERATE TRANSLUCENT OVERLAY */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/30 backdrop-blur-[1px] z-10 pointer-events-none" />

      {/* FIXED PAGE CONTENT WRAPPER */}
      <div className="relative z-20 flex flex-col justify-between h-screen w-full overflow-hidden">

        {/* Fixed Glass Top Navbar */}
        <header className="flex-shrink-0 px-6 py-3.5 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">FEEDBACKIQ</h1>
                <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">
                  {selectedPortal.toUpperCase()} PORTAL
                </p>
              </div>
            </Link>

            {/* Right side navigation (Light mode toggle removed) */}
            <div className="flex items-center gap-3">
              <Link
                to={`/role-selection?portal=${selectedPortal}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all backdrop-blur-md"
              >
                <ArrowLeft size={14} />
                <span>Back to Roles</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area: Floating Glassmorphism Login Card */}
        <main className="flex-1 flex items-center justify-center lg:justify-end max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 sm:py-6 min-h-0 overflow-y-auto lg:overflow-visible">
          
          {/* FLOATING GLASSMORPHISM CARD */}
          <div className="w-full max-w-lg rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 p-7 sm:p-9 text-slate-100">
            
            {/* Header */}
            <div className="mb-6 text-center sm:text-left">
              <div className="flex items-center justify-between mb-3 text-xs">
                <Link
                  to={`/role-selection?portal=${selectedPortal}`}
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Role Selection</span>
                </Link>
                <Link
                  to="/portal-selection"
                  className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Switch Portal</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              {/* Context Badge */}
              {selectedPortal === 'bus' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mb-2">
                  <Bus size={13} />
                  <span>Bus Portal · {currentRoleTab.label} Login</span>
                </div>
              )}
              {selectedPortal === 'hostel' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold mb-2">
                  <Home size={13} />
                  <span>Hostel Portal · {currentRoleTab.label} Login</span>
                </div>
              )}
              {selectedPortal === 'education' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-2">
                  <GraduationCap size={13} />
                  <span>Education Portal · {currentRoleTab.label} Login</span>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
                {selectedPortal === 'bus' ? 'Bus Portal' : selectedPortal === 'hostel' ? 'Hostel Portal' : 'Education Portal'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Sign in as <span className="font-semibold text-white">{currentRoleTab.label}</span> to continue
              </p>
            </div>

            {/* Interactive Role Selector for Current Portal */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Your Role
                </label>
                <span className="text-[11px] text-slate-400 font-medium capitalize">
                  {selectedPortal} Portal
                </span>
              </div>
              
              <div className={`grid ${availableRoleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-1.5 p-1.5 rounded-2xl bg-slate-950/70 border border-white/10 backdrop-blur-md`}>
                {availableRoleTabs.map(tab => {
                  const isActive = selectedRole === tab.role;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(tab.role);
                        setErrorMsg(null);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="truncate">{tab.label}</span>
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
            <form onSubmit={handleFormLogin} className="space-y-4 mb-4">
              
              {/* Department Dropdown for Academic Roles in Education */}
              {selectedPortal === 'education' && selectedRole !== 'bus_incharge' && selectedRole !== 'transport_incharge' && selectedRole !== 'hostel_warden' && (
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
                      <span>💡 Management has access to all departments or can focus on a specific department.</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  {currentRoleTab.idLabel}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={currentRoleTab.idPlaceholder}
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
                  onClick={() => alert('Please contact your institutional administrator or IT support to reset your credentials.')}
                  className="text-blue-400 font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Dynamic Sign In Button */}
              <button
                type="submit"
                disabled={!!loadingRole}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingRole ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>{currentRoleTab.btnLabel}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Continue with Google - Exclusively available for student role across all three portals */}
            {selectedRole === 'student' && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-slate-900/90 px-3 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                      Or
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="google-signin-button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 px-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 backdrop-blur-md shadow-sm hover:border-white/25 cursor-pointer"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

          </div>

        </main>

        {/* Translucent Glass Footer */}
        <footer className="flex-shrink-0 py-3 px-6 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl text-center text-xs text-slate-300">
          <p className="font-semibold text-white">FEEDBACKIQ · Institutional Feedback Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}
