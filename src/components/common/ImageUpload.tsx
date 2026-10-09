import React, { useState, useRef } from 'react';
import { uploadImage, getFullImageUrl } from '@/services/uploadService';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Maximize2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Badge, SentimentBadge, StatusBadge } from '@/components/common/UI';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null, base64?: string | null) => void;
  label?: string;
  sublabel?: string;
  helpText?: string;
  portalTheme?: 'amber' | 'purple' | 'cyan' | 'blue';
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Image / Proof',
  sublabel,
  helpText,
  portalTheme = 'amber',
  disabled = false,
}: ImageUploadProps) {
  const displaySublabel = sublabel || helpText || 'Attach a photo or screenshot (PNG, JPG, WEBP between 5 KB and 500 KB)';
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeClasses = {
    amber: {
      borderHover: 'hover:border-amber-400/50 hover:bg-amber-500/[0.04]',
      borderActive: 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      badge: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      button: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
    },
    purple: {
      borderHover: 'hover:border-purple-400/50 hover:bg-purple-500/[0.04]',
      borderActive: 'border-purple-400 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      iconBg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      badge: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      button: 'bg-purple-500 hover:bg-purple-400 text-white font-bold',
    },
    cyan: {
      borderHover: 'hover:border-cyan-400/50 hover:bg-cyan-500/[0.04]',
      borderActive: 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      badge: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      button: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold',
    },
    blue: {
      borderHover: 'hover:border-blue-400/50 hover:bg-blue-500/[0.04]',
      borderActive: 'border-blue-400 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      badge: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      button: 'bg-blue-500 hover:bg-blue-400 text-white font-bold',
    },
  }[portalTheme];

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setError(null);

    const minSizeBytes = 5 * 1024; // 5 KB
    const maxSizeBytes = 500 * 1024; // 500 KB

    if (file.size < minSizeBytes) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setError(`Image size (${sizeKb} KB) is below the minimum allowed limit of 5 KB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setError(`Image size (${sizeKb} KB) exceeds the maximum allowed limit of 500 KB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      const result = await uploadImage(file);
      onChange(result.url, result.base64);
    } catch (err: any) {
      console.error('[ImageUpload] Error:', err);
      setError(err.message || 'Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = getFullImageUrl(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
        {value && (
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${themeClasses.badge} px-2 py-0.5 rounded-full border`}>
            <CheckCircle size={11} /> Photo Attached
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* When no image is selected yet */}
      {!value ? (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center backdrop-blur-xl ${
            isDragging
              ? themeClasses.borderActive
              : `border-white/15 bg-white/[0.02] ${themeClasses.borderHover}`
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <Loader2 size={28} className="animate-spin text-amber-400" />
              <p className="text-xs font-semibold text-slate-300">Processing image...</p>
            </div>
          ) : (
            <>
              <div className={`p-3 rounded-2xl mb-3 shadow-inner ${themeClasses.iconBg}`}>
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Click or drag & drop to upload an image
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {displaySublabel}
              </p>
            </>
          )}
        </div>
      ) : (
        /* Image Preview Box */
        <div className="relative rounded-2xl border border-white/15 bg-[#04050c]/80 p-3 sm:p-4 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-4 group">
          <div
            onClick={() => setLightboxOpen(true)}
            className="relative w-full sm:w-32 h-28 sm:h-24 rounded-xl overflow-hidden border border-white/20 bg-black/40 cursor-pointer shrink-0 shadow-md group/thumb"
          >
            <img
              src={displayUrl}
              alt="Attached preview"
              className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Maximize2 size={18} />
            </div>
          </div>

          <div className="flex-1 w-full space-y-1">
            <div className="flex items-center gap-2">
              <ImageIcon size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-white">Image attached to report</span>
            </div>
            <p className="text-[11px] text-slate-400">
              This photo will be attached to your submission and visible to reviewers.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Eye size={12} /> View Full Image
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white border border-white/10 transition-colors"
              >
                Change Photo
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            title="Remove image"
            className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-all self-end sm:self-center"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 pt-1">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <ImageLightboxModal
          imageUrl={displayUrl}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

export interface LightboxFeedbackDetails {
  id?: string | number;
  comment?: string;
  sentiment?: any;
  status?: any;
  category?: string;
  scope?: string;
  date?: string;
  anonymous?: boolean;
  submitterRole?: string;
  portal?: string;
}

/**
 * Reusable full-resolution image lightbox modal
 * Can display standalone image preview or image accompanied by full feedback details
 */
export function ImageLightboxModal({
  isOpen = true,
  imageUrl,
  onClose,
  title = 'Attached Image',
  feedback
}: {
  isOpen?: boolean;
  imageUrl?: string | null;
  onClose: () => void;
  title?: string;
  feedback?: LightboxFeedbackDetails | null;
}) {
  if (!isOpen || !imageUrl) return null;

  const resolvedUrl = getFullImageUrl(imageUrl);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full bg-[#0c0e18] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          feedback ? 'max-w-5xl max-h-[92vh]' : 'max-w-4xl max-h-[90vh]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <ImageIcon size={16} />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">{title}</span>
              {feedback && (
                <span className="text-[11px] text-slate-400">Student Uploaded Evidence & Feedback</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium px-2.5"
              title="Open full resolution in new tab"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open Original</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {feedback ? (
          <div className="flex flex-col md:grid md:grid-cols-12 overflow-hidden flex-1 max-h-[calc(92vh-4rem)]">
            {/* Image on left / top */}
            <div className="md:col-span-7 lg:col-span-7 bg-black/75 flex items-center justify-center p-4 overflow-auto border-b md:border-b-0 md:border-r border-white/10 min-h-[260px] md:min-h-[440px]">
              <img
                src={resolvedUrl}
                alt={title}
                className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Feedback info on right / bottom */}
            <div className="md:col-span-5 lg:col-span-5 p-5 bg-[#0a0c16]/95 flex flex-col justify-between overflow-y-auto space-y-4">
              <div className="space-y-4">
                {/* Scope & Category */}
                <div className="flex items-center gap-2 flex-wrap">
                  {feedback.scope && (
                    <Badge variant="neutral" className="text-xs font-mono">
                      {feedback.scope}
                    </Badge>
                  )}
                  {feedback.category && (
                    <span className="text-xs font-semibold text-purple-400">
                      {feedback.category}
                    </span>
                  )}
                </div>

                {/* Sentiment & Progress Section */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Sentiment & Progress
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SentimentBadge sentiment={feedback.sentiment} />
                    <StatusBadge status={feedback.status} />
                  </div>
                </div>

                {/* Student Feedback Comment */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-amber-400" />
                    Student Feedback Comment
                  </span>
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 leading-relaxed font-sans italic">
                    "{feedback.comment || 'No additional comment provided.'}"
                  </div>
                </div>

                {/* Submitter & Date */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-0.5">Submitter</span>
                    <span className="text-slate-200 font-medium">
                      {feedback.anonymous ? 'Anonymous Student' : 'Verified Resident'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-0.5">Submitted On</span>
                    <span className="text-slate-200 font-medium font-mono">
                      {feedback.date ? new Date(feedback.date).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-4rem)] bg-black/50">
            <img
              src={resolvedUrl}
              alt={title}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
