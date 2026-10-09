import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { addFeedback } from '@/services/feedbackService';
import { ImageUpload } from '@/components/common/ImageUpload';
import {
  AlertTriangle,
  Building,
  Send,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  MapPin,
  FileText,
  ShieldCheck,
  Info,
  Layers,
  Flame,
  Check,
  ChevronDown
} from 'lucide-react';
import type { Severity } from '@/types';

export const CAMPUS_FACILITY_CATEGORIES = [
  { id: 'Library', label: 'Library', icon: '📚', desc: 'Books, reading halls, digital library, study rooms' },
  { id: 'Food / Canteen', label: 'Food / Canteen', icon: '🍽️', desc: 'Cafeteria hygiene, food quality, seating, billing' },
  { id: 'Classroom', label: 'Classroom', icon: '🏫', desc: 'Projectors, whiteboards, ventilation, acoustics' },
  { id: 'Laboratory', label: 'Laboratory', icon: '🔬', desc: 'Lab equipment, chemical safety, computer hardware' },
  { id: 'Restroom', label: 'Restroom', icon: '🚻', desc: 'Sanitation, water availability, handwash, cleanliness' },
  { id: 'Furniture / Infrastructure', label: 'Furniture / Infrastructure', icon: '🪑', desc: 'Desks, benches, podiums, doors, windows, railings' },
  { id: 'Computer / IT', label: 'Computer / IT', icon: '💻', desc: 'Campus Wi-Fi, lab systems, network ports, server access' },
  { id: 'Electricity', label: 'Electricity', icon: '⚡', desc: 'Power cuts, sockets, lighting, fans, AC units, UPS' },
  { id: 'Other campus facilities', label: 'Other Facilities', icon: '🏢', desc: 'Grounds, parking, sports facilities, corridors' },
] as const;

export function StudentReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<string>(CAMPUS_FACILITY_CATEGORIES[0].id);
  const selectedCategoryInfo = CAMPUS_FACILITY_CATEGORIES.find(c => c.id === category) || CAMPUS_FACILITY_CATEGORIES[0];
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedIssueCode, setSubmittedIssueCode] = useState<string | null>(null);

  const studentDept = user?.department || 'Artificial Intelligence & Data Science';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide a detailed issue description (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Map severity to rating (1 for critical, 2 for high, 3 for medium, 4 for low)
      const effectiveRating = severity === 'critical' ? 1 : severity === 'high' ? 2 : 3;

      const fullComment = location.trim()
        ? `[Location: ${location.trim()}] ${description.trim()}`
        : description.trim();

      const created = await addFeedback({
        comment: fullComment,
        category: category as any,
        rating: effectiveRating,
        portal: 'education',
        department: studentDept as any,
        sentiment: 'negative',
        theme: category,
        issue: category,
        severity,
        status: 'submitted',
        anonymous: isAnonymous,
        imageUrl: imageUrl || null,
        studentId: String((user as any)?.id || 'student'),
        date: new Date().toISOString(),
      });

      setSubmittedIssueCode((created as any)?.feedback_code || (created as any)?.id || 'SUBMITTED');
    } catch (err: any) {
      console.error('[StudentReportIssue] Submission error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to report campus issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCategory(CAMPUS_FACILITY_CATEGORIES[0].id);
    setLocation('');
    setDescription('');
    setSeverity('medium');
    setImageUrl(null);
    setIsAnonymous(false);
    setError(null);
    setSubmittedIssueCode(null);
  };

  if (submittedIssueCode) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in duration-500 font-['Onest',sans-serif]">
        <Card className="p-8 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] rounded-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/40 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="info" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
              Issue Successfully Logged
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Campus Facility Issue Reported
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto">
              Your issue report has been recorded in the Education Portal and routed to the campus administration and AI diagnostic cluster.
            </p>
          </div>

          <div className="p-4 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Reference ID:</span>
              <span className="font-mono font-bold text-cyan-500 dark:text-cyan-400">{submittedIssueCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Facility Area:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Severity:</span>
              <span className="font-semibold uppercase tracking-wider text-amber-500">{severity}</span>
            </div>
            {imageUrl && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Supporting Evidence:</span>
                <span className="text-emerald-500 font-medium">Uploaded to Cloud</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full sm:w-auto"
            >
              Report Another Issue
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/student/history')}
              className="w-full sm:w-auto shadow-md shadow-cyan-500/20"
            >
              View in My Feedback History
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-['Onest',sans-serif]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors mb-2"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Report Campus Facility Issue
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Report broken equipment, maintenance needs, or service interruptions in campus facilities
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="info" className="px-3 py-1 text-xs">
            {studentDept}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Facility Area */}
        <Card className="p-5 sm:p-6 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                1
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Select Facility Area
              </h2>
            </div>
            <span className="text-xs text-slate-400">Required</span>
          </div>

          {/* Selection Dropdown Button */}
          <div className="relative">
            <label htmlFor="facility-area-select" className="sr-only">Facility Area</label>
            <select
              id="facility-area-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 appearance-none cursor-pointer shadow-sm font-medium transition-all"
            >
              {CAMPUS_FACILITY_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-slate-900 text-white py-2">
                  {cat.icon} {cat.label} ({cat.desc})
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown size={18} />
            </div>
          </div>

          {/* Compact Quick Selection Buttons */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Selection Buttons
            </p>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_FACILITY_CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-300'
                        : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {isSelected && <Check size={12} strokeWidth={3} className="ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Facility Information Banner */}
          {selectedCategoryInfo && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-300 animate-in fade-in duration-200">
              <span className="text-xl flex-shrink-0">{selectedCategoryInfo.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-cyan-200">{selectedCategoryInfo.label}:</span>{' '}
                <span className="text-slate-300">{selectedCategoryInfo.desc}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Step 2: Location and Description */}
        <Card className="p-6 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                2
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Issue Details & Specific Location
              </h2>
            </div>
            <span className="text-xs text-slate-400">Required</span>
          </div>

          <div className="space-y-4">
            {/* Location Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-cyan-400" /> Specific Location / Room / Floor (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Central Library 2nd Floor, Room 302, Canteen Counter B"
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm"
              />
            </div>

            {/* Severity Radio Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Flame size={13} className="text-amber-400" /> Urgency / Severity Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'low', label: 'Low', desc: 'Minor cosmetic', color: 'border-blue-500/30 text-blue-400' },
                  { id: 'medium', label: 'Medium', desc: 'Needs attention', color: 'border-amber-500/30 text-amber-400' },
                  { id: 'high', label: 'High', desc: 'Affects classes', color: 'border-orange-500/30 text-orange-400' },
                  { id: 'critical', label: 'Critical', desc: 'Safety / Total stop', color: 'border-rose-500/30 text-rose-400' },
                ].map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSeverity(lvl.id as Severity)}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      severity === lvl.id
                        ? 'border-cyan-400 bg-cyan-500/10 font-bold text-cyan-400 ring-1 ring-cyan-400/50'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-semibold capitalize">{lvl.label}</div>
                    <div className="text-[10px] text-slate-500 opacity-80">{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText size={13} className="text-cyan-400" /> Description of the Issue *
                </label>
                <span className="text-[11px] text-slate-400">
                  {description.length} / 5000 chars
                </span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what is wrong, equipment model if applicable, when it started, and safety hazards..."
                className="w-full p-3.5 text-sm bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>
        </Card>

        {/* Step 3: Supporting Image Upload */}
        <Card className="p-6 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                3
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Attach Supporting Photo (Optional)
              </h2>
            </div>
            <span className="text-xs text-slate-400">Optional</span>
          </div>

          <ImageUpload
            value={imageUrl}
            onChange={(url) => setImageUrl(url)}
            portalTheme="cyan"
            label="Upload Photo or Evidence"
            sublabel="Attach a photo of the damaged facility, broken equipment, or safety issue (PNG, JPG, WEBP between 5 KB and 500 KB)"
          />
        </Card>

        {/* Anonymous Option & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-400/50 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-cyan-400" /> Submit issue report anonymously
            </span>
          </label>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/student/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || description.trim().length < 5}
              className="px-6 shadow-md shadow-cyan-500/20 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Issue Report
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
