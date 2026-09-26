'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  Bookmark,
  Share2,
  RefreshCw,
  AlertCircle,
  FileText,
  ExternalLink,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AcademicReactions } from '@/components/feed/AcademicReactions';
import { ThreadedComments } from '@/components/feed/ThreadedComments';
import { SharePostModal } from '@/components/feed/SharePostModal';

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const postId = params?.id as string;

  const [shareModalPost, setShareModalPost] = useState<any>(null);
  const [isBookmarkedLocal, setIsBookmarkedLocal] = useState<boolean | null>(null);

  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['single-post', postId],
    queryFn: async () => {
      const res = await api.get(`/posts/${postId}`);
      return res.data?.data;
    },
    enabled: !!postId,
  });

  const isBookmarked = isBookmarkedLocal !== null ? isBookmarkedLocal : post?.isBookmarked || false;

  const handleToggleBookmark = async () => {
    const nextBookmarked = !isBookmarked;
    setIsBookmarkedLocal(nextBookmarked);

    try {
      if (nextBookmarked) {
        await api.post(`/posts/${postId}/bookmark`, {});
      } else {
        await api.delete(`/posts/${postId}/bookmark`);
      }
      queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['campus-feed'] });
    } catch {
      setIsBookmarkedLocal(!nextBookmarked);
    }
  };

  const formatPostTimestamp = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Campus Feed</span>
      </button>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="h-4 bg-slate-200 rounded w-5/6" />
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
        </div>
      ) : isError || !post ? (
        <div className="bg-white border border-rose-200 rounded-3xl p-10 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-slate-900">Post Not Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This discussion may have been removed by its author or does not exist.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
          >
            Go to Campus Feed
          </button>
        </div>
      ) : (
        <article className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          {/* Post Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {post.author?.profile?.firstName?.[0] || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-base text-slate-900">
                    {post.author?.profile?.firstName} {post.author?.profile?.lastName}
                  </span>
                  {post.author?.verificationStatus === 'VERIFIED' && (
                    <span title="Verified University Student">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                    </span>
                  )}
                  {post.course && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      📚 {post.course.code}: {post.course.name}
                    </span>
                  )}
                  {post.organization?.isOfficial && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white">
                      ✓ Official Announcement
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>
                    {post.author?.profile?.level
                      ? `${post.author.profile.level}L Student`
                      : 'University Student'}
                  </span>
                  {post.author?.profile?.department?.name && (
                    <>
                      <span>•</span>
                      <span>{post.author.profile.department.name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatPostTimestamp(post.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-3">
            {renderFormattedContent(post.content)}
          </div>

          {/* Attached Media / Photos / Documents Gallery */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <PostMediaGallery mediaUrls={post.mediaUrls} />
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <AcademicReactions
                targetId={post.id}
                targetType="post"
                initialCount={post.reactionCount || 0}
                initialUserReaction={post.userReaction}
                onReactionChange={() => {
                  refetch();
                }}
              />

              <button
                onClick={() => setShareModalPost(post)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <button
              onClick={handleToggleBookmark}
              className={`p-2 rounded-xl transition-colors ${
                isBookmarked
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-600' : ''}`} />
            </button>
          </div>

          {/* Threaded Discussions Section (always expanded on single post page) */}
          <ThreadedComments
            postId={post.id}
            postAuthorId={post.author?.id}
          />
        </article>
      )}

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
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-md my-2">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider ml-1">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed scrollbar-thin">
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
    <div className="space-y-3 pt-1">
      {images.length > 0 && (
        <div
          className={`grid gap-2 rounded-2xl overflow-hidden ${
            images.length === 1 ? 'grid-cols-1 max-w-xl' : 'grid-cols-2'
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
                alt="Attachment"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </a>
          ))}
        </div>
      )}

      {(docs.length > 0 || others.length > 0) && (
        <div className="space-y-2">
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
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
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

                <span className="text-xs font-semibold text-blue-600 px-3 py-1.5 rounded-xl bg-white border border-slate-200 group-hover:border-blue-300 shadow-2xs shrink-0 flex items-center gap-1.5">
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
