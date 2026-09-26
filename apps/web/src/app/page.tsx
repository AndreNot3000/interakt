'use client';

import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import {
  Sparkles,
  ShieldCheck,
  Send,
  Image as ImageIcon,
  HelpCircle,
  BarChart2,
  FileText,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Building,
  BookOpen,
  School,
  Layers,
  GraduationCap,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  Code,
  Copy,
  X,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AcademicReactions } from '@/components/feed/AcademicReactions';
import { ThreadedComments } from '@/components/feed/ThreadedComments';
import { SharePostModal } from '@/components/feed/SharePostModal';

type FeedScope = 'CAMPUS' | 'FACULTY' | 'DEPARTMENT' | 'LEVEL' | 'ENROLLED_COURSES';

interface UploadedAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  publicUrl: string;
}

export default function CampusHomePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeScope, setActiveScope] = useState<FeedScope>('CAMPUS');

  // Post Creator State
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'TEXT' | 'QUESTION' | 'RESOURCE' | 'EVENT' | 'POLL'>('TEXT');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local optimistic feedback for bookmarks and comment expansion
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [shareModalPost, setShareModalPost] = useState<any>(null);

  // 1. Fetch Enrolled Courses for Post Composer Context
  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['my-enrolled-courses-selector'],
    queryFn: async () => {
      try {
        const res = await api.get('/courses/my-courses');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Multi-Scope Feed with TanStack React Query (Cached & Infinite Scrolling)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['campus-feed', activeScope],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get('/posts', {
        params: {
          scope: activeScope,
          page: pageParam,
          limit: 10,
        },
      });
      return res.data?.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (lastPage?.meta?.hasNextPage) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
  });

  // 3. Auto-fetch next page when sentinel is in view
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Aggregate all pages into a flat array of posts
  const allPosts = data?.pages?.flatMap((page: any) => page?.data || []) || [];

  // Scopes tab definition
  const scopes: {
    id: FeedScope;
    label: string;
    icon: any;
    subtitle: string;
  }[] = [
    {
      id: 'CAMPUS',
      label: 'All Campus',
      icon: Building,
      subtitle: 'Campus-wide announcements & discussions across the entire university',
    },
    {
      id: 'FACULTY',
      label: user?.profile?.faculty?.name ? `Faculty of ${user.profile.faculty.name.replace(/^Faculty of\s+/i, '')}` : 'My Faculty',
      icon: School,
      subtitle: user?.profile?.faculty?.name ? `Discussions and updates from ${user.profile.faculty.name}` : 'Conversations with peers in your faculty',
    },
    {
      id: 'DEPARTMENT',
      label: user?.profile?.department?.name ? `Dept: ${user.profile.department.name.replace(/^Department of\s+/i, '')}` : 'My Department',
      icon: Layers,
      subtitle: user?.profile?.department?.name ? `Specialized coursework and peer discussions in ${user.profile.department.name}` : 'Conversations within your department',
    },
    {
      id: 'LEVEL',
      label: user?.profile?.level ? `${user.profile.level}L Cohort` : 'My Level',
      icon: GraduationCap,
      subtitle: user?.profile?.level ? `Academic updates and projects for the ${user.profile.level} Level cohort` : 'Discussions with classmates in your year',
    },
    {
      id: 'ENROLLED_COURSES',
      label: 'My Courses',
      icon: BookOpen,
      subtitle: 'Course-specific notices, materials, and study questions from registered courses',
    },
  ];

  const activeScopeMeta = scopes.find((s) => s.id === activeScope) || scopes[0];

  // Insert code snippet template
  const insertCodeTemplate = () => {
    const template = '\n```python\n# Paste or write your code snippet here\ndef solution():\n    pass\n```\n';
    setPostContent((prev) => prev + template);
  };

  // Direct MinIO File Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith('image/');
        const folder = isImg ? 'posts/images' : 'posts/documents';

        const res = await api.post('/storage/upload-url', {
          folder,
          mimeType: file.type || (isImg ? 'image/png' : 'application/pdf'),
        });

        if (res.data?.success && res.data?.data) {
          const { uploadUrl, publicUrl } = res.data.data;

          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || (isImg ? 'image/png' : 'application/pdf') },
            body: file,
          });

          setAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${i}`,
              name: file.name,
              size: file.size,
              mimeType: file.type || (isImg ? 'image/png' : 'application/pdf'),
              publicUrl,
            },
          ]);
        }
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Post Submission
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        content: postContent.trim(),
        type: postType,
        mediaUrls: attachments.map((a) => a.publicUrl),
      };

      if (selectedCourseId) {
        payload.courseId = selectedCourseId;
      }

      if (postType === 'POLL') {
        const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (validOptions.length >= 2) {
          payload.pollData = {
            options: validOptions,
            votes: {},
          };
        }
      }

      const res = await api.post('/posts', payload);
      if (res.data?.success) {
        setPostContent('');
        setPollOptions(['', '']);
        setSelectedCourseId('');
        setAttachments([]);
        // Invalidate feed queries so all relevant tabs pick up the new post
        queryClient.invalidateQueries({ queryKey: ['campus-feed'] });
      }
    } catch (err) {
      console.error('Failed to publish post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBookmark = async (postId: string, currentBookmarked: boolean) => {
    const nextBookmarked = !currentBookmarked;
    setLocalBookmarks((prev) => ({ ...prev, [postId]: nextBookmarked }));

    try {
      if (nextBookmarked) {
        await api.post(`/posts/${postId}/bookmark`, {});
      } else {
        await api.delete(`/posts/${postId}/bookmark`);
      }
    } catch {
      setLocalBookmarks((prev) => ({ ...prev, [postId]: currentBookmarked }));
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
    <div className="space-y-6">
      {/* 1. Personalized Campus Greeting Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Good day, {user?.profile?.firstName || 'David'} 👋
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Student
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Welcome to your digital campus. You have 3 lectures today and 1 upcoming assignment due tomorrow.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-white/10 text-white font-medium backdrop-blur-xs">
            {user?.profile?.faculty?.name || 'Faculty of Science'} • {user?.profile?.level || 300} Level
          </span>
          {user?.profile?.department?.name && (
            <span className="text-xs px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-200 font-medium">
              {user.profile.department.name}
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Campus Post Creator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            {/* Context Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Post target:</span>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="">🌐 Entire Campus</option>
                {enrolledCourses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Post Type Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'TEXT', label: 'Discussion', icon: MessageCircle },
                { id: 'QUESTION', label: 'Academic Q&A', icon: HelpCircle },
                { id: 'RESOURCE', label: 'Resource Share', icon: FileText },
                { id: 'EVENT', label: 'Event Promo', icon: Calendar },
                { id: 'POLL', label: 'Poll', icon: BarChart2 },
              ].map((t) => {
                const isSelected = postType === t.id;
                const Icon = t.icon;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setPostType(t.id as any)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            rows={3}
            placeholder={
              postType === 'QUESTION'
                ? 'Ask your classmates or campus an academic question... (code snippets supported with ```)'
                : postType === 'POLL'
                ? 'What would you like to poll the campus or course on?'
                : postType === 'RESOURCE'
                ? 'Describe the academic notes, past question, or reference you are sharing...'
                : postType === 'EVENT'
                ? 'Promote an upcoming campus meetup, workshop, seminar, or club fest...'
                : 'Share an insight, question, study group invitation, or lecture note...'
            }
            className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none"
          />

          {/* Poll Options Editor */}
          {postType === 'POLL' && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-600">Poll Options</p>
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  + Add another option
                </button>
              )}
            </div>
          )}

          {/* Pre-Publish Attachment Preview Cards */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {attachments.map((att) => {
                const isImg = att.mimeType.startsWith('image/');
                return (
                  <div
                    key={att.id}
                    className="relative group flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs max-w-xs shadow-2xs"
                  >
                    {isImg ? (
                      <img
                        src={att.publicUrl}
                        alt={att.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-slate-800 truncate text-[11px] max-w-[140px]">
                        {att.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(att.size / 1024).toFixed(0)} KB • {isImg ? 'Photo' : 'Document'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200/60 ml-auto transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Uploading Status Banner */}
          {isUploadingMedia && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50/60 px-3 py-1.5 rounded-lg border border-blue-200/60">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading media to campus storage...</span>
            </div>
          )}

          {/* Post Action Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.ppt,.pptx"
              className="hidden"
            />

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                title="Add Photo / Media"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Add Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                title="Attach Document / PDF"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Attach PDF / Slides</span>
              </button>

              <button
                type="button"
                onClick={insertCodeTemplate}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                title="Insert formatted code snippet"
              >
                <Code className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">Code</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploadingMedia || (!postContent.trim() && attachments.length === 0)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Posting...' : 'Publish Post'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Multi-Scope Feed Switcher Tabs (CARD-M02-01) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px scrollbar-none">
          {scopes.map((scope) => {
            const isActive = activeScope === scope.id;
            const Icon = scope.icon;
            return (
              <button
                key={scope.id}
                onClick={() => setActiveScope(scope.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{scope.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scope Context Description Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 py-1">
          <span>{activeScopeMeta.subtitle}</span>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 4. Posts Feed List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 animate-pulse">
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
            <p className="text-sm font-bold text-rose-600">Failed to load feed</p>
            <p className="text-xs text-slate-500 mt-1">Check your connection and try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900">
              No posts in {activeScopeMeta.label} yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first student or rep to share an update, question, or study resource to this stream!
            </p>
          </div>
        ) : (
          allPosts.map((post: any) => {
            const isBookmarked = localBookmarks[post.id] ?? post.isBookmarked ?? false;
            const isAuthorRep = post.author?.role === 'STUDENT' && post.isPinned;

            return (
              <article
                key={post.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Post Header */}
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
                        {isAuthorRep && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⭐ Course Rep
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
                        {post.group && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            👥 {post.group.name}
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

                  <button className="text-slate-400 hover:text-slate-600 p-1">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Post Body: Formatted Content with Code Highlighting */}
                <div className="space-y-3">
                  {renderFormattedContent(post.content)}
                </div>

                {/* Attached Media / Photos / Documents Gallery */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <PostMediaGallery mediaUrls={post.mediaUrls} />
                )}

                {/* Attached Poll View */}
                {post.type === 'POLL' && post.pollData && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Campus Poll</p>
                    {(post.pollData.options || []).map((opt: string, i: number) => (
                      <button
                        key={i}
                        className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-between"
                      >
                        <span>{opt}</span>
                        <span className="text-slate-400 text-[11px] font-normal">Vote</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Post Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    {/* Academic Reactions Component (CARD-M02-03) */}
                    <AcademicReactions
                      targetId={post.id}
                      targetType="post"
                      initialCount={post.reactionCount || 0}
                      initialUserReaction={post.userReaction}
                      onReactionChange={() => {
                        // Keep feed cache fresh on reactions
                        queryClient.invalidateQueries({ queryKey: ['campus-feed'] });
                      }}
                    />

                    {/* Comments Toggle */}
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

                    {/* Share Button */}
                    <button
                      onClick={() => setShareModalPost(post)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => handleToggleBookmark(post.id, isBookmarked)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isBookmarked ? 'fill-blue-600' : ''}`}
                    />
                  </button>
                </div>

                {/* Collapsible Threaded Discussions Section (CARD-M02-03) */}
                {expandedComments[post.id] && (
                  <ThreadedComments
                    postId={post.id}
                    postAuthorId={post.author?.id}
                  />
                )}
              </article>
            );
          })
        )}

        {/* 5. Infinite Scrolling Sentinel & Load More Trigger */}
        <div ref={sentinelRef} className="py-4 text-center">
          {isFetchingNextPage ? (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading more campus updates...</span>
            </div>
          ) : hasNextPage ? (
            <button
              onClick={() => fetchNextPage()}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl shadow-xs transition-colors"
            >
              Load More Updates
            </button>
          ) : allPosts.length > 0 ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 py-4 border-t border-slate-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>You are all caught up on {activeScopeMeta.label} stream!</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Share Post Modal (CARD-M02-04) */}
      <SharePostModal
        post={shareModalPost}
        isOpen={!!shareModalPost}
        onClose={() => setShareModalPost(null)}
      />
    </div>
  );
}

// ============================================================
// RICH TEXT & CODE SNIPPET FORMATTER
// ============================================================
function renderFormattedContent(content: string) {
  if (!content) return null;

  // Split on markdown code blocks ```lang ... ```
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

// ============================================================
// MEDIA & DOCUMENT ATTACHMENTS GALLERY
// ============================================================
function PostMediaGallery({ mediaUrls }: { mediaUrls: string[] }) {
  if (!mediaUrls || mediaUrls.length === 0) return null;

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
  const isDoc = (url: string) => /\.(pdf|doc|docx|ppt|pptx)($|\?)/i.test(url);

  const images = mediaUrls.filter(isImage);
  const docs = mediaUrls.filter(isDoc);
  const others = mediaUrls.filter((u) => !isImage(u) && !isDoc(u));

  return (
    <div className="space-y-2.5 pt-1">
      {/* Images Grid */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 rounded-xl overflow-hidden ${
            images.length === 1 ? 'grid-cols-1 max-w-lg' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
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

      {/* Documents List */}
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
