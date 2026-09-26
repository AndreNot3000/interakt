'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  HelpCircle,
  Plus,
  Search,
  CheckCircle2,
  ThumbsUp,
  MessageSquare,
  Bookmark,
  Share2,
  Tag,
  BookOpen,
  Filter,
  Code2,
  Eye,
  Edit3,
  Loader2,
  X,
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  Layers,
  Check,
  ExternalLink,
} from 'lucide-react';

interface QuestionAuthor {
  id: string;
  verificationStatus?: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    level?: number | string | null;
  } | null;
}

interface QuestionItem {
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
  acceptedAnswerSnippet?: string | null;
  createdAt: string;
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  level?: number;
}

// Highlight matching search words in text
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim() || !text) {
    return <>{text}</>;
  }

  const terms = highlight
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (terms.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-amber-100 text-amber-900 rounded-xs px-0.5 font-semibold"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

// Render content with code block support
function ContentPreview({ content, search }: { content: string; search: string }) {
  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);

  if (match) {
    const beforeCode = content.slice(0, match.index).trim();
    const language = match[1] || 'code';
    const code = match[2];

    return (
      <div className="space-y-2.5">
        {beforeCode && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
            <HighlightText text={beforeCode} highlight={search} />
          </p>
        )}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-100 text-[11px] font-mono shadow-xs">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 font-sans font-bold">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3 h-3 text-blue-400" />
              {language.toUpperCase()}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Preview</span>
          </div>
          <pre className="p-3 overflow-x-auto text-emerald-400 leading-relaxed max-h-48">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
      <HighlightText text={content} highlight={search} />
    </p>
  );
}

export default function AcademicQAPage() {
  const queryClient = useQueryClient();

  // Filters & State
  const [activeFilter, setActiveFilter] = useState<'all' | 'my-courses' | 'unanswered' | 'most-upvoted'>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Ask Question Modal State
  const [showAskModal, setShowAskModal] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionCourseId, setQuestionCourseId] = useState('');
  const [questionTags, setQuestionTags] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [modalError, setModalError] = useState('');

  // Fetch Courses for Dropdown
  const { data: coursesData } = useQuery<{ data: CourseOption[] }>({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const res = await api.get('/courses', { params: { limit: 100 } });
      const raw = res.data?.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  });

  const courses: CourseOption[] = coursesData || [];

  // Fetch Questions
  const {
    data: questionsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['questions', activeFilter, selectedCourseId, selectedTag, search],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: 50,
      };

      if (activeFilter !== 'all') {
        params.filter = activeFilter;
      }
      if (selectedCourseId !== 'ALL') {
        params.courseId = selectedCourseId;
      }
      if (selectedTag !== 'ALL') {
        params.tag = selectedTag;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get('/questions', { params });
      const raw = res.data?.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  });

  const questions: QuestionItem[] = questionsData || [];

  // Dynamic tags from loaded questions
  const availableTags = useMemo(() => {
    const defaultTags = ['data-structures', 'operating-systems', 'circuit-theory', 'algorithms', 'recursion'];
    const dynamicTags = questions.flatMap((q) => q.tags || []);
    const unique = Array.from(new Set([...defaultTags, ...dynamicTags]));
    return unique.slice(0, 10);
  }, [questions]);

  // Toggle Upvote Mutation (Optimistic)
  const upvoteMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await api.post(`/questions/${questionId}/upvote`);
      return res.data;
    },
    onMutate: async (questionId: string) => {
      await queryClient.cancelQueries({ queryKey: ['questions'] });
      const previousData = queryClient.getQueryData(['questions', activeFilter, selectedCourseId, selectedTag, search]);

      queryClient.setQueryData(
        ['questions', activeFilter, selectedCourseId, selectedTag, search],
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((q: QuestionItem) => {
              if (q.id === questionId) {
                const isCurrentlyUpvoted = Boolean(q.isUpvoted);
                return {
                  ...q,
                  isUpvoted: !isCurrentlyUpvoted,
                  upvoteCount: isCurrentlyUpvoted ? Math.max(0, q.upvoteCount - 1) : q.upvoteCount + 1,
                };
              }
              return q;
            });
          }
          return old;
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['questions', activeFilter, selectedCourseId, selectedTag, search],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Create Question Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      courseId?: string;
      tags?: string[];
      isAnonymous?: boolean;
    }) => {
      const res = await api.post('/questions', payload);
      return res.data;
    },
    onSuccess: () => {
      setShowAskModal(false);
      setQuestionTitle('');
      setQuestionCourseId('');
      setQuestionTags('');
      setQuestionContent('');
      setIsAnonymous(false);
      setModalError('');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || 'Failed to post question. Please try again.');
    },
  });

  const insertMarkdown = (syntax: string) => {
    if (syntax === 'code') {
      setQuestionContent((prev) => prev + '\n```cpp\n// Your code snippet here\n```\n');
    } else if (syntax === 'inline') {
      setQuestionContent((prev) => prev + ' `inlineCode` ');
    } else if (syntax === 'bold') {
      setQuestionContent((prev) => prev + ' **bold text** ');
    } else if (syntax === 'italic') {
      setQuestionContent((prev) => prev + ' *italic text* ');
    } else if (syntax === 'list') {
      setQuestionContent((prev) => prev + '\n- Item 1\n- Item 2\n');
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionTitle.trim()) {
      setModalError('Please enter a question title.');
      return;
    }
    if (!questionContent.trim()) {
      setModalError('Please provide details for your academic question.');
      return;
    }

    const parsedTags = questionTags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    createMutation.mutate({
      title: questionTitle.trim(),
      content: questionContent.trim(),
      courseId: questionCourseId || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      isAnonymous,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-bold tracking-wide uppercase text-blue-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Academic Peer Knowledge Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Academic Q&A Forum
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
            Ask difficult coursework questions, share code solutions, get verified answers from departmental tutors, and build collaborative academic knowledge.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError('');
            setShowAskModal(true);
          }}
          className="px-5 py-3 bg-white text-blue-900 hover:bg-blue-50 font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4 text-blue-600 stroke-[3]" />
          Ask Question
        </button>
      </div>

      {/* Scope Navigation Tabs & Course Dropdown */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-xs">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All Questions
          </button>
          <button
            onClick={() => setActiveFilter('my-courses')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeFilter === 'my-courses'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            My Enrolled Courses
          </button>
          <button
            onClick={() => setActiveFilter('unanswered')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeFilter === 'unanswered'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Unanswered
          </button>
          <button
            onClick={() => setActiveFilter('most-upvoted')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeFilter === 'most-upvoted'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            🔥 Most Upvoted
          </button>
        </div>

        {/* Course Filter Dropdown */}
        <div className="flex items-center gap-2 min-w-0 md:min-w-[280px]">
          <BookOpen className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block ml-2" />
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white truncate cursor-pointer"
          >
            <option value="ALL">All Course Codes</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time Keyword Search & Tag Cloud */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search academic concepts, algorithms, theorems, or questions with live highlighting..."
            className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tag Cloud Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Topics:
          </span>
          <button
            onClick={() => setSelectedTag('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedTag === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Topics
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? 'ALL' : tag)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Questions Feed */}
      <div className="space-y-4">
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs space-y-3">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading academic questions...</p>
          </div>
        )}

        {isError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 space-y-2">
            <p className="text-xs font-bold">Failed to load questions from live server.</p>
            <button
              onClick={() => refetch()}
              className="text-xs font-extrabold text-blue-600 hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && questions.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">No questions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No questions matched "${search}". Try searching for another topic or course code.`
                : 'No academic questions have been posted for this filter yet. Be the first to start the discussion!'}
            </p>
            <button
              onClick={() => setShowAskModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Ask a Question
            </button>
          </div>
        )}

        {questions.map((q) => {
          const authorName = q.isAnonymous
            ? 'Anonymous Peer'
            : q.author?.profile
            ? `${q.author.profile.firstName} ${q.author.profile.lastName}`
            : 'University Student';
          const authorLevel = !q.isAnonymous && q.author?.profile?.level ? `${q.author.profile.level}L` : null;

          return (
            <div
              key={q.id}
              className="bg-white border border-slate-200/90 hover:border-blue-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4"
            >
              {/* Question Header & Upvote Box */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.course && (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                        📚 {q.course.code}
                      </span>
                    )}

                    {q.isResolved && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Accepted Solution
                      </span>
                    )}

                    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      {q.isAnonymous ? (
                        <span className="flex items-center gap-1 text-slate-500 font-semibold">
                          <UserX className="w-3.5 h-3.5 text-slate-400" />
                          Anonymous Peer
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                          {authorName}
                          {authorLevel && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-md font-bold">
                              {authorLevel}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link href={`/qa/${q.id}`}>
                    <h3 className="font-extrabold text-base text-slate-900 hover:text-blue-600 transition-colors cursor-pointer leading-snug">
                      <HighlightText text={q.title} highlight={search} />
                    </h3>
                  </Link>
                </div>

                {/* Upvote Counter Box */}
                <button
                  onClick={() => upvoteMutation.mutate(q.id)}
                  disabled={upvoteMutation.isPending}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all min-w-[58px] active:scale-95 ${
                    q.isUpvoted
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                  title="Upvote this question"
                >
                  <ThumbsUp
                    className={`w-4 h-4 mb-0.5 transition-transform ${
                      q.isUpvoted ? 'fill-white stroke-white scale-110' : 'text-slate-500 stroke-[2.2]'
                    }`}
                  />
                  <span className="text-xs font-black">{q.upvoteCount}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-tight ${q.isUpvoted ? 'text-blue-100' : 'text-slate-400'}`}>
                    votes
                  </span>
                </button>
              </div>

              {/* Content / Code Preview */}
              <ContentPreview content={q.content} search={search} />

              {/* Accepted Answer Preview if Available */}
              {q.acceptedAnswerSnippet && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-emerald-900 block">
                        Verified Peer Solution
                      </span>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium line-clamp-3">
                        "{q.acceptedAnswerSnippet}..."
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags and Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {q.tags?.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors"
                    >
                      #{t}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                  <button
                    onClick={() => upvoteMutation.mutate(q.id)}
                    className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                      q.isUpvoted ? 'text-blue-600 font-bold' : ''
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${q.isUpvoted ? 'fill-current' : ''}`} />
                    <span>{q.isUpvoted ? 'Upvoted' : 'Upvote'}</span>
                  </button>

                  <Link
                    href={`/qa/${q.id}`}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold text-slate-700"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span>{q.answerCount} Answers</span>
                  </Link>

                  <Link
                    href={`/qa/${q.id}`}
                    className="p-1 hover:text-blue-600 text-slate-400 transition-colors"
                    title="View full discussion thread"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ask Academic Question Modal */}
      {showAskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Ask an Academic Question</h2>
                  <p className="text-[11px] text-slate-400">Post to course peers and departmental tutors</p>
                </div>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAskQuestion} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Question Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  placeholder="e.g. Can someone explain QuickSort partitioning with duplicate elements?"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Related Course
                  </label>
                  <select
                    value={questionCourseId}
                    onChange={(e) => setQuestionCourseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 font-medium"
                  >
                    <option value="">General University Topic</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={questionTags}
                    onChange={(e) => setQuestionTags(e.target.value)}
                    placeholder="e.g. algorithms, sorting, csc301"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 font-medium"
                  />
                </div>
              </div>

              {/* Rich Markdown & Code Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">
                    Detailed Explanation & Code <span className="text-rose-500">*</span>
                  </label>
                  {/* Write vs Preview Tabs */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        editorTab === 'write' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        editorTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                  </div>
                </div>

                {editorTab === 'write' ? (
                  <div className="space-y-1.5">
                    {/* Markdown Quick Tools */}
                    <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                      <button
                        type="button"
                        onClick={() => insertMarkdown('bold')}
                        className="px-2 py-1 hover:bg-slate-200 rounded text-xs font-bold"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('italic')}
                        className="px-2 py-1 hover:bg-slate-200 rounded text-xs italic font-serif"
                        title="Italic"
                      >
                        I
                      </button>
                      <span className="w-px h-3.5 bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => insertMarkdown('code')}
                        className="px-2 py-1 hover:bg-slate-200 rounded text-xs font-mono font-bold flex items-center gap-1"
                        title="Code Block"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        Code
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('inline')}
                        className="px-2 py-1 hover:bg-slate-200 rounded text-xs font-mono"
                        title="Inline Code"
                      >
                        `code`
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('list')}
                        className="px-2 py-1 hover:bg-slate-200 rounded text-xs font-bold"
                        title="Bullet List"
                      >
                        • List
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      required
                      value={questionContent}
                      onChange={(e) => setQuestionContent(e.target.value)}
                      placeholder="Provide background, equations, error logs, or code snippets with ```language..."
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none font-mono"
                    />
                  </div>
                ) : (
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 min-h-[140px] max-h-[220px] overflow-y-auto">
                    {questionContent ? (
                      <ContentPreview content={questionContent} search="" />
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nothing to preview yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor="anonymousCheck"
                  className="text-xs font-bold text-slate-700 cursor-pointer select-none flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5 text-slate-500" />
                  Post anonymously to course peers (name hidden)
                </label>
              </div>

              {/* Guidance Tip */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 leading-relaxed font-medium">
                💡 <strong>Tip:</strong> Questions with specific error traces, formula names, or code snippets receive verified peer answers 3x faster!
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 text-xs font-extrabold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Question'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
