import { useState, useRef, useEffect } from 'react';
import { useHostelScope, ALL_FLOORS_VALUE } from '@/context/HostelScopeContext';
import { useAuth } from '@/context/AuthContext';
import { Building2, Layers, Check, ChevronDown, X, Home } from 'lucide-react';

interface HostelScopeSelectorProps {
  className?: string;
}

export function HostelScopeSelector({ className = '' }: HostelScopeSelectorProps) {
  const { user } = useAuth();
  const {
    selectedFloor,
    setSelectedFloor,
    effectiveFloor,
    isAllFloors,
    canChangeScope,
    floorList,
  } = useHostelScope();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // For fixed-scope users (Hostel Warden & Student), show non-interactive pill
  if (!canChangeScope) {
    const assignedFloor = user?.assigned_floor || user?.floor || '1st Floor';
    return (
      <div
        className={`flex items-center gap-2.5 bg-white/[0.04] border border-white/10 px-3.5 py-2 rounded-xl text-xs text-slate-300 ${className}`}
        title={`Assigned Scope: ${assignedFloor}`}
      >
        <Building2 size={15} className="text-purple-400 shrink-0" />
        <span>
          Scope: <strong className="text-purple-300 font-bold">{assignedFloor}</strong>
        </span>
      </div>
    );
  }

  const handleSelectFloor = (floor: string) => {
    setSelectedFloor(floor);
    setIsOpen(false);
  };

  // For Management: Interactive "Select Floor" button and dropdown selector
  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center flex-wrap gap-2.5 bg-slate-900/80 border border-purple-500/25 hover:border-purple-400/50 focus-within:border-purple-400/60 p-1.5 px-3 rounded-2xl text-xs text-slate-200 shadow-[0_4px_20px_rgba(168,85,247,0.12)] backdrop-blur-xl transition-all ${className}`}
    >
      {/* Icon & Label */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
          <Layers size={15} />
        </div>
        <span className="font-semibold text-slate-400 hidden sm:inline whitespace-nowrap">
          Floor Scope:
        </span>
      </div>

      {/* Select Floor Trigger Button */}
      <div className="relative">
        <button
          type="button"
          id="select-floor-btn"
          data-testid="select-floor-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-xs transition-all border ${
            isOpen
              ? 'bg-purple-600/30 border-purple-400/60 text-white shadow-lg shadow-purple-500/20'
              : 'bg-purple-950/40 hover:bg-purple-900/40 border-purple-500/30 text-purple-200 hover:text-white'
          }`}
        >
          <Building2 size={14} className="text-purple-400 shrink-0" />
          <span className="font-bold tracking-wide">
            Select Floor
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-semibold">
            {isAllFloors ? 'All Floors' : effectiveFloor}
          </span>
          <ChevronDown
            size={14}
            className={`text-purple-400/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Floating Dropdown Popover */}
        {isOpen && (
          <div
            role="listbox"
            aria-label="Hostel Floor Options"
            className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-[#0d0f1f]/95 border border-purple-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1.5 mb-1.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300/80 flex items-center gap-1.5">
                <Home size={12} />
                Available Hostel Floors
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {floorList.length + 1} options
              </span>
            </div>

            {/* All Floors Option */}
            <button
              type="button"
              role="option"
              aria-selected={isAllFloors}
              onClick={() => handleSelectFloor(ALL_FLOORS_VALUE)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all mb-1 ${
                isAllFloors
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    isAllFloors
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Home size={13} />
                </div>
                <div>
                  <p className="font-semibold leading-tight">All Floors</p>
                  <p className="text-[10px] text-slate-400">Campus Residences</p>
                </div>
              </div>
              {isAllFloors && <Check size={14} className="text-purple-300" />}
            </button>

            {/* Individual Floor Options */}
            <div className="space-y-1">
              {floorList.map((floor) => {
                const isSelected = selectedFloor === floor;
                return (
                  <button
                    key={floor}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectFloor(floor)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          isSelected
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-white/5 text-purple-400'
                        }`}
                      >
                        <Building2 size={13} />
                      </div>
                      <span className="leading-tight">{floor}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-purple-300" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accessible native select for assistive technologies */}
      <select
        id="hostel-floor-select"
        data-testid="hostel-floor-select"
        value={selectedFloor}
        onChange={(e) => setSelectedFloor(e.target.value)}
        aria-label="Hostel Floor Selection"
        className="sr-only"
      >
        <option value={ALL_FLOORS_VALUE}>All Floors (Campus Residences)</option>
        {floorList.map((floor) => (
          <option key={floor} value={floor}>{floor}</option>
        ))}
      </select>

      {/* Filter Active Pill + Clear Button */}
      {!isAllFloors && effectiveFloor && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            <Check size={11} className="text-emerald-400" />
            {effectiveFloor} Active
          </span>
          <button
            type="button"
            onClick={() => setSelectedFloor(ALL_FLOORS_VALUE)}
            title="Reset to All Floors"
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
