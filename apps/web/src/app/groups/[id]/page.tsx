'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  UsersRound,
  GraduationCap,
  ShieldCheck,
  Plus,
  Users,
  MessageSquare,
  FileText,
  Lock,
  Globe2,
  Calendar,
  Share2,
  CheckCircle2,
  Send,
  Loader2,
  Download,
  ArrowLeft,
  BookOpen,
  X,
  ThumbsUp,
  Sparkles,
  Megaphone,
  Video,
  MapPin,
  Clock,
  ExternalLink,
  Award,
  Upload,
  FileUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GroupDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  courseId?: string | null;
  course?: {
    id: string;
    name: string;
    code: string;
    units?: number;
    level?: number;
  } | null;
  avatarUrl?: string;
  coverImageUrl?: string;
  isPrivate: boolean;
  requireApproval: boolean;
  memberCount: number;
  hasAccess?: boolean;
  membership?: {
    id: string;
    role: string;
    status: string;
  } | null;
  _count?: {
    posts: number;
    events: number;
    resources: number;
    members: number;
  };
}

interface GroupPost {
  id: string;
  content: string;
  createdAt: string;
  author: {
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
  _count?: {
    comments: number;
    reactions: number;
  };
}

interface GroupMember {
  id: string;
  role: string;
  joinedAt: string;
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

interface GroupResource {
  id: string;
  title: string;
  description?: string;
  type: string;
  downloadCount: number;
  createdAt: string;
  uploader?: {
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  priority: string;
  createdAt: string;
}

interface EventItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline: boolean;
  onlineMeetingUrl?: string;
  capacity?: number;
  attendeeCount: number;
  userStatus?: string | null;
}

export default function GroupWorkspacePage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'discussions' | 'sessions' | 'resources' | 'members' | 'about'>('discussions');
  const [postContent, setPostContent] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals state
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annIsPinned, setAnnIsPinned] = useState(true);
  const [isPostingAnn, setIsPostingAnn] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState('ACADEMIC');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventIsOnline, setEventIsOnline] = useState(false);
  const [eventMeetingUrl, setEventMeetingUrl] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resDescription, setResDescription] = useState('');
  const [resType, setResType] = useState('PDF');
  const [isUploadingRes, setIsUploadingRes] = useState(false);

  // 1. Fetch Group Detail
  const { data: group, isLoading, isError } = useQuery<GroupDetail>({
    queryKey: ['group-detail', params.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${params.id}`);
      return res.data?.data;
    },
  });

  const hasAccess = group?.hasAccess !== false;
  const isMember = !!group?.membership && group.membership.status === 'ACTIVE';
  const isPending = !!group?.membership && group.membership.status === 'PENDING';
  const isOwner = group?.membership?.role === 'OWNER';
  const isModerator = group?.membership?.role === 'MODERATOR';
  const isCircleLeader = isOwner || isModerator;

  // 2. Fetch Group Discussions
  const { data: postsData } = useQuery<GroupPost[]>({
    queryKey: ['group-posts', params.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${params.id}/posts`);
      return res.data?.data?.data || [];
    },
    enabled: activeTab === 'discussions' && hasAccess && !!group?.id,
  });

  // 3. Fetch Group Announcements
  const { data: announcementsData } = useQuery<AnnouncementItem[]>({
    queryKey: ['group-announcements', group?.id || params.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const res = await api.get(`/groups/${group.id}/announcements`);
      return res.data?.data?.data || [];
    },
    enabled: hasAccess && !!group?.id,
  });

  // 4. Fetch Group Scheduled Sessions & Events
  const { data: eventsData } = useQuery<EventItem[]>({
    queryKey: ['group-events', group?.id || params.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const res = await api.get(`/groups/${group.id}/events`);
      return res.data?.data?.data || [];
    },
    enabled: (activeTab === 'sessions' || !!group?.id) && hasAccess && !!group?.id,
  });

  // 5. Fetch Group Members
  const { data: membersData } = useQuery<GroupMember[]>({
    queryKey: ['group-members', params.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${params.id}/members`);
      return res.data?.data?.data || [];
    },
    enabled: activeTab === 'members' && hasAccess && !!group?.id,
  });

  // 6. Fetch Group Resources
  const { data: resourcesData } = useQuery<GroupResource[]>({
    queryKey: ['group-resources', params.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${params.id}/resources`);
      return res.data?.data?.data || [];
    },
    enabled: activeTab === 'resources' && hasAccess && !!group?.id,
  });

  // 7. Join / Leave Mutation
  const membershipMutation = useMutation({
    mutationFn: async (isCurrentlyMember: boolean) => {
      if (!group) return;
      if (isCurrentlyMember) {
        await api.delete(`/groups/${group.id}/leave`);
      } else {
        await api.post(`/groups/${group.id}/join`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-members', params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-posts', params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-events', group?.id || params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-resources', params.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-directory'] });
    },
  });

  // 8. Post Submission Mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!group) return;
      await api.post('/posts', {
        groupId: group.id,
        courseId: group.courseId || undefined,
        content,
      });
    },
    onSuccess: () => {
      setPostContent('');
      queryClient.invalidateQueries({ queryKey: ['group-posts', params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', params.id] });
    },
  });

  // 9. RSVP Mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, currentStatus }: { eventId: string; currentStatus: string | null }) => {
      if (currentStatus === 'REGISTERED') {
        await api.delete(`/events/${eventId}/rsvp`);
      } else {
        await api.post(`/events/${eventId}/rsvp`, { status: 'REGISTERED' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', group?.id || params.id] });
    },
  });

  // 10. Broadcast Announcement Handler
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim() || !group?.id) return;
    setIsPostingAnn(true);
    try {
      await api.post('/announcements', {
        title: annTitle.trim(),
        content: annContent.trim(),
        groupId: group.id,
        isPinned: annIsPinned,
      });
      setIsAnnounceModalOpen(false);
      setAnnTitle('');
      setAnnContent('');
      queryClient.invalidateQueries({ queryKey: ['group-announcements', group?.id || params.id] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to broadcast announcement.');
    } finally {
      setIsPostingAnn(false);
    }
  };

  // 11. Schedule Event Handler
  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !group?.id) return;
    setIsCreatingEvent(true);
    try {
      const start = eventDate ? new Date(eventDate) : new Date(Date.now() + 2 * 24 * 3600 * 1000);
      const end = new Date(start.getTime() + 2 * 3600 * 1000);

      await api.post('/events', {
        title: eventTitle.trim(),
        description: eventDesc.trim() || undefined,
        groupId: group.id,
        category: eventCategory,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        location: eventIsOnline ? undefined : eventLocation.trim() || 'UNILAG Campus',
        isOnline: eventIsOnline,
        onlineMeetingUrl: eventIsOnline ? eventMeetingUrl.trim() || undefined : undefined,
      });

      setIsEventModalOpen(false);
      setEventTitle('');
      setEventDesc('');
      setEventLocation('');
      setEventDate('');
      setEventMeetingUrl('');
      queryClient.invalidateQueries({ queryKey: ['group-events', group?.id || params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', params.id] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule study session.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // 12. Upload Study Material Handler
  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !group?.id) return;
    setIsUploadingRes(true);
    try {
      const cleanName = resTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = resType === 'DOCUMENT' ? 'docx' : 'pdf';
      await api.post('/resources', {
        title: resTitle.trim(),
        description: resDescription.trim() || undefined,
        type: resType,
        groupId: group.id,
        courseId: group.courseId || undefined,
        fileKey: `groups/${group.id}/resources/${Date.now()}-${cleanName}.${ext}`,
        fileName: `${cleanName}.${ext}`,
        fileSize: 2048576,
        mimeType: resType === 'DOCUMENT' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
      });

      setIsUploadModalOpen(false);
      setResTitle('');
      setResDescription('');
      queryClient.invalidateQueries({ queryKey: ['group-resources', params.id] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', params.id] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to share material.');
    } finally {
      setIsUploadingRes(false);
    }
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    createPostMutation.mutate(postContent.trim());
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Loading study circle workspace...</p>
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-xs font-semibold">
          Study group not found or you do not have permission to view it.
        </div>
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Groups Directory</span>
        </Link>
      </div>
    );
  }

  // Pinned announcements
  const pinnedAnnouncements = (announcementsData || []).filter((a) => a.isPinned);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Back Link & Associated Course */}
      <div className="flex items-center justify-between">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Groups Directory</span>
        </Link>

        {group.course && (
          <Link
            href={`/courses/${group.course.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Course Community Hub: {group.course.code}</span>
          </Link>
        )}
      </div>

      {/* Hero Workspace Banner Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {/* Cover Graphic */}
        <div className="h-36 sm:h-48 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Group Info Bar */}
        <div className="p-6 sm:p-8 pt-0 relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            {/* Avatar & Title */}
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-lg border border-slate-200 flex-shrink-0">
                {group.avatarUrl ? (
                  <img
                    src={group.avatarUrl}
                    alt={group.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-inner">
                    {group.name[0]}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                    {group.type}
                  </span>
                  {group.course && (
                    <Link
                      href={`/courses/${group.course.id}`}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span>Linked to {group.course.code}</span>
                    </Link>
                  )}
                  {group.isPrivate && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Private Space</span>
                    </span>
                  )}
                  {isCircleLeader && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <Award className="w-2.5 h-2.5" />
                      <span>Pod Executive</span>
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {group.name}
                </h1>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isCircleLeader && hasAccess && (
                <>
                  <button
                    onClick={() => setIsAnnounceModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Broadcast Notice</span>
                  </button>
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>+ Schedule Session</span>
                  </button>
                </>
              )}

              {isMember && !isCircleLeader && hasAccess && (
                <button
                  onClick={() => setIsEventModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>+ Propose Session</span>
                </button>
              )}

              {/* Membership Action Button */}
              <button
                onClick={() => membershipMutation.mutate(isMember)}
                disabled={membershipMutation.isPending || isOwner || isPending}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-xs ${
                  isOwner
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 cursor-default'
                    : isPending
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-default'
                    : isMember
                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {membershipMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isOwner ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Circle Founder / Lead</span>
                  </>
                ) : isPending ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Join Request Pending</span>
                  </>
                ) : isMember ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Joined (Leave Pod)</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{group.requireApproval ? 'Request to Join' : 'Join Study Circle'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-6 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{group.memberCount}</strong> active peers
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{group._count?.posts ?? 0}</strong> discussions
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{eventsData?.length || group._count?.events || 0}</strong> sessions
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{group._count?.resources ?? 0}</strong> materials
            </span>
          </div>
        </div>

        {/* Tab Navigation (Only shown if user has access) */}
        {hasAccess && (
          <div className="px-6 sm:px-8 border-t border-slate-100 flex items-center gap-6 overflow-x-auto scrollbar-none">
            {[
              { id: 'discussions', label: 'Discussions & Questions', icon: MessageSquare },
              { id: 'sessions', label: `Study Sessions (${eventsData?.length || group._count?.events || 0})`, icon: Calendar },
              { id: 'resources', label: `Materials & Notes (${group._count?.resources || 0})`, icon: FileText },
              { id: 'members', label: `Peer Roster (${group.memberCount})`, icon: Users },
              { id: 'about', label: 'Circle Goals & Guidelines', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PRIVACY LOCK SCREEN: Rendered when user has no access to private circle */}
      {!hasAccess && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Private Study Circle Space
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              This space is confidential and restricted to accepted members of the pod. Join or request admission to view discussions, access shared lecture materials, and participate in scheduled group study sessions.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            {isPending ? (
              <div className="px-5 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Join Request Pending Moderator Review</span>
              </div>
            ) : (
              <button
                onClick={() => membershipMutation.mutate(false)}
                disabled={membershipMutation.isPending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                {membershipMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{group.requireApproval ? 'Request to Join Space' : 'Join Space Instantly'}</span>
              </button>
            )}

            <Link
              href="/groups"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Browse Open Pods
            </Link>
          </div>
        </div>
      )}

      {/* TAB 1: DISCUSSIONS */}
      {hasAccess && activeTab === 'discussions' && (
        <div className="space-y-4">
          {/* Pinned Official Notice Banner (if any) */}
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-3">
              {pinnedAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-indigo-50/40 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-200/70 text-amber-900 uppercase tracking-wider">
                          Official Notice
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900">{ann.title}</h3>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                        {ann.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post Composer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-700">Share a problem, study update, or meeting notes</h2>
            <form onSubmit={handlePostSubmit} className="space-y-3">
              <textarea
                rows={2}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={`Post an update or question to ${group.name}...`}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Visible to all peers in this circle</span>
                <button
                  type="submit"
                  disabled={!postContent.trim() || createPostMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {createPostMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Post to Circle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Posts Stream */}
          {postsData && postsData.length > 0 ? (
            <div className="space-y-3">
              {postsData.map((post) => {
                const authorName = post.author.profile
                  ? `${post.author.profile.firstName} ${post.author.profile.lastName}`
                  : 'Classmate';

                return (
                  <div
                    key={post.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {authorName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{authorName}</span>
                            {post.author.verificationStatus === 'VERIFIED' && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 inline" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {post.author.profile?.level ? `${post.author.profile.level}L Student` : 'Student'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-semibold">
                      <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{post._count?.reactions ?? 0} Helpful</span>
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post._count?.comments ?? 0} Replies</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No discussions yet in this study pod</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Break the ice! Share a question, study tip, or organize the first weekly group study session.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESSIONS & EVENTS */}
      {hasAccess && activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Study Sessions & Workshops</h2>
              <p className="text-xs text-slate-500">Scheduled revision meetups, tutorials, and peer study hours</p>
            </div>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          </div>

          <div className="space-y-3">
            {eventsData && eventsData.length > 0 ? (
              eventsData.map((event) => {
                const isGoing = event.userStatus === 'REGISTERED';
                return (
                  <div
                    key={event.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {event.category}
                        </span>
                        {event.isOnline ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Virtual Session
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {event.location || 'UNILAG Campus'}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-slate-900">{event.title}</h3>
                      {event.description && (
                        <p className="text-xs text-slate-600 leading-relaxed font-normal">{event.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(event.startDate).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <strong className="text-slate-700 font-bold">{event.attendeeCount}</strong> peers attending
                        </span>
                      </div>

                      {event.isOnline && event.onlineMeetingUrl && (
                        <a
                          href={event.onlineMeetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Join Online Meeting</span>
                        </a>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() =>
                          rsvpMutation.mutate({
                            eventId: event.id,
                            currentStatus: event.userStatus || null,
                          })
                        }
                        disabled={rsvpMutation.isPending}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                          isGoing
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {rsvpMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isGoing ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Attending (Cancel)</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Join Session (RSVP)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No scheduled study sessions yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Coordinate library hours, solved past-question walk-throughs, or weekend project sessions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RESOURCES */}
      {hasAccess && activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Study Materials & Notes</h2>
              <p className="text-xs text-slate-500">Shared lecture summaries, past questions, and cheat sheets</p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Share File</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
            {resourcesData && resourcesData.length > 0 ? (
              resourcesData.map((res) => (
                <div key={res.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase">
                      {res.type}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900">{res.title}</h3>
                      {res.description && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{res.description}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Shared by {res.uploader?.profile ? `${res.uploader.profile.firstName} ${res.uploader.profile.lastName}` : 'Study Peer'} • {res.downloadCount} downloads
                      </p>
                    </div>
                  </div>
                  <button className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-800">No files uploaded yet for this circle</p>
                <p className="text-[11px] text-slate-400">Click "Share File" to upload revision slides or solved problem sets.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MEMBERS */}
      {hasAccess && activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Enrolled Circle Members ({group.memberCount})</h2>
            <span className="text-xs text-slate-400">Verified UNILAG students</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
            {membersData && membersData.length > 0 ? (
              membersData.map((m) => {
                const name = m.user.profile
                  ? `${m.user.profile.firstName} ${m.user.profile.lastName}`
                  : 'Student';

                return (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{name}</span>
                          {m.user.verificationStatus === 'VERIFIED' && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                            m.role === 'OWNER'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : m.role === 'MODERATOR'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {m.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {m.user.profile?.level ? `${m.user.profile.level}L Undergrad` : 'University Student'}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/messages?userId=${m.user.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      Message
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-xs text-slate-400">
                Loading member list...
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ABOUT */}
      {hasAccess && activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900">About this Study Circle</h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {group.description || 'No description provided.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Study Pod Best Practices</h2>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>Respect academic integrity: collaborate on understanding concepts, not copying submissions.</li>
                <li>Share past questions and problem sets ahead of scheduled library study hours.</li>
                <li>Reach out to circle leads if you need tutoring on specific course topics.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            {group.course && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Associated Course</span>
                </h3>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">{group.course.code}</span>
                  <span className="text-[11px] text-slate-600 block">{group.course.name}</span>
                  <span className="text-[10px] text-slate-400 block">{group.course.units ?? 3} Credit Units</span>
                </div>
                <Link
                  href={`/courses/${group.course.id}`}
                  className="block w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-center rounded-xl text-xs font-bold transition-colors"
                >
                  Visit Course Community
                </Link>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2 text-xs">
              <h3 className="font-bold text-slate-900">Privacy & Settings</h3>
              <p className="text-slate-500">
                {group.isPrivate ? '🔒 Private Circle (Restricted to approved members)' : '🌐 Open Campus Circle (Any enrolled student can join)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Official Notice */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">Broadcast Official Circle Notice</h3>
                <p className="text-xs text-slate-500">Publish a priority alert or announcement to all pod members.</p>
              </div>
              <button
                onClick={() => setIsAnnounceModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Headline *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Mandatory Midterm Revision Meeting at Library"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Details *</label>
                <textarea
                  rows={4}
                  required
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Explain the agenda, venue details, or preparation required..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 leading-relaxed font-normal"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={annIsPinned}
                  onChange={(e) => setAnnIsPinned(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="pinNotice" className="text-xs font-semibold text-slate-700">
                  Pin this notice prominently at the top of the pod discussions
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnnounceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPostingAnn}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPostingAnn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                  <span>Publish Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Study Session */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">Schedule Study Session</h3>
                <p className="text-xs text-slate-500">Coordinate a group study hour, past question review, or workshop.</p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. CSC 301 Dynamic Programming Intensive"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Topics</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Specific questions, textbook chapters, or exercises to solve..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed font-normal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-semibold"
                  >
                    <option value="ACADEMIC">Academic Revision</option>
                    <option value="TECHNOLOGY">Tech / Lab Session</option>
                    <option value="SOCIAL">Peer Meetup</option>
                    <option value="OTHER">General Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Session Format</label>
                <select
                  value={eventIsOnline ? 'online' : 'in-person'}
                  onChange={(e) => setEventIsOnline(e.target.value === 'online')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-semibold"
                >
                  <option value="in-person">Physical (Campus Venue / Library)</option>
                  <option value="online">Virtual (Google Meet / Zoom)</option>
                </select>
              </div>

              {eventIsOnline ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Link</label>
                  <input
                    type="text"
                    value={eventMeetingUrl}
                    onChange={(e) => setEventMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campus Venue</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Main Library Floor 2 Study Room"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingEvent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Schedule Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Share Study Material */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">Share Study Material</h3>
                <p className="text-xs text-slate-500">Upload lecture summaries, solved problem sets, or cheatsheets.</p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadResource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Title *</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g. Graph Algorithms Comprehensive Exam Notes"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">File Type</label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-semibold"
                >
                  <option value="PDF">PDF Handout / Slides</option>
                  <option value="DOCUMENT">Document (.docx)</option>
                  <option value="IMAGE">Diagram / Photo Notes</option>
                  <option value="LINK">External Resource Link</option>
                  <option value="OTHER">Other Material</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  value={resDescription}
                  onChange={(e) => setResDescription(e.target.value)}
                  placeholder="What topics are covered in this handout? Which exam year does it reference?"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed font-normal"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <FileUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Files shared in this pod are stored in your cohort repository and made available instantly to all active circle members.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingRes}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploadingRes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Upload & Share</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
