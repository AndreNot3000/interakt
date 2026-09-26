'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Bookmark,
  BookOpen,
  FileText,
  HelpCircle,
  MessageCircle,
  Calendar,
  Share2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Copy,
  Layers,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AcademicReactions } from '@/components/feed/AcademicReactions';
import { ThreadedComments } from '@/components/feed/ThreadedComments';
import { SharePostModal } from '@/components/feed/SharePostModal';

type BookmarkFilter = '' | 'QUESTION' | 'RESOURCE' | 'ANNOUNCEMENT' | 'TEXT';

export default function BookmarksPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<BookmarkFilter>('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [shareModalPost, setShareModalPost] = useState<any>(null);

  // Fetch bookmarked posts from API with optional post type filter
  const {
    data: bookmarksData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-bookmarks', activeFilter],
    queryFn: async () => {
      const res = await api.get('/posts/bookmarks', {
        params: {
          type: activeFilter || undefined,
          limit: 50,
        },
      });
      const payload = res.data?.data;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return [];
    },
  });

  const posts: any[] = bookmarksData || [];

  const handleRemoveBookmark = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}/bookmark`);
      // Invalidate bookmark and feed queries
      queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['campus-feed'] });
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  const formatPostTimestamp = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const filterTabs: { id: BookmarkFilter; label: string; icon: any; countLabel?: string }[] = [
    { id: '', label: 'All Saved', icon: Bookmark },
    { id: 'QUESTION', label: 'Academic Q&A', icon: HelpCircle },
    { id: 'RESOURCE', label: 'Study Resources', icon: FileText },
    { id: 'ANNOUNCEMENT', label: 'Announcements', icon: Layers },
    { id: 'TEXT', label: 'Discussions', icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Saved Bookmarks</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Bookmark className="w-3.5 h-3.5 fill-blue-300" />
              Personal Library
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Your collection of saved academic questions, study resources, past questions, and important campus notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold backdrop-blur-xs">
            {posts.length} {posts.length === 1 ? 'Item' : 'Items'} Saved
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bookmarked Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                    <div className="h-2.5 w-24 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-rose-600">Failed to load bookmarks</p>
            <p className="text-xs text-slate-500 mt-1">Check your connection and try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              No bookmarks in this category yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Save important course questions, past exam papers, or campus announcements by clicking the bookmark icon on any post in the campus feed.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <span>Explore Campus Feed</span>
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {post.author?.profile?.firstName?.[0] || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {post.author?.profile?.firstName} {post.author?.profile?.lastName}
                      </span>
                      {post.author?.verificationStatus === 'VERIFIED' && (
                        <span title="Verified University Student">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                        </span>
                      )}

                      {/* Post Type Badges */}
                      {post.type === 'QUESTION' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          💡 Academic Q&A
                        </span>
                      )}
                      {post.type === 'RESOURCE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          📑 Study Resource
                        </span>
                      )}
                      {post.type === 'EVENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          🎉 Campus Event
                        </span>
                      )}
                      {post.course && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          📚 {post.course.code}
                        </span>
                      )}
                      {post.organization?.isOfficial && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white">
                          ✓ Official Announcement
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>
                        {post.author?.profile?.level
                          ? `${post.author.profile.level}L Student`
                          : 'University Student'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatPostTimestamp(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove Bookmark Button */}
                <button
                  onClick={() => handleRemoveBookmark(post.id)}
                  className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-rose-50 hover:text-rose-600 transition-colors group"
                  title="Remove from bookmarks"
                >
                  <Bookmark className="w-4 h-4 fill-blue-600 group-hover:fill-rose-600" />
                </button>
              </div>

              {/* Formatted Content */}
              <div className="space-y-3">
                {renderFormattedContent(post.content)}
              </div>

              {/* Attached Media / Documents */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <PostMediaGallery mediaUrls={post.mediaUrls} />
              )}

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <AcademicReactions
                    targetId={post.id}
                    targetType="post"
                    initialCount={post.reactionCount || 0}
                    initialUserReaction={post.userReaction}
                    onReactionChange={() => {
                      queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] });
                    }}
                  />

                  <button
                    onClick={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                      expandedComments[post.id]
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {post.commentCount || 0}{' '}
                      {post.commentCount === 1 ? 'Comment' : 'Comments'}
                    </span>
                  </button>

                  <button
                    onClick={() => setShareModalPost(post)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>

                <Link
                  href={`/posts/${post.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Full View</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Collapsible Threaded Discussions */}
              {expandedComments[post.id] && (
                <ThreadedComments
                  postId={post.id}
                  postAuthorId={post.author?.id}
                />
              )}
            </article>
          ))
        )}
      </div>

      {/* Share Post Modal */}
      <SharePostModal
        post={shareModalPost}
        isOpen={!!shareModalPost}
        onClose={() => setShareModalPost(null)}
      />
    </div>
  );
}

// Rich Text & Code Snippet Formatter
function renderFormattedContent(content: string) {
  if (!content) return null;

  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; content?: string; language?: string; code?: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  if (parts.length === 0) {
    return <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{content}</p>;
  }

  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return (
            <p key={idx} className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {part.content}
            </p>
          );
        }
        return (
          <CodeSnippetBlock key={idx} language={part.language || 'code'} code={part.code || ''} />
        );
      })}
    </div>
  );
}

function CodeSnippetBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-md my-2">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider ml-1">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function PostMediaGallery({ mediaUrls }: { mediaUrls: string[] }) {
  if (!mediaUrls || mediaUrls.length === 0) return null;

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
  const isDoc = (url: string) => /\.(pdf|doc|docx|ppt|pptx)($|\?)/i.test(url);

  const images = mediaUrls.filter(isImage);
  const docs = mediaUrls.filter(isDoc);
  const others = mediaUrls.filter((u) => !isImage(u) && !isDoc(u));

  return (
    <div className="space-y-2.5 pt-1">
      {images.length > 0 && (
        <div
          className={`grid gap-2 rounded-xl overflow-hidden ${
            images.length === 1 ? 'grid-cols-1 max-w-lg' : 'grid-cols-2'
          }`}
        >
          {images.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200 aspect-video hover:opacity-95 transition-opacity"
            >
              <img
                src={url}
                alt="Post attachment"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </a>
          ))}
        </div>
      )}

      {(docs.length > 0 || others.length > 0) && (
        <div className="space-y-1.5">
          {[...docs, ...others].map((url, i) => {
            const cleanPath = url.split('?')[0];
            const rawFilename = cleanPath.split('/').pop() || 'Document.pdf';
            const filename = decodeURIComponent(rawFilename);

            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                      {filename}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Campus Study Document • Click to download / view
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-blue-600 px-2.5 py-1 rounded-lg bg-white border border-slate-200 group-hover:border-blue-300 shadow-2xs shrink-0 flex items-center gap-1">
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
