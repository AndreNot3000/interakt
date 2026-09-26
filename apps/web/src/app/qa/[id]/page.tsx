'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  ArrowLeft,
  CheckCircle2,
  ThumbsUp,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  Code2,
  Eye,
  Edit3,
  Award,
  Star,
  Send,
  HelpCircle,
  CheckCheck,
  BookOpen,
} from 'lucide-react';

interface QuestionAuthor {
  id: string;
  verificationStatus?: string;
  badges?: string[];
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    level?: number | string | null;
    reputationPoints?: number;
    badges?: string[];
  } | null;
}

interface AnswerItem {
  id: string;
  questionId: string;
  authorId: string;
  content: string;
  isMarkedHelpful: boolean;
  isAnonymous: boolean;
  createdAt: string;
  upvoteCount: number;
  helpfulCount: number;
  isUpvoted?: boolean;
  author?: QuestionAuthor | null;
}

interface QuestionDetail {
  id: string;
  title: string;
  content: string;
  tags: string[];
  courseId?: string | null;
  course?: {
    id: string;
    code: string;
    name: string;
  } | null;
  authorId?: string;
  author?: QuestionAuthor | null;
  isAnonymous: boolean;
  upvoteCount: number;
  answerCount: number;
  viewCount: number;
  isUpvoted?: boolean;
  isResolved?: boolean;
  createdAt: string;
  answers: AnswerItem[];
}

// Code Snippet container with Syntax badge & Copy button
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
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-md my-3 font-mono">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800/80 text-xs font-sans">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider ml-1">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
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

// Formatted content supporting code blocks & markdown
function FormattedContent({ content }: { content: string }) {
  if (!content) return null;

  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; content?: string; language?: string; code?: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

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
    return <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">{content}</p>;
  }

  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return (
            <p key={idx} className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
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

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params?.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Answer form state
  const [answerContent, setAnswerContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [submitError, setSubmitError] = useState('');
  const [shareToast, setShareToast] = useState(false);

  // Fetch Question Details
  const {
    data: rawData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['question-detail', questionId],
    queryFn: async () => {
      const res = await api.get(`/questions/${questionId}`);
      return res.data?.data;
    },
    enabled: Boolean(questionId),
  });

  const question: QuestionDetail | null = rawData || null;

  // Toggle Question Upvote
  const questionUpvoteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/questions/${questionId}/upvote`, {});
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['question-detail', questionId] });
      const previous = queryClient.getQueryData(['question-detail', questionId]);

      queryClient.setQueryData(['question-detail', questionId], (old: any) => {
        if (!old) return old;
        const isCurrentlyUpvoted = Boolean(old.isUpvoted);
        return {
          ...old,
          isUpvoted: !isCurrentlyUpvoted,
          upvoteCount: isCurrentlyUpvoted ? Math.max(0, old.upvoteCount - 1) : old.upvoteCount + 1,
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['question-detail', questionId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['question-detail', questionId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Toggle Answer Upvote
  const answerUpvoteMutation = useMutation({
    mutationFn: async (answerId: string) => {
      const res = await api.post(`/questions/${questionId}/answers/${answerId}/upvote`, {});
      return res.data;
    },
    onMutate: async (answerId: string) => {
      await queryClient.cancelQueries({ queryKey: ['question-detail', questionId] });
      const previous = queryClient.getQueryData(['question-detail', questionId]);

      queryClient.setQueryData(['question-detail', questionId], (old: any) => {
        if (!old || !old.answers) return old;
        return {
          ...old,
          answers: old.answers.map((a: AnswerItem) => {
            if (a.id === answerId) {
              const isCurrentlyUpvoted = Boolean(a.isUpvoted);
              return {
                ...a,
                isUpvoted: !isCurrentlyUpvoted,
                upvoteCount: isCurrentlyUpvoted ? Math.max(0, a.upvoteCount - 1) : a.upvoteCount + 1,
                helpfulCount: isCurrentlyUpvoted ? Math.max(0, a.helpfulCount - 1) : a.helpfulCount + 1,
              };
            }
            return a;
          }),
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['question-detail', questionId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['question-detail', questionId] });
    },
  });

  // Mark / Unmark Accepted Solution
  const markHelpfulMutation = useMutation({
    mutationFn: async (answerId: string) => {
      const res = await api.patch(`/questions/${questionId}/answers/${answerId}/helpful`, {});
      return res.data;
    },
    onSuccess: (data) => {
      const wasMarked = data?.data?.isMarkedHelpful ?? true;
      const authorName = data?.data?.author?.profile
        ? `${data.data.author.profile.firstName} ${data.data.author.profile.lastName}`
        : 'Peer';
      if (wasMarked) {
        showToast(`Accepted solution marked! +15 Academic Reputation points awarded to ${authorName}.`, 'success');
      } else {
        showToast('Accepted solution unmarked (-15 reputation points).', 'info');
      }
      queryClient.invalidateQueries({ queryKey: ['question-detail', questionId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  // Submit Answer Mutation
  const createAnswerMutation = useMutation({
    mutationFn: async (payload: { content: string; isAnonymous: boolean }) => {
      const res = await api.post(`/questions/${questionId}/answers`, payload);
      return res.data;
    },
    onSuccess: () => {
      setAnswerContent('');
      setIsAnonymous(false);
      setSubmitError('');
      setEditorTab('write');
      queryClient.invalidateQueries({ queryKey: ['question-detail', questionId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit answer. Please try again.');
    },
  });

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim()) {
      setSubmitError('Please enter your answer explanation or code.');
      return;
    }

    createAnswerMutation.mutate({
      content: answerContent.trim(),
      isAnonymous,
    });
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const insertMarkdown = (syntax: string) => {
    if (syntax === 'code') {
      setAnswerContent((prev) => prev + '\n```cpp\n// Your solution code here\n```\n');
    } else if (syntax === 'inline') {
      setAnswerContent((prev) => prev + ' `inlineCode` ');
    } else if (syntax === 'bold') {
      setAnswerContent((prev) => prev + ' **bold text** ');
    } else if (syntax === 'italic') {
      setAnswerContent((prev) => prev + ' *italic text* ');
    } else if (syntax === 'list') {
      setAnswerContent((prev) => prev + '\n- Step 1: \n- Step 2: \n');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-600">Loading academic question and solutions...</p>
      </div>
    );
  }

  if (isError || !question) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Question not found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          This question may have been removed or is no longer accessible on the digital campus.
        </p>
        <Link
          href="/qa"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Academic Q&A
        </Link>
      </div>
    );
  }

  const isQuestionAuthor =
    user?.id === question.authorId ||
    user?.role === 'UNIVERSITY_ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  const authorName = question.isAnonymous
    ? 'Anonymous Peer'
    : question.author?.profile
    ? `${question.author.profile.firstName} ${question.author.profile.lastName}`
    : 'University Student';

  const authorLevel = !question.isAnonymous && question.author?.profile?.level ? `${question.author.profile.level}L` : null;

  const hasAcceptedSolution = question.answers?.some((a) => a.isMarkedHelpful);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/qa"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Academic Q&A Forum
        </Link>

        {shareToast && (
          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in">
            ✓ Link copied to clipboard!
          </span>
        )}
      </div>

      {/* Main Question Hero Card */}
      <article className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Meta badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          {question.course && (
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-mono flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {question.course.code} — {question.course.name}
            </span>
          )}

          {hasAcceptedSolution && (
            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resolved (Accepted Solution)
            </span>
          )}

          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>Asked recently</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
          {question.title}
        </h1>

        {/* Author metadata box */}
        <div className="flex items-center gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
            {question.isAnonymous ? '?' : authorName[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-slate-900">{authorName}</span>
              {question.isAnonymous ? (
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <UserX className="w-3 h-3" /> Anonymous
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    <UserCheck className="w-3 h-3" /> Verified Student
                  </span>
                  {authorLevel && (
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                      {authorLevel}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Author of this academic question</p>
          </div>
        </div>

        {/* Question Body */}
        <div className="pt-2 border-t border-slate-100">
          <FormattedContent content={question.content} />
        </div>

        {/* Question Topic Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Question Actions Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => questionUpvoteMutation.mutate()}
              disabled={questionUpvoteMutation.isPending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-xs active:scale-95 ${
                question.isUpvoted
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${question.isUpvoted ? 'fill-white stroke-white' : ''}`} />
              <span>{question.isUpvoted ? 'Upvoted' : 'Upvote Question'}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-[11px] font-mono">
                {question.upvoteCount}
              </span>
            </button>

            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              {question.answers?.length || 0} Answers
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors p-2 rounded-xl hover:bg-slate-100"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Discussion</span>
          </button>
        </div>
      </article>

      {/* Answers Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Answers ({question.answers?.length || 0})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified peer solutions and academic explanations
            </p>
          </div>

          {hasAcceptedSolution && (
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              Accepted Solution Pinned First
            </span>
          )}
        </div>

        {/* Answers List */}
        {question.answers?.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">No answers submitted yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Are you familiar with this coursework topic? Share your solution below to help your peers and earn campus academic reputation!
            </p>
          </div>
        ) : (
          question.answers.map((answer) => {
            const answerAuthorName = answer.isAnonymous
              ? 'Anonymous Peer'
              : answer.author?.profile
              ? `${answer.author.profile.firstName} ${answer.author.profile.lastName}`
              : 'University Student';
            const answerAuthorLevel = !answer.isAnonymous && answer.author?.profile?.level ? `${answer.author.profile.level}L` : null;

            return (
              <div
                key={answer.id}
                className={`rounded-3xl p-6 sm:p-7 transition-all space-y-4 relative ${
                  answer.isMarkedHelpful
                    ? 'bg-emerald-50/70 border-2 border-emerald-400 shadow-md ring-1 ring-emerald-400/20'
                    : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Accepted Solution Top Banner */}
                {answer.isMarkedHelpful && (
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-900 tracking-wide uppercase">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Verified Peer Solution
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-white/70 px-2 py-0.5 rounded-md border border-emerald-200">
                      Accepted by Author
                    </span>
                  </div>
                )}

                {/* Answer Author Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl text-white font-extrabold flex items-center justify-center text-xs shadow-xs ${
                        answer.isMarkedHelpful ? 'bg-emerald-700' : 'bg-slate-900'
                      }`}
                    >
                      {answer.isAnonymous ? '?' : answerAuthorName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900">
                          {answerAuthorName}
                        </span>
                        {answer.isAnonymous ? (
                          <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md">
                            Anonymous
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-md border border-blue-200">
                              <UserCheck className="w-3 h-3" /> Verified Student
                            </span>
                            {answerAuthorLevel && (
                              <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md">
                                {answerAuthorLevel}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                              ★ {answer.author?.profile?.reputationPoints ?? 0} rep
                            </span>
                            {(answer.author?.badges?.[0] || (answer.author?.profile as any)?.badges?.[0]) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200">
                                🏆 {answer.author?.badges?.[0] || (answer.author?.profile as any)?.badges?.[0]}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">Answered recently</span>
                    </div>
                  </div>

                  {/* Author 'Mark as Accepted Solution' Button */}
                  {isQuestionAuthor && (
                    <button
                      onClick={() => markHelpfulMutation.mutate(answer.id)}
                      disabled={markHelpfulMutation.isPending}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 active:scale-95 ${
                        answer.isMarkedHelpful
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-700'
                      }`}
                      title={
                        answer.isMarkedHelpful
                          ? 'Click to unmark as accepted solution'
                          : 'Mark this answer as the accepted solution'
                      }
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{answer.isMarkedHelpful ? 'Accepted ✓' : 'Mark as Accepted Solution'}</span>
                    </button>
                  )}
                </div>

                {/* Answer Content */}
                <div className="pt-2">
                  <FormattedContent content={answer.content} />
                </div>

                {/* Answer Footer & Upvoting */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                  <button
                    onClick={() => answerUpvoteMutation.mutate(answer.id)}
                    disabled={answerUpvoteMutation.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border active:scale-95 ${
                      answer.isUpvoted
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${answer.isUpvoted ? 'fill-white stroke-white' : ''}`} />
                    <span>{answer.isUpvoted ? 'Upvoted' : 'Helpful'}</span>
                    <span className="font-mono text-[11px] ml-0.5">({answer.upvoteCount})</span>
                  </button>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {answer.upvoteCount} students found this helpful
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Answer Submission Box */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Your Answer</h3>
              <p className="text-[11px] text-slate-400">
                Help your peer with a structured, step-by-step academic explanation
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setEditorTab('write')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                editorTab === 'write' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('preview')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                editorTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          </div>
        </div>

        {submitError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmitAnswer} className="space-y-4">
          {editorTab === 'write' ? (
            <div className="space-y-2">
              {/* Quick Markdown Toolbar */}
              <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex-wrap">
                <button
                  type="button"
                  onClick={() => insertMarkdown('bold')}
                  className="px-2.5 py-1 hover:bg-slate-200 rounded text-xs font-bold"
                  title="Bold (**text**)"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('italic')}
                  className="px-2.5 py-1 hover:bg-slate-200 rounded text-xs italic font-serif"
                  title="Italic (*text*)"
                >
                  I
                </button>
                <span className="w-px h-3.5 bg-slate-200 mx-1" />
                <button
                  type="button"
                  onClick={() => insertMarkdown('code')}
                  className="px-2.5 py-1 hover:bg-slate-200 rounded text-xs font-mono font-bold flex items-center gap-1"
                  title="Insert Code Snippet"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Code Block
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('inline')}
                  className="px-2.5 py-1 hover:bg-slate-200 rounded text-xs font-mono"
                  title="Inline Code (`code`)"
                >
                  `code`
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('list')}
                  className="px-2.5 py-1 hover:bg-slate-200 rounded text-xs font-bold"
                  title="Bullet List (- item)"
                >
                  • Steps
                </button>
              </div>

              <textarea
                rows={6}
                required
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="Write your detailed explanation here. Include formulas, theorem proofs, or code snippets with ```cpp..."
                className="w-full px-4 py-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none font-mono"
              />
            </div>
          ) : (
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50 min-h-[160px] max-h-[280px] overflow-y-auto">
              {answerContent ? (
                <FormattedContent content={answerContent} />
              ) : (
                <p className="text-xs text-slate-400 italic">No solution explanation to preview yet.</p>
              )}
            </div>
          )}

          {/* Anonymous toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="anonymousAnswerCheck"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
            <label
              htmlFor="anonymousAnswerCheck"
              className="text-xs font-bold text-slate-700 cursor-pointer select-none flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5 text-slate-500" />
              Post solution anonymously (hide your name from peers)
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
            <p className="text-[11px] text-slate-400">
              💡 Solutions marked as accepted earn +15 campus academic reputation points.
            </p>
            <button
              type="submit"
              disabled={createAnswerMutation.isPending}
              className="px-6 py-2.5 text-xs font-extrabold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              {createAnswerMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting Answer...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Post Answer
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
