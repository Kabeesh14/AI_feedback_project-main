import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export const TOTAL_BUS_COUNT = 50;
export const BUS_OPTIONS = Array.from({ length: TOTAL_BUS_COUNT }, (_, i) => `Bus ${i + 1}`);
export const ALL_BUSES_VALUE = 'ALL';

interface BusScopeContextType {
  selectedBus: string; // 'ALL' or 'Bus 1' ... 'Bus 50'
  setSelectedBus: (bus: string) => void;
  effectiveBusNumber: string | null; // null if ALL, or 'Bus X'
  isAllBuses: boolean;
  canChangeScope: boolean;
  busList: string[];
}

const BusScopeContext = createContext<BusScopeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'feedbackiq_transport_bus_scope';

export function BusScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const isTransportIncharge = user?.role === 'transport_incharge';
  const isManagement = user?.role === 'management';
  const isBusIncharge = user?.role === 'bus_incharge';
  const isBusStudent = user?.role === 'student' && user?.portal === 'bus';

  const canChangeScope = Boolean(isTransportIncharge || isManagement);

  const [selectedBus, setSelectedBusState] = useState<string>(() => {
    if (isBusIncharge || isBusStudent) {
      return user?.bus_number || 'Bus 14';
    }
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && (saved === ALL_BUSES_VALUE || BUS_OPTIONS.includes(saved))) {
      return saved;
    }
    return ALL_BUSES_VALUE;
  });

  // Sync state if user role or assigned bus changes
  useEffect(() => {
    if (isBusIncharge || isBusStudent) {
      setSelectedBusState(user?.bus_number || 'Bus 14');
    }
  }, [user?.role, user?.bus_number, isBusIncharge, isBusStudent]);

  const setSelectedBus = (bus: string) => {
    if (!canChangeScope) return;
    setSelectedBusState(bus);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, bus);
    } catch {
      // ignore storage errors
    }
  };

  const isAllBuses = selectedBus === ALL_BUSES_VALUE;
  const effectiveBusNumber = isAllBuses
    ? null
    : (isBusIncharge || isBusStudent ? (user?.bus_number || 'Bus 14') : selectedBus);

  return (
    <BusScopeContext.Provider
      value={{
        selectedBus,
        setSelectedBus,
        effectiveBusNumber,
        isAllBuses,
        canChangeScope,
        busList: BUS_OPTIONS,
      }}
    >
      {children}
    </BusScopeContext.Provider>
  );
}

export function useBusScope() {
  const context = useContext(BusScopeContext);
  if (!context) {
    throw new Error('useBusScope must be used within a BusScopeProvider');
  }
  return context;
}
