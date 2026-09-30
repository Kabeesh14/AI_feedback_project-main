import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { OFFICIAL_HOSTEL_FLOORS, type HostelFloor } from '@/types';

export const HOSTEL_FLOOR_OPTIONS: HostelFloor[] = [...OFFICIAL_HOSTEL_FLOORS];
export const ALL_FLOORS_VALUE = 'ALL';

interface HostelScopeContextType {
  selectedFloor: string; // 'ALL' or 'Ground Floor' ... '4th Floor'
  setSelectedFloor: (floor: string) => void;
  effectiveFloor: string | null; // null if ALL, or 'Ground Floor', etc.
  selectedFloorDisplay: string; // 'All Floors (Campus Residences)' or specific floor
  isAllFloors: boolean;
  canChangeScope: boolean;
  floorList: HostelFloor[];
}

const HostelScopeContext = createContext<HostelScopeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'feedbackiq_hostel_floor_scope';

export function HostelScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const isManagement = user?.role === 'management';
  const isHostelWarden = user?.role === 'hostel_warden';
  const isHostelStudent = user?.role === 'student' && user?.portal === 'hostel';

  const canChangeScope = Boolean(isManagement);

  const [selectedFloor, setSelectedFloorState] = useState<string>(() => {
    if (isHostelWarden) {
      return user?.assigned_floor || '1st Floor';
    }
    if (isHostelStudent) {
      return user?.floor || '1st Floor';
    }
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && (saved === ALL_FLOORS_VALUE || (HOSTEL_FLOOR_OPTIONS as string[]).includes(saved))) {
      return saved;
    }
    return ALL_FLOORS_VALUE;
  });

  // Sync state if user role or assigned floor changes
  useEffect(() => {
    if (isHostelWarden) {
      setSelectedFloorState(user?.assigned_floor || '1st Floor');
    } else if (isHostelStudent) {
      setSelectedFloorState(user?.floor || '1st Floor');
    }
  }, [user?.role, user?.assigned_floor, user?.floor, isHostelWarden, isHostelStudent]);

  const setSelectedFloor = (floor: string) => {
    if (!canChangeScope) return;
    setSelectedFloorState(floor);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, floor);
    } catch {
      // ignore storage errors
    }
  };

  const isAllFloors = selectedFloor === ALL_FLOORS_VALUE;
  const effectiveFloor = isAllFloors
    ? null
    : (isHostelWarden
        ? (user?.assigned_floor || '1st Floor')
        : isHostelStudent
        ? (user?.floor || '1st Floor')
        : selectedFloor);

  const selectedFloorDisplay = isAllFloors
    ? 'All Floors (Campus Residences)'
    : (effectiveFloor || 'All Floors (Campus Residences)');

  return (
    <HostelScopeContext.Provider
      value={{
        selectedFloor,
        setSelectedFloor,
        effectiveFloor,
        selectedFloorDisplay,
        isAllFloors,
        canChangeScope,
        floorList: HOSTEL_FLOOR_OPTIONS,
      }}
    >
      {children}
    </HostelScopeContext.Provider>
  );
}

export function useHostelScope() {
  const context = useContext(HostelScopeContext);
  if (!context) {
    throw new Error('useHostelScope must be used within a HostelScopeProvider');
  }
  return context;
}
