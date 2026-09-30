import { useState, useEffect } from 'react';
import { Card, Badge, StatusBadge, SentimentBadge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useBusScope } from '@/context/BusScopeContext';
import { BusScopeSelector } from '@/components/bus/BusScopeSelector';
import type { Feedback } from '@/types';
import { fetchFeedback, addFeedback } from '@/services/feedbackService';
import { ImageUpload, ImageLightboxModal } from '@/components/common/ImageUpload';
import { getFullImageUrl } from '@/services/uploadService';
import {
  Bus,
  MapPin,
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
  Eye
} from 'lucide-react';

const BUS_CATEGORIES = [
  'Punctuality & Timing',
  'Driver & Safety',
  'Bus Condition & Cleanliness',
  'Seating & Overcrowding',
  'Route & Stops',
] as const;

export function BusFeedbackPage() {
  const { user } = useAuth();
  const { selectedBus, effectiveBusNumber, isAllBuses } = useBusScope();

  const isStudent = user?.role === 'student';
  const isBusIncharge = user?.role === 'bus_incharge';

  const userBusNumber = user?.bus_number || 'Bus 14';
  const boardingPoint = user?.boarding_point || 'Central Station';

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [submissionType, setSubmissionType] = useState<'feedback' | 'issue'>('feedback');
  const [category, setCategory] = useState<typeof BUS_CATEGORIES[number]>(BUS_CATEGORIES[0]);
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
      const filters: Record<string, any> = { portal: 'bus' };
      if (isBusIncharge && user?.bus_number) {
        filters.bus_number = user.bus_number;
      } else if (effectiveBusNumber) {
        filters.bus_number = effectiveBusNumber;
      }
      const data = await fetchFeedback(filters);
      setFeedbackList(data);
    } catch (err: any) {
      console.error('[BusFeedbackPage] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbackData();
  }, [user?.role, user?.bus_number, effectiveBusNumber]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setSubmitError('Please provide detailed feedback (at least 5 characters).');
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
        portal: 'bus',
        bus_number: userBusNumber,
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
      setSubmitError(err.message || 'Failed to submit bus feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = feedbackList.filter(f => {
    if (effectiveBusNumber && f.bus_number && f.bus_number.trim().toLowerCase() !== effectiveBusNumber.trim().toLowerCase()) {
      return false;
    }
    if (filterCategory !== 'ALL' && f.category !== filterCategory) return false;
    if (filterSentiment !== 'ALL' && f.sentiment !== filterSentiment) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (f.comment && f.comment.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.bus_number && f.bus_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Bus size={14} />
            <span>Bus Transport Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            {isStudent ? 'Submit Bus Feedback & Issues' : 'Bus Feedback'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isStudent
              ? `Share your daily commute experience or report bus issues for ${userBusNumber}. Route-scoped with photo upload.`
              : `Review operational feedback for ${isBusIncharge ? userBusNumber : effectiveBusNumber ? `${effectiveBusNumber} only` : 'all transport buses'}.`}
          </p>
        </div>

        <BusScopeSelector />
      </div>

      {/* Student Feedback & Issue Submission Card */}
      {isStudent && (
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          {/* Submission Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border transition-all ${
                submissionType === 'issue'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {submissionType === 'issue' ? <AlertTriangle size={20} /> : <Sparkles size={20} />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {submissionType === 'issue' ? 'Report a Bus Issue' : 'New Commute Feedback'}
                </h2>
                <p className="text-xs text-slate-400">
                  {submissionType === 'issue'
                    ? 'Report safety hazards, delays, route deviations, or bus defects directly to transport incharge'
                    : 'Your feedback helps improve daily bus schedules and commuter safety'}
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
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={13} />
                Commute Feedback
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
                <AlertTriangle size={13} />
                Report an Issue
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {submissionType === 'issue' ? 'Issue Category' : 'Feedback Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/50"
                >
                  {BUS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating (Feedback mode) or Severity (Issue mode) */}
              {submissionType === 'feedback' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Commute Rating ({rating}/5)
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-xl border transition-all ${
                          rating >= star
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : 'bg-white/[0.02] text-slate-500 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <Star size={18} className={rating >= star ? 'fill-amber-400' : ''} />
                      </button>
                    ))}
                    <span className="text-xs font-medium text-slate-400 ml-2">
                      {rating >= 4 ? 'Good Experience' : rating <= 2 ? 'Needs Improvement' : 'Satisfactory'}
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
                  ? 'Detailed Issue Description / Incident Report'
                  : 'Detailed Feedback / Commute Experience'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={
                  submissionType === 'issue'
                    ? "e.g. Bus 14 broke down near South Junction causing a 40 min delay; AC was not cooling properly; driver was overspeeding on highway..."
                    : "e.g. Bus arrived on time at Central Station stop; driver maintained steady speed; cleanliness was good..."
                }
                className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            {/* Image Upload Component */}
            <div className="pt-1">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                portalTheme="amber"
                label={
                  submissionType === 'issue'
                    ? 'Upload Photo Evidence of Issue (Optional — Bus condition, damaged seat, schedule delay, etc.)'
                    : 'Upload Commute Photo (Optional)'
                }
                helpText="PNG, JPG, WEBP or GIF up to 10MB. Preview available instantly."
              />
            </div>

            {/* Anonymous Toggle and Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span>Submit as anonymous student</span>
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
                      : ''
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : submissionType === 'issue' ? (
                    <>
                      <AlertTriangle size={16} />
                      Report Bus Issue
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Bus Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Feedback List & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus feedback by keyword..."
              className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#04050c]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {BUS_CATEGORIES.map(cat => (
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

        {/* Feedback List Results */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-amber-400 mb-3" />
            <p className="text-sm font-medium">Retrieving bus feedback...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 rounded-2xl bg-white/[0.02] border border-white/10">
            <Bus size={40} className="mx-auto mb-3 opacity-25 text-amber-400" />
            <p className="text-base font-semibold text-white">No bus feedback matches the criteria.</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((item) => {
              const itemImg = item.imageUrl || item.image_url;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="text-xs font-mono">
                          {item.bus_number || userBusNumber}
                        </Badge>
                        <span className="text-xs font-semibold text-amber-400">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {itemImg && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLightboxImage(getFullImageUrl(itemImg));
                              setActiveLightboxTitle(`${item.bus_number || userBusNumber} · ${item.category}`);
                              setActiveLightboxFeedback(item);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 transition-all shadow-sm active:scale-95 cursor-pointer"
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
                          setActiveLightboxTitle(`${item.bus_number || userBusNumber} · ${item.category}`);
                          setActiveLightboxFeedback(item);
                        }}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-black/50 aspect-video max-h-48 transition-all hover:border-amber-400/50"
                        title="Click to view full photo"
                      >
                        <img
                          src={getFullImageUrl(itemImg)}
                          alt="Feedback attachment"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-500/30">
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
                    <span>{item.anonymous ? 'Anonymous Commuter' : 'Verified Commuter'}</span>
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
          title={activeLightboxTitle || 'Bus Feedback Attachment'}
          feedback={activeLightboxFeedback ? {
            id: activeLightboxFeedback.id,
            comment: activeLightboxFeedback.comment,
            sentiment: activeLightboxFeedback.sentiment,
            status: activeLightboxFeedback.status,
            category: activeLightboxFeedback.category,
            scope: activeLightboxFeedback.bus_number || userBusNumber,
            date: activeLightboxFeedback.date,
            anonymous: activeLightboxFeedback.anonymous,
            portal: 'bus'
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
