'use client';

import { useState } from 'react';
import {
  X,
  Copy,
  CheckCircle2,
  Share2,
  Mail,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

interface SharePostModalProps {
  post: {
    id: string;
    content?: string;
    type?: string;
    course?: { code?: string; name?: string };
    author?: {
      verificationStatus?: string;
      profile?: { firstName?: string; lastName?: string };
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SharePostModal({ post, isOpen, onClose }: SharePostModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !post) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const postUrl = `${origin}/posts/${post.id}`;
  const authorName = `${post.author?.profile?.firstName || 'A student'} ${
    post.author?.profile?.lastName || ''
  }`.trim();
  const summary = post.content ? post.content.slice(0, 100) + '...' : 'Check out this campus discussion';
  const shareTitle = `Interakt Campus: ${post.course ? `[${post.course.code}] ` : ''}${authorName}'s post`;
  const shareText = `Check out this discussion on Interakt University Platform:\n"${summary}"\n\n${postUrl}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: postUrl,
        });
        onClose();
      } catch {
        // User cancelled or share failed
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareTitle}\n\n${postUrl}`,
  )}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Check out this campus discussion on Interakt: ${postUrl}`,
  )}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(
    shareText,
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Share Discussion</h3>
              <p className="text-xs text-slate-400">Share with classmates or study groups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Preview Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900">{authorName}</span>
            {post.author?.verificationStatus === 'VERIFIED' && (
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            )}
            {post.course && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                📚 {post.course.code}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {post.content || 'Campus post attachment'}
          </p>
        </div>

        {/* Copy Link Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Permanent Post Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={postUrl}
              className="flex-1 px-3 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Social & Direct Share Buttons */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400">Share via</span>
          <div className="grid grid-cols-3 gap-2">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/60 transition-colors text-emerald-800 group"
            >
              <MessageSquare className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">WhatsApp</span>
            </a>

            {/* Twitter / X */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors text-slate-800 group"
            >
              <ExternalLink className="w-5 h-5 text-slate-700 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">X (Twitter)</span>
            </a>

            {/* Email */}
            <a
              href={emailUrl}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/70 border border-blue-200/60 transition-colors text-blue-800 group"
            >
              <Mail className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Campus Mail</span>
            </a>
          </div>

          {/* Native Web Share button if available */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>More sharing options...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
