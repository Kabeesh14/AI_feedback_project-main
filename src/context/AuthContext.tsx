import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role, Department } from '@/types';

export interface AuthUser {
  userId: string;
  userName: string;
  name: string;
  email: string;
  role: Role;
  department: Department | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, role: Role, department?: Department | null) => void;
  logout: () => void;
  loginAsRole: (role: Role, department?: Department | null) => void;
  setDepartment: (department: Department | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const roleConfig: Record<Role, { userId: string; email: string; userName: string; name: string; department: Department | null }> = {
  student: { userId: 'STU-001', email: 'student@demo.com', userName: 'Student', name: 'Alex Morgan', department: 'Artificial Intelligence & Data Science' },
  hod: { userId: 'HOD-001', email: 'hod@demo.com', userName: 'Dr. Sarah Chen', name: 'Dr. Sarah Chen', department: 'Artificial Intelligence & Data Science' },
  management: { userId: 'MGT-001', email: 'management@demo.com', userName: 'Management', name: 'Prof. James Wilson', department: null },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (email: string, role: Role, department?: Department | null) => {
    const config = roleConfig[role];
    const resolvedDept = department !== undefined ? department : config.department;
    setUser({
      userId: config.userId,
      userName: config.userName,
      name: config.name,
      email: email || config.email,
      role,
      department: resolvedDept,
    });
  };

  const loginAsRole = (role: Role, department?: Department | null) => {
    const config = roleConfig[role];
    const resolvedDept = department !== undefined ? department : config.department;
    setUser({
      userId: config.userId,
      userName: config.userName,
      name: config.name,
      email: config.email,
      role,
      department: resolvedDept,
    });
  };

  const setDepartment = (dept: Department | null) => {
    setUser(prev => prev ? { ...prev, department: dept } : null);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, loginAsRole, setDepartment }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
