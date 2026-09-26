'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { ShieldCheck, MessageCircle, Send, Reply, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AcademicReactions, AcademicReactionType } from './AcademicReactions';

interface CommentAuthor {
  id: string;
  role?: string;
  verificationStatus?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    level?: number;
  };
}

interface NestedReply {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  reactionCount: number;
  userReaction?: AcademicReactionType | null;
  createdAt: string;
  author: CommentAuthor;
}

interface CommentItemData {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  content: string;
  reactionCount: number;
  replyCount: number;
  userReaction?: AcademicReactionType | null;
  createdAt: string;
  author: CommentAuthor;
  replies?: NestedReply[];
}

interface ThreadedCommentsProps {
  postId: string;
  postAuthorId?: string;
  onCommentCountChange?: (newCount: number) => void;
}

export function ThreadedComments({
  postId,
  postAuthorId,
  onCommentCountChange,
}: ThreadedCommentsProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [topLevelContent, setTopLevelContent] = useState('');
  const [isSubmittingTopLevel, setIsSubmittingTopLevel] = useState(false);

  // Nested Reply State: ID of the comment being replied to
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Fetch comments for this post
  const {
    data: comments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<CommentItemData[]>({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const res = await api.get(`/posts/${postId}/comments`, {
        params: { limit: 50 },
      });
      const payload = res.data?.data;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return [];
    },
  });

  const formatCommentTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  // Submit top-level comment
  const handleCreateTopLevelComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topLevelContent.trim() || isSubmittingTopLevel) return;

    setIsSubmittingTopLevel(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, {
        content: topLevelContent.trim(),
      });
      if (res.data?.success) {
        setTopLevelContent('');
        await refetch();
        // Invalidate feed so post.commentCount reflects the update
        queryClient.invalidateQueries({ queryKey: ['campus-feed'] });
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingTopLevel(false);
    }
  };

  // Submit nested reply
  const handleCreateNestedReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, {
        content: replyContent.trim(),
        parentId: parentCommentId,
      });
      if (res.data?.success) {
        setReplyContent('');
        setReplyingToCommentId(null);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['campus-feed'] });
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-100 space-y-4">
      {/* Top-Level Comment Input */}
      <form onSubmit={handleCreateTopLevelComment} className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
          {user?.profile?.firstName?.[0] || 'U'}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Add to the academic discussion or ask a follow-up..."
            value={topLevelContent}
            onChange={(e) => setTopLevelContent(e.target.value)}
            disabled={isSubmittingTopLevel}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isSubmittingTopLevel || !topLevelContent.trim()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmittingTopLevel ? 'Posting...' : 'Comment'}</span>
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 pt-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2.5 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-2.5 w-3/4 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {isError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
          <p className="text-xs text-rose-600 font-semibold">Failed to load discussions</p>
          <button
            onClick={() => refetch()}
            className="text-[11px] text-blue-600 font-bold underline mt-1"
          >
            Retry
          </button>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && comments.length === 0 ? (
        <div className="py-4 text-center text-slate-400 space-y-1">
          <MessageCircle className="w-5 h-5 mx-auto text-slate-300" />
          <p className="text-xs">No comments yet. Join the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {comments.map((comment) => {
            const isCommentPostAuthor = postAuthorId && comment.author?.id === postAuthorId;
            const isReplyingThis = replyingToCommentId === comment.id;

            return (
              <div key={comment.id} className="space-y-2.5">
                {/* 1. Top-Level Comment Bubble */}
                <div className="flex items-start gap-2.5 group">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5">
                    {comment.author?.profile?.firstName?.[0] || 'S'}
                  </div>

                  <div className="flex-1">
                    <div className="bg-slate-50/90 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3 shadow-2xs space-y-1.5 transition-colors">
                      {/* Author Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">
                            {comment.author?.profile?.firstName || 'Student'}{' '}
                            {comment.author?.profile?.lastName || ''}
                          </span>

                          {comment.author?.verificationStatus === 'VERIFIED' && (
                            <span title="Verified University Student">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            </span>
                          )}

                          {isCommentPostAuthor && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                              Author
                            </span>
                          )}

                          {comment.author?.profile?.level && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                              {comment.author.profile.level}L
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatCommentTime(comment.createdAt)}</span>
                        </div>
                      </div>

                      {/* Comment Content */}
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                        {comment.content}
                      </p>
                    </div>

                    {/* Comment Actions (Reactions & Reply Trigger) */}
                    <div className="flex items-center gap-3 mt-1.5 ml-2">
                      <AcademicReactions
                        targetId={comment.id}
                        targetType="comment"
                        initialCount={comment.reactionCount}
                        initialUserReaction={comment.userReaction}
                        size="sm"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (isReplyingThis) {
                            setReplyingToCommentId(null);
                            setReplyContent('');
                          } else {
                            setReplyingToCommentId(comment.id);
                            setReplyContent('');
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>

                      {comment.replyCount > 0 && (!comment.replies || comment.replies.length === 0) && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Nested Replies Thread (Eagerly loaded or nested) */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-6 sm:ml-9 border-l-2 border-slate-200 pl-3.5 sm:pl-4 space-y-2.5">
                    {comment.replies.map((reply) => {
                      const isReplyPostAuthor = postAuthorId && reply.author?.id === postAuthorId;
                      return (
                        <div key={reply.id} className="flex items-start gap-2.5 group">
                          <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-2xs">
                            {reply.author?.profile?.firstName?.[0] || 'S'}
                          </div>

                          <div className="flex-1">
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs space-y-1">
                              {/* Reply Author Header */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900">
                                    {reply.author?.profile?.firstName || 'Student'}{' '}
                                    {reply.author?.profile?.lastName || ''}
                                  </span>

                                  {reply.author?.verificationStatus === 'VERIFIED' && (
                                    <span title="Verified University Student">
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                    </span>
                                  )}

                                  {isReplyPostAuthor && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                      Author
                                    </span>
                                  )}

                                  {reply.author?.profile?.level && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                                      {reply.author.profile.level}L
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{formatCommentTime(reply.createdAt)}</span>
                                </div>
                              </div>

                              {/* Reply Content */}
                              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                {reply.content}
                              </p>
                            </div>

                            {/* Reply Action Buttons */}
                            <div className="flex items-center gap-3 mt-1 ml-2">
                              <AcademicReactions
                                targetId={reply.id}
                                targetType="comment"
                                initialCount={reply.reactionCount}
                                initialUserReaction={reply.userReaction}
                                size="sm"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToCommentId(comment.id);
                                  setReplyContent(`@${reply.author?.profile?.firstName || 'Student'} `);
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                <Reply className="w-3.5 h-3.5" />
                                <span>Reply</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Inline Nested Reply Box */}
                {isReplyingThis && (
                  <div className="ml-6 sm:ml-9 border-l-2 border-blue-400 pl-3.5 sm:pl-4 pt-1 animate-in fade-in duration-150">
                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                        <span>
                          Replying to{' '}
                          <span className="font-bold">
                            {comment.author?.profile?.firstName} {comment.author?.profile?.lastName}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToCommentId(null);
                            setReplyContent('');
                          }}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Cancel reply"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Write your academic reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCreateNestedReply(comment.id);
                            }
                          }}
                          disabled={isSubmittingReply}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleCreateNestedReply(comment.id)}
                          disabled={isSubmittingReply || !replyContent.trim()}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isSubmittingReply ? '...' : 'Reply'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
