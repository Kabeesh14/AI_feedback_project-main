import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Award,
  Building2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building,
  User,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronDown,
  Bus,
  Home,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  OFFICIAL_DEPARTMENTS,
  OFFICIAL_YEARS,
  OFFICIAL_SECTIONS,
  OFFICIAL_HOSTEL_FLOORS,
  type Department,
  type Role,
  type PortalType,
  type HostelFloor,
  type Year,
  type StudentSection,
} from '@/types';
import { apiClient } from '@/services/apiClient';
import loginClassroom from '@/assets/login-classroom.jpg';

const roleMeta: Record<Role, { label: string; portalName: string; icon: React.ElementType; color: string }> = {
  student: {
    label: 'Student',
    portalName: 'Student Portal',
    icon: GraduationCap,
    color: 'from-blue-600 to-indigo-600',
  },
  faculty: {
    label: 'Faculty',
    portalName: 'Faculty Portal',
    icon: BookOpen,
    color: 'from-emerald-600 to-teal-600',
  },
  hod: {
    label: 'Head of Department',
    portalName: 'HOD Portal',
    icon: Award,
    color: 'from-purple-600 to-indigo-600',
  },
  management: {
    label: 'Management',
    portalName: 'Executive Portal',
    icon: Building2,
    color: 'from-amber-600 to-orange-600',
  },
  bus_incharge: {
    label: 'Bus Incharge',
    portalName: 'Transport Portal',
    icon: Bus,
    color: 'from-amber-600 to-orange-600',
  },
  transport_incharge: {
    label: 'Transport Head',
    portalName: 'Transport Portal',
    icon: Bus,
    color: 'from-amber-600 to-orange-600',
  },
  hostel_warden: {
    label: 'Hostel Warden',
    portalName: 'Hostel Portal',
    icon: Home,
    color: 'from-emerald-600 to-teal-600',
  },
};

const roleRedirectPaths: Record<Role, string> = {
  student: '/student/dashboard',
  faculty: '/faculty/dashboard',
  hod: '/hod/dashboard',
  management: '/management/dashboard',
  bus_incharge: '/bus/dashboard',
  transport_incharge: '/bus/dashboard',
  hostel_warden: '/hostel/dashboard',
};

export function StudentGoogleRegistration() {
  const [searchParams] = useSearchParams();
  const regToken = searchParams.get('regToken');

  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  // Safely decode verified Google profile and requested role for read-only preview
  const tokenInfo = useMemo(() => {
    if (!regToken) return null;
    try {
      const parts = regToken.split('.');
      if (parts.length !== 3) return null;
      const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const parsed = JSON.parse(payloadStr);
      const validPurposes = ['google_account_registration', 'google_student_registration'];
      if (!validPurposes.includes(parsed.purpose) || !parsed.email) return null;
      return {
        email: parsed.email as string,
        name: (parsed.name as string) || '',
        role: ((parsed.role as Role) || 'student') as Role,
        portal: ((parsed.portal as PortalType) || 'education') as PortalType,
        exp: parsed.exp as number,
      };
    } catch {
      return null;
    }
  }, [regToken]);

  const isTokenExpired = tokenInfo?.exp ? Date.now() >= tokenInfo.exp * 1000 : false;
  const currentRole = tokenInfo?.role || 'student';
  const currentPortal = tokenInfo?.portal || 'education';
  const roleConfig = roleMeta[currentRole] || roleMeta.student;
  const RoleIcon = roleConfig.icon;

  const [name, setName] = useState(tokenInfo?.name || '');
  const [department, setDepartment] = useState<Department | ''>(
    currentRole === 'management' || currentPortal !== 'education' ? '' : 'Artificial Intelligence and Machine Learning'
  );
  const [year, setYear] = useState<Year | ''>('');
  const [section, setSection] = useState<StudentSection | ''>('');
  const [busNumber, setBusNumber] = useState('');
  const [boardingPoint, setBoardingPoint] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState<HostelFloor | ''>('');
  const [assignedFloor, setAssignedFloor] = useState<HostelFloor | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update name if tokenInfo is parsed after initial render
  useEffect(() => {
    if (tokenInfo?.name && !name) {
      setName(tokenInfo.name);
    }
  }, [tokenInfo, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regToken || !tokenInfo || isTokenExpired) {
      setErrorMsg('Your registration session has expired. Please continue with Google again.');
      return;
    }

    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (currentPortal === 'bus') {
      if (currentRole === 'bus_incharge' && !busNumber.trim()) {
        setErrorMsg('Please enter your assigned Bus Number (e.g. Bus 14).');
        return;
      }
    } else if (currentPortal === 'hostel') {
      if (currentRole === 'hostel_warden' && !assignedFloor) {
        setErrorMsg('Please select your assigned hostel floor.');
        return;
      }
      if (currentRole === 'student' && !floor) {
        setErrorMsg('Please select your hostel floor.');
        return;
      }
    } else {
      if (currentRole !== 'management' && !department) {
        setErrorMsg(`Please select your official department for ${roleConfig.label}.`);
        return;
      }

      // Student-only validation for Year and Section
      if (currentRole === 'student') {
        if (!year) {
          setErrorMsg('Please select your academic year (e.g. 1st Year, 2nd Year, 3rd Year, 4th Year).');
          return;
        }
        if (!section) {
          setErrorMsg('Please select your class section (A, B, C, or D).');
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, any> = {
        regToken,
        name: name.trim(),
        department: (currentPortal === 'education' && department) ? department : null,
        bus_number: busNumber.trim() || null,
        boarding_point: boardingPoint.trim() || null,
        room_number: roomNumber.trim() || null,
        floor: floor || null,
        assigned_floor: assignedFloor || null,
      };

      if (currentRole === 'student' && currentPortal === 'education') {
        payload.year = year as Year;
        payload.section = section as StudentSection;
      }

      const res = await apiClient.post('/auth/google/register', payload);

      if (res.success && res.data?.token) {
        await loginWithToken(res.data.token);
        const resolvedRole = (res.data.user?.role as Role) || currentRole;
        const resolvedPortal = (res.data.user?.portal as PortalType) || currentPortal;
        if (resolvedRole === 'student') {
          if (resolvedPortal === 'bus') navigate('/bus/dashboard', { replace: true });
          else if (resolvedPortal === 'hostel') navigate('/hostel/dashboard', { replace: true });
          else navigate('/student/dashboard', { replace: true });
        } else {
          navigate(roleRedirectPaths[resolvedRole] || '/student/dashboard', { replace: true });
        }
      } else {
        throw new Error(res.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[GoogleRegistration error]:', err);
      if (err.status === 409) {
        setErrorMsg('An account with this Google email already exists. Please return to login.');
      } else if (err.status === 400 && err.message?.toLowerCase().includes('expire')) {
        setErrorMsg('Your registration session has expired. Please continue with Google again.');
      } else {
        setErrorMsg(err.message || 'Failed to complete registration. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative h-screen w-full text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-hidden">
      
      {/* 100vw × 100vh FIXED FULL-SCREEN BACKGROUND IMAGE */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${loginClassroom})` }}
      />

      {/* TRANSLUCENT OVERLAY */}
      <div className="fixed inset-0 w-full h-full bg-slate-950/35 backdrop-blur-[1px] z-10 pointer-events-none" />

      {/* FIXED PAGE CONTENT WRAPPER */}
      <div className="relative z-20 flex flex-col justify-between h-screen w-full overflow-hidden">

        {/* Fixed Glass Top Navbar */}
        <header className="flex-shrink-0 px-6 py-3.5 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">FEEDBACKIQ</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {roleConfig.portalName}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to={`/login?role=${currentRole}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all"
              >
                <ArrowLeft size={14} />
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex items-center justify-center px-4 py-3 sm:py-6 min-h-0 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-2xl shadow-2xl p-6 sm:p-9 text-slate-100 relative">
            
            {/* Header Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${roleConfig.color} flex items-center justify-center text-white shadow-lg`}>
                <RoleIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {roleConfig.label} Registration Setup
                </h2>
                <p className="text-xs text-slate-400">Complete your institutional profile with Google</p>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-400" />
                <span className="flex-1 leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Expired or Missing Token Guard */}
            {(!regToken || !tokenInfo || isTokenExpired) ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registration Session Expired</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    Your temporary Google registration session has expired or is invalid. Please sign in with Google again to continue.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  <ArrowLeft size={16} />
                  <span>Return to Login</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Assigned Institutional Role (Read-Only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Institutional Role
                  </label>
                  <div className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between text-sm">
                    <span className="font-bold text-white flex items-center gap-2">
                      <RoleIcon size={16} className="text-blue-400" />
                      {roleConfig.label}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Verified from Portal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your role is cryptographically bound to this Google sign-in session.
                  </p>
                </div>

                {/* Read-Only Verified Google Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Verified Google Account
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={tokenInfo.email}
                      className="w-full pl-10 pr-28 py-3 rounded-2xl border border-white/10 bg-white/5 text-slate-300 font-medium text-sm cursor-not-allowed select-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                        <ShieldCheck size={12} />
                        Verified
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your FeedbackIQ account will be linked to this verified Google email.
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="user-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={16} />
                    </div>
                    <input
                      id="user-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Portal Specific Configuration */}
                {currentPortal === 'bus' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bus-number" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Bus Number {currentRole === 'bus_incharge' && <span className="text-rose-400">*</span>}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Bus size={16} />
                        </div>
                        <input
                          id="bus-number"
                          type="text"
                          required={currentRole === 'bus_incharge'}
                          value={busNumber}
                          onChange={(e) => setBusNumber(e.target.value)}
                          placeholder="e.g. Bus 14"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="boarding-point" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Boarding Point
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Bus size={16} />
                        </div>
                        <input
                          id="boarding-point"
                          type="text"
                          value={boardingPoint}
                          onChange={(e) => setBoardingPoint(e.target.value)}
                          placeholder="e.g. Tambaram Railway Station"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentPortal === 'hostel' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentRole === 'hostel_warden' ? (
                      <div>
                        <label htmlFor="assigned-floor" className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Assigned Floor <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Home size={16} />
                          </div>
                          <select
                            id="assigned-floor"
                            required
                            value={assignedFloor}
                            onChange={(e) => setAssignedFloor(e.target.value as HostelFloor)}
                            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-white/10 bg-slate-900/95 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-slate-900 text-slate-400">Select Floor</option>
                            {OFFICIAL_HOSTEL_FLOORS.map((f) => (
                              <option key={f} value={f} className="bg-slate-900 text-white py-1">{f}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label htmlFor="hostel-floor" className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Floor <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <Home size={16} />
                            </div>
                            <select
                              id="hostel-floor"
                              required
                              value={floor}
                              onChange={(e) => setFloor(e.target.value as HostelFloor)}
                              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-white/10 bg-slate-900/95 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">Select Floor</option>
                              {OFFICIAL_HOSTEL_FLOORS.map((f) => (
                                <option key={f} value={f} className="bg-slate-900 text-white py-1">{f}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                              <ChevronDown size={16} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="room-number" className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Room Number
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <Home size={16} />
                            </div>
                            <input
                              id="room-number"
                              type="text"
                              value={roomNumber}
                              onChange={(e) => setRoomNumber(e.target.value)}
                              placeholder="e.g. 204"
                              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {currentPortal === 'education' && (
                  <>
                    {/* Department Selection */}
                    <div>
                      <label htmlFor="user-dept" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Academic Department {currentRole !== 'management' && <span className="text-rose-400">*</span>}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Building size={16} />
                        </div>
                        <select
                          id="user-dept"
                          required={currentRole !== 'management'}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value as Department)}
                          className="w-full pl-10 pr-10 py-3 rounded-2xl border border-white/10 bg-slate-900/95 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-slate-900 text-slate-400">
                            {currentRole === 'management' ? 'Campus-wide / All Departments' : 'Select Department'}
                          </option>
                          {OFFICIAL_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept} className="bg-slate-900 text-white py-1">
                              {dept}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {currentRole === 'management'
                          ? 'Management has cross-department oversight; you may select a primary department or leave as Campus-wide.'
                          : `Select your assigned department for ${roleConfig.label} access.`}
                      </p>
                    </div>

                    {/* Student Academic Year & Section (Exclusively for Student Role) */}
                    {currentRole === 'student' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Year Selection */}
                        <div>
                          <label htmlFor="student-year" className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Academic Year <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <GraduationCap size={16} />
                            </div>
                            <select
                              id="student-year"
                              required
                              value={year}
                              onChange={(e) => setYear(e.target.value as Year)}
                              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-white/10 bg-slate-900/95 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">
                                Select Year
                              </option>
                              {OFFICIAL_YEARS.map((y) => (
                                <option key={y} value={y} className="bg-slate-900 text-white py-1">
                                  {y}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                              <ChevronDown size={16} />
                            </div>
                          </div>
                        </div>

                        {/* Section Selection */}
                        <div>
                          <label htmlFor="student-section" className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Class Section <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <BookOpen size={16} />
                            </div>
                            <select
                              id="student-section"
                              required
                              value={section}
                              onChange={(e) => setSection(e.target.value as StudentSection)}
                              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-white/10 bg-slate-900/95 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">
                                Select Section
                              </option>
                              {OFFICIAL_SECTIONS.map((sec) => (
                                <option key={sec} value={sec} className="bg-slate-900 text-white py-1">
                                  Section {sec}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                              <ChevronDown size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup & Go to Dashboard</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <Link
                    to={`/login?role=${currentRole}`}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Already have an account? Sign in with Email & Password
                  </Link>
                </div>

              </form>
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
