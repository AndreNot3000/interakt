'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Building2,
  ShieldCheck,
  Plus,
  Users,
  Calendar,
  MessageSquare,
  Globe,
  Mail,
  ChevronLeft,
  CheckCircle2,
  Share2,
  ExternalLink,
  Clock,
  MapPin,
  Sparkles,
  Send,
  Loader2,
  Award,
  Megaphone,
  X,
  Video,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MemberItem {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    role: string;
    verificationStatus: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
      studentId?: string;
      level?: number;
      programme?: {
        name: string;
      };
    };
  };
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
  interestedCount: number;
  userStatus?: string | null;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'feed' | 'events' | 'members'>('overview');
  const [postContent, setPostContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
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
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventIsOnline, setEventIsOnline] = useState(false);
  const [eventMeetingUrl, setEventMeetingUrl] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // 1. Fetch Organization Detail
  const { data: org, isLoading, isError, refetch } = useQuery({
    queryKey: ['organization-detail', params.id],
    queryFn: async () => {
      const res = await api.get(`/organizations/${params.id}`);
      return res.data?.data || res.data;
    },
  });

  // 2. Fetch Organization Announcements
  const { data: announcementsData } = useQuery<AnnouncementItem[]>({
    queryKey: ['org-announcements', org?.id || params.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const res = await api.get(`/organizations/${org.id}/announcements`);
      return res.data?.data?.data || [];
    },
    enabled: !!org?.id,
  });

  // 3. Fetch Organization Events
  const { data: eventsData } = useQuery<EventItem[]>({
    queryKey: ['org-events', org?.id || params.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const res = await api.get(`/organizations/${org.id}/events`);
      return res.data?.data?.data || [];
    },
    enabled: activeTab === 'events' || !!org?.id,
  });

  // 4. Fetch Organization Members Roster
  const { data: membersResponse } = useQuery({
    queryKey: ['organization-members', params.id],
    queryFn: async () => {
      const res = await api.get(`/organizations/${params.id}/members`, {
        params: { limit: 50 },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'members' || !!org,
  });

  const membersList: MemberItem[] = membersResponse?.data || [];

  // 5. Join / Leave Mutation
  const membershipMutation = useMutation({
    mutationFn: async (isCurrentlyMember: boolean) => {
      if (isCurrentlyMember) {
        await api.delete(`/organizations/${org?.id || params.id}/leave`);
      } else {
        await api.post(`/organizations/${org?.id || params.id}/join`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-detail', params.id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members', params.id] });
    },
  });

  // 6. Create Post in Organization Feed
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!org?.id) return;
      await api.post('/posts', {
        content,
        organizationId: org.id,
        type: 'TEXT',
      });
    },
    onSuccess: () => {
      setPostContent('');
      queryClient.invalidateQueries({ queryKey: ['organization-detail', params.id] });
    },
  });

  // 7. Event RSVP Mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, currentStatus }: { eventId: string; currentStatus: string | null }) => {
      if (currentStatus === 'REGISTERED') {
        await api.delete(`/events/${eventId}/rsvp`);
      } else {
        await api.post(`/events/${eventId}/rsvp`, { status: 'REGISTERED' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-events', org?.id || params.id] });
    },
  });

  // 8. Announcement Creation Mutation
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim() || !org?.id) return;
    setIsPostingAnn(true);
    try {
      await api.post('/announcements', {
        title: annTitle.trim(),
        content: annContent.trim(),
        organizationId: org.id,
        isPinned: annIsPinned,
      });
      setIsAnnounceModalOpen(false);
      setAnnTitle('');
      setAnnContent('');
      queryClient.invalidateQueries({ queryKey: ['org-announcements', org?.id || params.id] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to broadcast announcement.');
    } finally {
      setIsPostingAnn(false);
    }
  };

  // 9. Event Creation Mutation
  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !org?.id) return;
    setIsCreatingEvent(true);
    try {
      const start = eventDate ? new Date(eventDate) : new Date(Date.now() + 3 * 24 * 3600 * 1000);
      const end = new Date(start.getTime() + 2 * 3600 * 1000);

      await api.post('/events', {
        title: eventTitle.trim(),
        description: eventDesc.trim() || undefined,
        organizationId: org.id,
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
      queryClient.invalidateQueries({ queryKey: ['org-events', org?.id || params.id] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule event.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setIsSubmittingPost(true);
    createPostMutation.mutate(postContent.trim(), {
      onSettled: () => setIsSubmittingPost(false),
    });
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
      <div className="flex flex-col items-center justify-center p-24 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-700">Loading society portal...</p>
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="bg-white border border-rose-100 rounded-3xl p-12 text-center space-y-3">
        <p className="text-base font-bold text-rose-700">Organization not found</p>
        <p className="text-xs text-slate-500">
          The requested student club or society may have been renamed or removed.
        </p>
        <Link
          href="/organizations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>
    );
  }

  const isMember = !!org.isMember;
  const isExecutive = isMember && ['OWNER', 'ADMIN', 'MODERATOR'].includes(org.membershipRole);
  const memberCount = org.memberCount || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back button */}
      <Link
        href="/organizations"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Societies & Clubs
      </Link>

      {/* Hero Banner Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs relative">
        <div className="h-44 sm:h-60 relative w-full bg-slate-900">
          {org.coverImageUrl ? (
            <img
              src={org.coverImageUrl}
              alt={org.name}
              className="w-full h-full object-cover opacity-85"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition border border-white/10"
              title="Share society profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Club Details Header */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-1.5 shadow-xl border border-slate-100 flex-shrink-0 relative overflow-hidden">
                {org.avatarUrl ? (
                  <img
                    src={org.avatarUrl}
                    alt={org.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-3xl">
                    {org.name[0]}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {org.category || 'General Society'}
                  </span>
                  {org.isOfficial && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Official University Society
                    </span>
                  )}
                  {isExecutive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      <Award className="w-3 h-3 text-purple-600" />
                      Executive Leadership
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {org.name}
                </h1>
              </div>
            </div>

            {/* Membership & Executive Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {isExecutive && (
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
                    <span>+ Schedule Event</span>
                  </button>
                </>
              )}

              <button
                onClick={() => membershipMutation.mutate(isMember)}
                disabled={membershipMutation.isPending}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-xs ${
                  isMember
                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {membershipMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isMember ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Joined (Leave)</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Join Club</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{memberCount}</strong> active members
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{eventsData?.length || 0}</strong> upcoming events
            </span>
            <span className="flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold">{announcementsData?.length || 0}</strong> notices
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 sm:px-8 border-t border-slate-100 flex items-center gap-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview & Leadership', icon: Building2 },
            { id: 'feed', label: 'Announcements & Feed', icon: MessageSquare },
            { id: 'events', label: `Upcoming Events (${eventsData?.length || 0})`, icon: Calendar },
            { id: 'members', label: `Member Roster (${memberCount})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
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
      </div>

      {/* Pinned Official Notice Banner (Visible across space) */}
      {announcementsData && announcementsData.length > 0 && announcementsData[0].isPinned && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-200 text-amber-900 uppercase tracking-wider">
                Official Club Notice
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {new Date(announcementsData[0].createdAt).toLocaleDateString()}
              </span>
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900">{announcementsData[0].title}</h4>
            <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
              {announcementsData[0].content}
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
              <h3 className="font-extrabold text-base text-slate-900">
                About the Society
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {org.description || 'This student organization offers university students opportunities to expand their skills, collaborate on campus-wide initiatives, network with alumni and industry leaders, and build lifelong friendships.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Regular Meetings & Schedule
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Weekly General Assembly
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every Friday at 4:00 PM • Faculty of Science Lecture Hall 2 / Virtual Community Hub
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Leadership / Quick Details */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Executive Leadership
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    D
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">David Adeyemi</p>
                    <span className="text-[10px] font-bold text-blue-600 px-1.5 py-0.5 rounded bg-blue-50">
                      Lead Organizer / Executive
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-indigo-900 text-white font-bold text-xs flex items-center justify-center">
                    S
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Student One</p>
                    <span className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 rounded bg-slate-200">
                      Technical Vice Lead
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">Official Links</h3>
              {org.websiteUrl && (
                <a
                  href={org.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs text-blue-600 font-semibold hover:underline"
                >
                  <span>Visit Society Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {org.email && (
                <a
                  href={`mailto:${org.email}`}
                  className="flex items-center justify-between text-xs text-blue-600 font-semibold hover:underline"
                >
                  <span>{org.email}</span>
                  <Mail className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS & FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Post Composer for Club */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <form onSubmit={handlePostSubmit} className="space-y-3">
              <textarea
                rows={2}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={`Post an update to ${org.name}...`}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none font-normal"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Shared with all members of {org.name}
                </span>
                <button
                  type="submit"
                  disabled={!postContent.trim() || isSubmittingPost}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmittingPost ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Publish to Society</span>
                </button>
              </div>
            </form>
          </div>

          {/* Announcements stream */}
          {announcementsData && announcementsData.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Official Society Broadcasts</h3>
              {announcementsData.map((ann) => (
                <div key={ann.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                      {ann.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UPCOMING EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upcoming Society Events & Hackathons</h3>
              <p className="text-xs text-slate-500">Workshops, summits, and meetings hosted by {org.name}</p>
            </div>
            {isExecutive && (
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Event</span>
              </button>
            )}
          </div>

          {eventsData && eventsData.length > 0 ? (
            eventsData.map((evt) => {
              const isRsvped = evt.userStatus === 'REGISTERED';
              return (
                <div
                  key={evt.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                        {evt.category}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {evt.attendeeCount} students attending
                      </span>
                      {evt.isOnline && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Video className="w-2.5 h-2.5" />
                          Online Meet
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900">{evt.title}</h4>
                    {evt.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-xl">{evt.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(evt.startDate).toLocaleDateString()} at {new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {evt.location || (evt.isOnline ? 'Virtual Video Stream' : 'UNILAG Campus')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => rsvpMutation.mutate({ eventId: evt.id, currentStatus: evt.userStatus || null })}
                    disabled={rsvpMutation.isPending}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap flex items-center gap-1.5 ${
                      isRsvped
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isRsvped ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Registered ✓</span>
                      </>
                    ) : (
                      'RSVP / Attend'
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
              No upcoming events scheduled right now. Check back soon!
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEMBERS ROSTER */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-base text-slate-900">
              Active Member Directory ({memberCount})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Verified University Students
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {membersList.length > 0 ? (
              membersList.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {m.user?.profile?.firstName?.[0] || 'U'}
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {m.user?.profile?.firstName
                        ? `${m.user.profile.firstName} ${m.user.profile.lastName || ''}`
                        : 'Student'}
                    </p>
                    <span className="text-[10px] font-bold text-blue-600 block">
                      {m.role === 'ADMIN' ? 'Executive Officer' : 'Member'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                Click "Join Organization" to become a member and appear on the roster!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Broadcast Announcement */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">Broadcast Official Notice</h3>
                <p className="text-xs text-slate-500">Pin a high-priority announcement to {org.name}.</p>
              </div>
              <button
                onClick={() => setIsAnnounceModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Headline *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. 📢 General Meeting Rescheduled to 5 PM"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details & Agenda *</label>
                <textarea
                  rows={4}
                  required
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Full announcement body for all members and delegates..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 leading-relaxed font-normal"
                />
              </div>

              <div className="p-3 bg-purple-50/50 border border-purple-200/60 rounded-xl flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Pin to Top of Space</span>
                  <span className="text-[11px] text-slate-500">Featured notice highlighted on club portal</span>
                </div>
                <input
                  type="checkbox"
                  checked={annIsPinned}
                  onChange={(e) => setAnnIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 border-slate-300"
                />
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
                  <span>Broadcast Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Event */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">Schedule Society Event</h3>
                <p className="text-xs text-slate-500">Publish a new workshop, hackathon, or general meeting.</p>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Flutter Bootcamp: Day 1"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Brief agenda, prerequisites, or target cohort..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed font-normal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format</label>
                  <select
                    value={eventIsOnline ? 'online' : 'in-person'}
                    onChange={(e) => setEventIsOnline(e.target.value === 'online')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-semibold"
                  >
                    <option value="in-person">Physical (Campus Venue)</option>
                    <option value="online">Virtual / Online Meeting</option>
                  </select>
                </div>
              </div>

              {eventIsOnline ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Link (Google Meet / Zoom)</label>
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
                    placeholder="e.g. Science Lecture Hall 3"
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
                  <span>Publish Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
