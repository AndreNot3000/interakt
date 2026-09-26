'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BookOpen,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  ChevronLeft,
  CheckCircle2,
  Download,
  AlertCircle,
  Plus,
  Send,
  ThumbsUp,
  Loader2,
  ShieldCheck,
  Award,
  Sparkles,
  ExternalLink,
  UsersRound,
  Lock,
  X,
} from 'lucide-react';

interface CourseDetail {
  id: string;
  code: string;
  name: string;
  units: number;
  level: number;
  semester: number;
  description?: string;
  isEnrolled: boolean;
  programme?: {
    id: string;
    name: string;
    shortName: string;
    department?: {
      id: string;
      name: string;
      shortName: string;
      faculty?: {
        id: string;
        name: string;
        shortName: string;
      };
    };
  };
  posts?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      verificationStatus: string;
      role: string;
      profile?: {
        firstName: string;
        lastName: string;
        displayName?: string;
        avatarUrl?: string;
        level?: number;
      };
    };
    _count?: { comments: number; reactions: number };
  }>;
  resources?: Array<{
    id: string;
    title: string;
    type: string;
    fileSize?: number;
    downloadCount?: number;
    createdAt: string;
    uploader?: {
      profile?: { firstName: string; lastName: string; avatarUrl?: string };
    };
  }>;
  questions?: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    author: {
      profile?: { firstName: string; lastName: string; avatarUrl?: string };
    };
    _count?: { answers: number; bookmarks: number };
  }>;
  announcements?: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    createdAt: string;
  }>;
  _count?: {
    enrollments: number;
    posts: number;
    resources: number;
    questions: number;
    announcements: number;
  };
}

interface MemberItem {
  id: string;
  user: {
    id: string;
    verificationStatus: string;
    profile?: {
      firstName: string;
      lastName: string;
      displayName?: string;
      avatarUrl?: string;
      level?: number;
    };
  };
}

export default function CourseCommunityHubPage({
  params,
}: {
  params: { id: string };
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'discussion' | 'resources' | 'study-groups' | 'timetable' | 'members'
  >('overview');
  const [postInput, setPostInput] = useState('');

  // Circle creation modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [circleTitle, setCircleTitle] = useState('');
  const [circleDesc, setCircleDesc] = useState('');
  const [circleIsPrivate, setCircleIsPrivate] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [circleError, setCircleError] = useState<string | null>(null);

  // 1. Fetch Course Detail
  const { data: course, isLoading, isError } = useQuery<CourseDetail>({
    queryKey: ['course', params.id],
    queryFn: async () => {
      const res = await api.get(`/courses/${params.id}`);
      return res.data.data;
    },
  });

  // 1b. Fetch Study Circles linked to this Course
  const { data: studyGroupsData } = useQuery<any[]>({
    queryKey: ['course-study-groups', params.id],
    queryFn: async () => {
      const res = await api.get('/groups', { params: { courseId: params.id, limit: 50 } });
      return res.data?.data?.data || [];
    },
    enabled: activeTab === 'study-groups' || !!course,
  });

  // 2. Fetch Course Members
  const { data: membersData } = useQuery<MemberItem[]>({
    queryKey: ['course-members', params.id],
    queryFn: async () => {
      const res = await api.get(`/courses/${params.id}/members`);
      return res.data.data?.data || [];
    },
    enabled: activeTab === 'members' || !!course,
  });

  // 3. Enrollment Mutation
  const enrollMutation = useMutation({
    mutationFn: async (isCurrentlyEnrolled: boolean) => {
      if (isCurrentlyEnrolled) {
        await api.delete(`/courses/${params.id}/enroll`);
      } else {
        await api.post(`/courses/${params.id}/enroll`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', params.id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-members', params.id] });
    },
  });

  // 4. Create Post in Course
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!course) return;
      await api.post('/posts', {
        content,
        courseId: course.id,
        type: 'TEXT',
      });
    },
    onSuccess: () => {
      setPostInput('');
      queryClient.invalidateQueries({ queryKey: ['course', params.id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-700">Loading course community...</p>
      </div>
    );
  }

  // Fallback defaults for empty relations
  const courseCode = course?.code || 'CSC 301';
  const courseName = course?.name || 'Algorithm Design and Analysis';
  const facultyName = course?.programme?.department?.faculty?.name || 'Faculty of Science';
  const deptName = course?.programme?.department?.name || 'Department of Computer Science';
  const progName = course?.programme?.name || 'B.Sc. Computer Science';
  const isEnrolled = !!course?.isEnrolled;
  const peerCount = course?._count?.enrollments ?? 0;

  const sampleTimetable = [
    { type: 'Lecture', day: 'Monday', time: '10:00 AM - 12:00 PM', venue: 'Lecture Hall B (Science Complex)', instructor: 'Prof. Williams' },
    { type: 'Tutorial Session', day: 'Thursday', time: '02:00 PM - 04:00 PM', venue: 'LT 1', instructor: 'Course Rep & TAs' },
    { type: 'Practical Lab', day: 'Friday', time: '10:00 AM - 12:00 PM', venue: 'CS Lab 2', instructor: 'Lab Technologist' },
  ];

  const handleOpenFormGroup = () => {
    setCircleTitle(`${courseCode}: Peer Study Pod`);
    setCircleDesc(`Exam prep and problem set walkthroughs for ${courseCode} (${courseName}).`);
    setCircleIsPrivate(false);
    setCircleError(null);
    setIsGroupModalOpen(true);
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleTitle.trim() || !course) return;
    setIsCreatingCircle(true);
    setCircleError(null);
    try {
      await api.post('/groups', {
        name: circleTitle.trim(),
        description: circleDesc.trim() || undefined,
        type: 'ACADEMIC',
        courseId: course.id,
        isPrivate: circleIsPrivate,
      });
      setIsGroupModalOpen(false);
      setCircleTitle('');
      setCircleDesc('');
      queryClient.invalidateQueries({ queryKey: ['course-study-groups', params.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-directory'] });
    } catch (err: any) {
      setCircleError(err.response?.data?.message || 'Failed to form study circle.');
    } finally {
      setIsCreatingCircle(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Course Directory
      </Link>

      {/* Course Community Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-black px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {courseCode}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                {course?.units ?? 3} Credit Units
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                Level {course?.level ?? 300}L • Semester {course?.semester ?? 1}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {courseName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {facultyName} • {deptName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xl font-extrabold text-slate-900 block">
                {peerCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">Enrolled Peers</span>
            </div>

            <button
              onClick={() => enrollMutation.mutate(isEnrolled)}
              disabled={enrollMutation.isPending}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                isEnrolled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {enrollMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isEnrolled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✓ Enrolled Community</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Join Course Community</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Core Tabs */}
        <div className="flex border-b border-slate-200 gap-2 sm:gap-6 mt-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen, count: undefined },
            { id: 'discussion', label: 'Discussions', icon: MessageSquare, count: course?.posts?.length || course?._count?.posts },
            { id: 'resources', label: 'Materials', icon: FileText, count: course?.resources?.length || course?._count?.resources },
            { id: 'study-groups', label: 'Study Groups', icon: UsersRound, count: studyGroupsData?.length },
            { id: 'timetable', label: 'Timetable & Sessions', icon: Calendar, count: 3 },
            { id: 'members', label: 'Classmates', icon: Users, count: peerCount },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">Course Syllabus & Description</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {course?.description ||
                  `Advanced foundational curriculum for ${courseCode} (${courseName}). Topics covered include core theoretical principles, laboratory implementations, design patterns, algorithmic complexity analysis, and semester evaluations.`}
              </p>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Credits</span>
                  <span className="font-bold text-slate-800">{course?.units ?? 3} Units</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Academic Level</span>
                  <span className="font-bold text-slate-800">{course?.level ?? 300} Level</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Semester</span>
                  <span className="font-bold text-slate-800">Semester {course?.semester ?? 1}</span>
                </div>
              </div>
            </div>

            {/* Course Announcements */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Course Notices & Announcements
              </h2>
              {course?.announcements && course.announcements.length > 0 ? (
                <div className="space-y-2">
                  {course.announcements.map((ann) => (
                    <div key={ann.id} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                      <p className="text-xs font-bold text-slate-900">{ann.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{ann.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">No active announcements for this course community.</p>
              )}
            </div>
          </div>

          {/* Academic Tree Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 h-fit">
            <h2 className="text-sm font-bold text-slate-900">Academic Hierarchy</h2>
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Faculty</span>
                <span className="font-bold text-slate-800 text-xs">{facultyName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-bold text-slate-800 text-xs">{deptName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Degree Programme</span>
                <span className="font-bold text-slate-800 text-xs">{progName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISCUSSIONS */}
      {activeTab === 'discussion' && (
        <div className="space-y-4">
          {/* Post Composer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <form onSubmit={handlePostSubmit} className="flex gap-3">
              <input
                type="text"
                value={postInput}
                onChange={(e) => setPostInput(e.target.value)}
                placeholder={`Ask a question or discuss ${courseCode} lectures...`}
                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={!postInput.trim() || createPostMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Posts Stream */}
          {course?.posts && course.posts.length > 0 ? (
            course.posts.map((post) => (
              <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {post.author.profile?.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">
                        {post.author.profile ? `${post.author.profile.firstName} ${post.author.profile.lastName}` : 'Verified Peer'}
                      </span>
                      {post.author.verificationStatus === 'VERIFIED' && (
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 inline ml-1" />
                      )}
                    </div>
                  </div>
                  <span className="text-slate-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{post.content}</p>

                <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-semibold">
                  <button className="flex items-center gap-1 hover:text-blue-600">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{post._count?.reactions ?? 0} Helpful</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-blue-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post._count?.comments ?? 0} Replies</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No discussions yet in {courseCode}</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to post a question or topic!</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MATERIALS / RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Study Materials & Past Papers</h2>
              <p className="text-xs text-slate-500">Lecture slides, exam papers, and syllabus notes for {courseCode}</p>
            </div>
            <Link
              href="/resources"
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Material</span>
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
            {course?.resources && course.resources.length > 0 ? (
              course.resources.map((res) => (
                <div key={res.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {res.type}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{res.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {res.uploader?.profile ? `${res.uploader.profile.firstName} ${res.uploader.profile.lastName}` : 'Course Rep'} • {res.downloadCount ?? 0} downloads
                      </p>
                    </div>
                  </div>
                  <button className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No materials uploaded yet for this course. Click "Upload Material" to share slides or past questions!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: STUDY GROUPS & PEER CIRCLES */}
      {activeTab === 'study-groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl p-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-blue-600" />
                <span>{courseCode} Study Groups & Peer Circles</span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Small, focused peer circles studying {courseName}. Join an active squad or start your own!
              </p>
            </div>
            <button
              onClick={handleOpenFormGroup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Form Study Circle</span>
            </button>
          </div>

          {studyGroupsData && studyGroupsData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studyGroupsData.map((group: any) => (
                <div
                  key={group.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                        {group.type}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {group.memberCount} members
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{group.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {group.description || `Study pod for ${courseCode} coursework.`}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {group.isPrivate ? '🔒 Private' : '🌐 Open Pod'}
                    </span>
                    <Link
                      href={`/groups/${group.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
                    >
                      Open Circle →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
              <UsersRound className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No study groups formed yet for {courseCode}</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Be the first classmate to create a study pod for {courseCode} lectures and exams!
              </p>
              <button
                onClick={handleOpenFormGroup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Form {courseCode} Study Circle</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TIMETABLE & SESSIONS */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Weekly Lecture & Tutorial Schedule</h2>
            <div className="space-y-3">
              {sampleTimetable.map((slot, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {slot.type}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{slot.day} • {slot.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Venue: {slot.venue}</p>
                  </div>
                  <span className="text-xs text-slate-600 font-semibold">{slot.instructor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MEMBERS (ROSTER) */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Enrolled Classmates ({peerCount})</h2>
            <span className="text-xs text-slate-400">Verified students registered in {courseCode}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
            {membersData && membersData.length > 0 ? (
              membersData.map((m) => {
                const name = m.user.profile
                  ? `${m.user.profile.firstName} ${m.user.profile.lastName}`
                  : 'Student';
                return (
                  <div key={m.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900">{name}</span>
                          {m.user.verificationStatus === 'VERIFIED' && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {m.user.profile?.level ? `${m.user.profile.level}L` : 'Student'}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/messages?userId=${m.user.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      Message
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No classmates enrolled yet. Click "Join Course Community" to enroll!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Form Course Study Circle */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900">Form {courseCode} Study Circle</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Launch a collaborative study squad linked to {courseName}.
                </p>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {circleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {circleError}
              </div>
            )}

            <form onSubmit={handleCreateCircle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Circle Title *
                </label>
                <input
                  type="text"
                  required
                  value={circleTitle}
                  onChange={(e) => setCircleTitle(e.target.value)}
                  placeholder={`e.g. ${courseCode}: Algorithms Study Squad`}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Study Focus & Goals
                </label>
                <textarea
                  rows={3}
                  value={circleDesc}
                  onChange={(e) => setCircleDesc(e.target.value)}
                  placeholder="e.g. Weekly problem sets, reviewing lecture slides, preparing for semester exams..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Private Circle</span>
                    <span className="text-[11px] text-slate-500">Require approval to join this study pod</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={circleIsPrivate}
                    onChange={(e) => setCircleIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCircle}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {isCreatingCircle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Circle...</span>
                    </>
                  ) : (
                    <span>Create Circle</span>
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
