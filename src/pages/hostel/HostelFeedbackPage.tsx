import { useState, useEffect } from 'react';
import { Card, Badge, StatusBadge, SentimentBadge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useHostelScope } from '@/context/HostelScopeContext';
import { HostelScopeSelector } from '@/components/hostel/HostelScopeSelector';
import { fetchFeedback, addFeedback, type Feedback } from '@/services/feedbackService';
import { ImageUpload, ImageLightboxModal } from '@/components/common/ImageUpload';
import { getFullImageUrl } from '@/services/uploadService';
import {
  Home,
  Building,
  Star,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Filter,
  Search,
  Sparkles,
  Camera,
  Maximize2,
  Wrench,
  Eye
} from 'lucide-react';

const HOSTEL_CATEGORIES = [
  'Room Maintenance',
  'Restrooms & Hygiene',
  'Water Supply',
  'Electricity & Power',
  'Mess & Food',
  'Security & Safety',
  'Internet & Wi-Fi',
] as const;

export function HostelFeedbackPage() {
  const { user } = useAuth();
  const { selectedFloor, effectiveFloor, selectedFloorDisplay, isAllFloors } = useHostelScope();
  const isStudent = user?.role === 'student';
  const isHostelWarden = user?.role === 'hostel_warden';
  const isManagement = user?.role === 'management';

  const userFloor = isManagement
    ? selectedFloorDisplay
    : (user?.floor || user?.assigned_floor || '1st Floor');
  const roomNumber = user?.room_number || 'Room 102';

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [submissionType, setSubmissionType] = useState<'feedback' | 'issue'>('feedback');
  const [category, setCategory] = useState<typeof HOSTEL_CATEGORIES[number]>(HOSTEL_CATEGORIES[0]);
  const [rating, setRating] = useState<number>(4);
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [comment, setComment] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lightbox State
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [activeLightboxTitle, setActiveLightboxTitle] = useState<string | null>(null);
  const [activeLightboxFeedback, setActiveLightboxFeedback] = useState<Feedback | null>(null);

  // Filter State
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSentiment, setFilterSentiment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = { portal: 'hostel' };
      if (isHostelWarden && user?.assigned_floor) {
        filters.floor = user.assigned_floor;
      } else if (isManagement && effectiveFloor) {
        filters.floor = effectiveFloor;
      }
      const data = await fetchFeedback(filters);
      const scoped = effectiveFloor
        ? data.filter(f => !f.floor || f.floor.trim().toLowerCase() === effectiveFloor.trim().toLowerCase())
        : data;
      setFeedbackList(scoped);
    } catch (err: any) {
      console.error('[HostelFeedbackPage] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbackData();
  }, [user?.role, user?.assigned_floor, effectiveFloor, isManagement]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setSubmitError('Please provide detailed feedback or describe the issue (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const isIssue = submissionType === 'issue';
      const effectiveRating = isIssue
        ? (issueSeverity === 'critical' ? 1 : issueSeverity === 'high' ? 2 : 3)
        : rating;
      const sentiment = isIssue
        ? 'negative'
        : (effectiveRating >= 4 ? 'positive' : effectiveRating <= 2 ? 'negative' : 'neutral');
      const severity = isIssue
        ? issueSeverity
        : (effectiveRating <= 2 ? 'high' : 'medium');

      await addFeedback({
        comment: comment.trim(),
        category: category as any,
        rating: effectiveRating,
        portal: 'hostel',
        floor: userFloor as any,
        department: null as any,
        sentiment,
        theme: category,
        issue: category,
        severity,
        status: 'received',
        anonymous: isAnonymous,
        imageUrl: imageUrl || null,
        date: new Date().toISOString(),
      });

      setSubmitSuccess(true);
      setComment('');
      setImageUrl(null);
      setTimeout(() => {
        setSubmitSuccess(false);
        loadFeedbackData();
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit hostel feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = feedbackList.filter(f => {
    if (filterCategory !== 'ALL' && f.category !== filterCategory) return false;
    if (filterSentiment !== 'ALL' && f.sentiment !== filterSentiment) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (f.comment && f.comment.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.floor && f.floor.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            <Home size={14} />
            <span>Hostel Facilities Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            {isStudent ? 'Submit Hostel Feedback & Issues' : 'Hostel Floor Feedback'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isStudent
              ? `Report maintenance issues or share facility feedback for ${userFloor} (${roomNumber}). Photo upload enabled.`
              : `Review resident submissions and facility requests for ${userFloor}.`}
          </p>
        </div>

        {isManagement ? (
          <HostelScopeSelector />
        ) : (
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2.5 rounded-xl text-xs text-slate-300">
            <Home size={16} className="text-purple-400" />
            <span>Floor: <strong>{userFloor}</strong></span>
            {isStudent && (
              <>
                <span className="text-slate-600">|</span>
                <span className="font-mono text-purple-300">{roomNumber}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Student Feedback & Repair Request Form */}
      {isStudent && (
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          {/* Submission Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border transition-all ${
                submissionType === 'issue'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              }`}>
                {submissionType === 'issue' ? <Wrench size={20} /> : <Sparkles size={20} />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {submissionType === 'issue' ? 'Report a Hostel Issue / Repair Request' : 'New Facility Feedback'}
                </h2>
                <p className="text-xs text-slate-400">
                  {submissionType === 'issue'
                    ? 'Report broken fixtures, water leaks, power failures, or hygiene problems to the hostel warden'
                    : 'Share feedback regarding overall hostel living conditions and amenities'}
                </p>
              </div>
            </div>

            {/* Toggle Pills */}
            <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/10 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setSubmissionType('feedback')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  submissionType === 'feedback'
                    ? 'bg-purple-500 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={13} />
                Facility Feedback
              </button>
              <button
                type="button"
                onClick={() => setSubmissionType('issue')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  submissionType === 'issue'
                    ? 'bg-rose-500 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench size={13} />
                Report an Issue
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {submissionType === 'issue' ? 'Issue Category' : 'Facility Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400/50"
                >
                  {HOSTEL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating or Severity */}
              {submissionType === 'feedback' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Condition Rating ({rating}/5)
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-xl border transition-all ${
                          rating >= star
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                            : 'bg-white/[0.02] text-slate-500 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <Star size={18} className={rating >= star ? 'fill-purple-400' : ''} />
                      </button>
                    ))}
                    <span className="text-xs font-medium text-slate-400 ml-2">
                      {rating >= 4 ? 'Satisfactory' : rating <= 2 ? 'Needs Immediate Attention' : 'Moderate'}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Issue Severity Level
                  </label>
                  <div className="grid grid-cols-4 gap-2 pt-0.5">
                    {(['low', 'medium', 'high', 'critical'] as const).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setIssueSeverity(sev)}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border capitalize transition-all text-center ${
                          issueSeverity === sev
                            ? (sev === 'critical'
                                ? 'bg-red-500/25 text-red-300 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                : sev === 'high'
                                ? 'bg-orange-500/25 text-orange-300 border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                                : sev === 'medium'
                                ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                : 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]')
                            : 'bg-white/[0.02] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {submissionType === 'issue'
                  ? 'Detailed Issue Description / Maintenance Request'
                  : 'Detailed Feedback / Experience'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={
                  submissionType === 'issue'
                    ? "e.g. Water tap in 2nd floor restroom is broken and continuously leaking; ceiling light flickers in room 204; Wi-Fi router on west wing is offline..."
                    : "e.g. Water pressure on the north wing bathroom is good; cleanliness in mess has improved; quiet study hours are respected..."
                }
                className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/50"
              />
            </div>

            {/* Image Upload Component */}
            <div className="pt-1">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                portalTheme="purple"
                label={
                  submissionType === 'issue'
                    ? 'Upload Photo Evidence of Issue (Optional — Broken equipment, water leak, damage, hygiene)'
                    : 'Upload Facility Photo (Optional)'
                }
                helpText="PNG, JPG, WEBP between 5 KB and 500 KB. Preview available instantly."
              />
            </div>

            {/* Anonymous Toggle and Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-0"
                />
                <span>Submit as anonymous resident</span>
              </label>

              <div className="flex items-center gap-3">
                {submitError && (
                  <span className="text-xs text-red-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={14} /> {submitError}
                  </span>
                )}
                {submitSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle size={14} />{' '}
                    {submissionType === 'issue' ? 'Issue reported successfully!' : 'Feedback submitted successfully!'}
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-6 ${
                    submissionType === 'issue'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : submissionType === 'issue' ? (
                    <>
                      <Wrench size={16} />
                      Report Hostel Issue
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Hostel Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter and List Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hostel feedback..."
              className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#04050c]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {HOSTEL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value)}
              className="bg-[#04050c]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-purple-400 mb-3" />
            <p className="text-sm font-medium">Retrieving hostel feedback...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 rounded-2xl bg-white/[0.02] border border-white/10">
            <Home size={40} className="mx-auto mb-3 opacity-25 text-purple-400" />
            <p className="text-base font-semibold text-white">No hostel feedback found for this scope.</p>
            <p className="text-xs text-slate-500 mt-1">Resident reports will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((item) => {
              const itemImg = item.imageUrl || item.image_url;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="text-xs font-mono">
                          {item.floor || userFloor}
                        </Badge>
                        <span className="text-xs font-semibold text-purple-400">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {itemImg && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLightboxImage(getFullImageUrl(itemImg));
                              setActiveLightboxTitle(`${item.floor || userFloor} · ${item.category}`);
                              setActiveLightboxFeedback(item);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 hover:border-purple-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="View student uploaded image along with feedback"
                          >
                            <Eye size={12} />
                            <span>View Image</span>
                          </button>
                        )}
                        <SentimentBadge sentiment={item.sentiment} />
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">{item.comment}</p>

                    {/* Attached Photo display */}
                    {itemImg && (
                      <div
                        onClick={() => {
                          setActiveLightboxImage(getFullImageUrl(itemImg));
                          setActiveLightboxTitle(`${item.floor || userFloor} · ${item.category}`);
                          setActiveLightboxFeedback(item);
                        }}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-black/50 aspect-video max-h-48 transition-all hover:border-purple-400/50"
                        title="Click to view full photo"
                      >
                        <img
                          src={getFullImageUrl(itemImg)}
                          alt="Hostel feedback attachment"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-purple-500/30">
                            <Camera size={12} />
                            <span>Attached Photo</span>
                            <Maximize2 size={10} className="ml-0.5 opacity-60" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                    <span>{item.anonymous ? 'Anonymous Resident' : 'Verified Resident'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal for enlarged viewing */}
      {Boolean(activeLightboxImage) && (
        <ImageLightboxModal
          isOpen={Boolean(activeLightboxImage)}
          imageUrl={activeLightboxImage}
          title={activeLightboxTitle || 'Hostel Feedback Attachment'}
          feedback={activeLightboxFeedback ? {
            id: activeLightboxFeedback.id,
            comment: activeLightboxFeedback.comment,
            sentiment: activeLightboxFeedback.sentiment,
            status: activeLightboxFeedback.status,
            category: activeLightboxFeedback.category,
            scope: activeLightboxFeedback.floor || userFloor,
            date: activeLightboxFeedback.date,
            anonymous: activeLightboxFeedback.anonymous,
            portal: 'hostel'
          } : null}
          onClose={() => {
            setActiveLightboxImage(null);
            setActiveLightboxTitle(null);
            setActiveLightboxFeedback(null);
          }}
        />
      )}
    </div>
  );
}
