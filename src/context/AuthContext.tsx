import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role, Department, Year, PortalType, HostelFloor } from '@/types';
import { apiClient, setToken, clearToken, getToken, onUnauthorized } from '@/services/apiClient';

export interface AuthUser {
  userId: string;
  userName: string;
  name: string;
  email: string;
  role: Role;
  portal: PortalType;
  department: Department | null;
  departmentId?: number | null;
  year?: Year | null;
  section?: string | null;
  bus_number?: string | null;
  boarding_point?: string | null;
  room_number?: string | null;
  floor?: HostelFloor | null;
  assigned_floor?: HostelFloor | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, role?: Role, department?: Department | null, password?: string, portal?: PortalType) => Promise<void>;
  loginWithToken: (token: string) => Promise<AuthUser>;
  logout: () => void;
  loginAsRole: (role: Role, department?: Department | null) => Promise<void>;
  setDepartment: (department: Department | null) => void;
  switchPortal: (portal: PortalType) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapBackendUserToAuthUser(raw: any): AuthUser {
  return {
    userId: String(raw.id || raw.userId || 'USER-001'),
    userName: raw.name || raw.userName || 'User',
    name: raw.name || 'User',
    email: raw.email || '',
    role: (raw.role?.toLowerCase() || 'student') as Role,
    portal: (raw.portal?.toLowerCase() || 'education') as PortalType,
    department: (raw.department as Department) || null,
    departmentId: raw.department_id != null ? Number(raw.department_id) : (raw.departmentId != null ? Number(raw.departmentId) : null),
    year: (raw.year as Year) || null,
    section: (raw.section as string) || null,
    bus_number: raw.bus_number || raw.busNumber || null,
    boarding_point: raw.boarding_point || raw.boardingPoint || null,
    room_number: raw.room_number || raw.roomNumber || null,
    floor: (raw.floor as HostelFloor) || null,
    assigned_floor: (raw.assigned_floor || raw.assignedFloor) as HostelFloor || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session on mount from localStorage token
  useEffect(() => {
    async function restoreSession() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        if (res.success && res.data?.user) {
          setUser(mapBackendUserToAuthUser(res.data.user));
        } else {
          clearToken();
          setUser(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Session restore failed:', err);
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Listen for 401 unauthorized triggers across the app
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
    });

    return unsubscribe;
  }, []);

  const login = async (
    email: string,
    role?: Role,
    department?: Department | null,
    password?: string,
    portal?: PortalType
  ): Promise<void> => {
    setLoading(true);
    try {
      const loginPayload: { email: string; password: string; role?: string; portal?: string } = {
        email: email.trim().toLowerCase(),
        password: password || 'password123',
      };

      if (role) {
        loginPayload.role = role;
      }

      if (portal) {
        loginPayload.portal = portal;
      }

      const res = await apiClient.post('/auth/login', loginPayload);

      if (res.success && res.data?.token && res.data?.user) {
        setToken(res.data.token);
        const mapped = mapBackendUserToAuthUser(res.data.user);
        setUser(mapped);
      } else {
        throw new Error(res.message || 'Login failed: Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsRole = async (role: Role, department?: Department | null): Promise<void> => {
    let email = `${role}@demo.com`;

    // Map specific departments to official demo accounts if selected
    if (role === 'hod') {
      if (department === 'Civil Engineering') {
        email = 'hod.civil@college.edu';
      } else if (department === 'Computer Science & Engineering') {
        email = 'hod.cse@college.edu';
      } else {
        email = 'hod@demo.com';
      }
    } else if (role === 'student') {
      if (department === 'Civil Engineering') {
        email = 'student.civil@college.edu';
      } else if (department === 'Information Technology') {
        email = 'student.it@college.edu';
      } else {
        email = 'student@demo.com';
      }
    } else if (role === 'faculty') {
      email = 'faculty@demo.com';
    } else if (role === 'management') {
      email = 'management@demo.com';
    }

    await login(email, role, department, 'password123');
  };

  const loginWithToken = async (token: string): Promise<AuthUser> => {
    setLoading(true);
    try {
      setToken(token);
      const res = await apiClient.get('/auth/me');
      if (res.success && res.data?.user) {
        const mapped = mapBackendUserToAuthUser(res.data.user);
        setUser(mapped);
        return mapped;
      } else {
        clearToken();
        throw new Error(res.message || 'Invalid or expired session token.');
      }
    } catch (err: any) {
      clearToken();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setDepartment = (dept: Department | null) => {
    setUser(prev => (prev ? { ...prev, department: dept } : null));
  };

  const switchPortal = (portal: PortalType) => {
    setUser(prev => {
      if (!prev) return null;
      if (prev.role === 'management') {
        return { ...prev, portal };
      }
      return prev;
    });
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout, loginAsRole, setDepartment, switchPortal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
