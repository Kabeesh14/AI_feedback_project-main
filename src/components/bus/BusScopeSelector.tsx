import { useBusScope, ALL_BUSES_VALUE } from '@/context/BusScopeContext';
import { useAuth } from '@/context/AuthContext';
import { Bus, MapPin, Check, ChevronDown, Filter, X } from 'lucide-react';

interface BusScopeSelectorProps {
  className?: string;
  showBoardingPoint?: boolean;
}

export function BusScopeSelector({
  className = '',
  showBoardingPoint = true,
}: BusScopeSelectorProps) {
  const { user } = useAuth();
  const {
    selectedBus,
    setSelectedBus,
    effectiveBusNumber,
    isAllBuses,
    canChangeScope,
    busList,
  } = useBusScope();

  const isBusIncharge = user?.role === 'bus_incharge';
  const isStudent = user?.role === 'student' && user?.portal === 'bus';
  const boardingPoint = user?.boarding_point || 'Central Station';

  // For fixed-scope users (Bus Incharge & Student), show non-interactive pill
  if (!canChangeScope) {
    const assignedBus = user?.bus_number || 'Bus 14';
    return (
      <div
        className={`flex items-center gap-2.5 bg-white/[0.04] border border-white/10 px-3.5 py-2 rounded-xl text-xs text-slate-300 ${className}`}
        title={`Locked Scope: Assigned to ${assignedBus}`}
      >
        <Bus size={15} className="text-amber-400 shrink-0" />
        <span>
          Scope: <strong className="text-amber-300 font-bold">{assignedBus}</strong>
        </span>
        {showBoardingPoint && boardingPoint && (
          <>
            <span className="text-slate-600">|</span>
            <MapPin size={13} className="text-amber-400 shrink-0" />
            <span className="text-slate-400 truncate max-w-[140px]">{boardingPoint}</span>
          </>
        )}
      </div>
    );
  }

  // For Transport Incharge & Management: Interactive Bus 1-50 Dropdown
  return (
    <div
      className={`flex items-center flex-wrap gap-2.5 bg-slate-900/80 border border-white/10 hover:border-amber-400/40 focus-within:border-amber-400/60 px-3.5 py-1.5 rounded-xl text-xs text-slate-300 shadow-lg backdrop-blur-xl transition-all ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
          <Bus size={14} />
        </div>
        <label htmlFor="bus-scope-dropdown" className="font-semibold text-slate-400 whitespace-nowrap">
          Scope:
        </label>
      </div>

      <div className="relative flex items-center">
        <select
          id="bus-scope-dropdown"
          data-testid="bus-scope-dropdown"
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          aria-label="Select Bus Scope (Bus 1 to Bus 50)"
          className="appearance-none bg-slate-950/90 text-amber-300 font-bold text-xs pl-3 pr-8 py-1.5 rounded-lg border border-amber-500/30 hover:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer transition-colors shadow-inner"
        >
          <option value={ALL_BUSES_VALUE} className="bg-slate-900 text-slate-200">
            All Buses
          </option>
          <optgroup label="Buses (Bus 1 - 50)" className="bg-slate-900 text-amber-400 font-semibold">
            {busList.map((bus) => (
              <option key={bus} value={bus} className="bg-slate-900 text-amber-300 font-normal">
                {bus}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2 text-amber-400/80 pointer-events-none"
        />
      </div>

      {!isAllBuses && effectiveBusNumber && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
            <Check size={11} className="text-emerald-400" />
            {effectiveBusNumber} Only
          </span>
          <button
            type="button"
            onClick={() => setSelectedBus(ALL_BUSES_VALUE)}
            title="Reset to All Buses"
            className="text-slate-400 hover:text-white hover:bg-white/10 p-0.5 rounded transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
