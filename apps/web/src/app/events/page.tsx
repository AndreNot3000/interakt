'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateEventModal } from './CreateEventModal';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Plus,
  Users,
  Search,
  CheckCircle2,
  Star,
  ExternalLink,
  Share2,
  CalendarCheck,
  ShieldCheck,
  Loader2,
  Sparkles,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

interface EventOrganizer {
  id: string;
  name: string;
  type: 'organization' | 'group' | 'user';
  avatarUrl?: string | null;
  isOfficial?: boolean;
}

interface CampusEvent {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  location?: string | null;
  locationUrl?: string | null;
  startDate: string;
  endDate: string;
  category: string;
  status: string;
  capacity?: number | null;
  isOnline: boolean;
  onlineMeetingUrl?: string | null;
  attendeeCount: number;
  interestedCount: number;
  organizer: EventOrganizer;
  userStatus: 'REGISTERED' | 'INTERESTED' | null;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'TECHNOLOGY', label: 'Tech & Hackathons' },
  { id: 'ACADEMIC', label: 'Academic & Lectures' },
  { id: 'CAREER', label: 'Career & Internships' },
  { id: 'SPORTS', label: 'Sports & Tournaments' },
  { id: 'CULTURAL', label: 'Arts & Cultural' },
  { id: 'SOCIAL', label: 'Social & Networking' },
];

const TIMEFRAMES = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'this_week', label: 'This Week' },
  { id: 'my_rsvps', label: 'My RSVPs' },
  { id: 'all', label: 'All Time' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  TECHNOLOGY: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
  },
  ACADEMIC: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
  },
  CAREER: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
  },
  SPORTS: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    gradient: 'from-amber-500 via-orange-600 to-red-500',
  },
  CULTURAL: {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    gradient: 'from-fuchsia-600 via-rose-600 to-purple-600',
  },
  SOCIAL: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
  },
  OTHER: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    gradient: 'from-slate-700 via-slate-800 to-zinc-900',
  },
};

export default function CampusEventsPage() {
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Query events from live API
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['events', selectedCat, selectedTimeframe, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCat !== 'ALL') {
        params.append('category', selectedCat);
      }
      if (selectedTimeframe === 'my_rsvps') {
        params.append('rsvpStatus', 'my_rsvps');
      } else if (selectedTimeframe !== 'all') {
        params.append('timeframe', selectedTimeframe);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '30');

      const res = await api.get(`/events?${params.toString()}`);
      return res.data?.data || res.data || [];
    },
  });

  const events: CampusEvent[] = Array.isArray(eventsData) ? eventsData : [];

  // RSVP Mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: 'GOING' | 'INTERESTED' | 'CANCEL' }) => {
      if (status === 'CANCEL') {
        const res = await api.delete(`/events/${eventId}/rsvp`);
        return res.data;
      } else {
        const res = await api.post(`/events/${eventId}/rsvp`, { status });
        return res.data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      if (variables.status === 'GOING') {
        showToast('You are registered! Event synced to your calendar.');
      } else if (variables.status === 'INTERESTED') {
        showToast('Marked as interested! Added to your calendar.');
      } else {
        showToast('RSVP cancelled and removed from your calendar.');
      }
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update RSVP status.');
    },
  });

  const handleShare = (event: CampusEvent) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast(`Link to "${event.title}" copied to clipboard!`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-blue-200">
              <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>UNILAG Campus Events & Happenings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Campus Events & RSVP System
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Discover academic symposiums, tech hackathons, career job fairs, sports tournaments, and club activities. RSVP&apos;d events sync automatically to your personal student calendar.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/calendar"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-md"
            >
              <Calendar className="w-4 h-4 text-blue-300" />
              <span>My Calendar</span>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, keyword, or venue (e.g. Auditorium, GDSC, Hackathon)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto overflow-x-auto">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedTimeframe === t.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid / List */}
      {isLoading ? (
        <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading campus events...</p>
          <p className="text-xs text-slate-400">Fetching latest schedules and RSVP availability</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">No events found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {selectedTimeframe === 'my_rsvps'
                ? "You haven't RSVP'd to any upcoming campus events yet. Explore events above and click 'Going' to sync them to your calendar."
                : 'No campus events match your selected filters. Try choosing a different category or clear your search query.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {(selectedCat !== 'ALL' || selectedTimeframe !== 'upcoming' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCat('ALL');
                  setSelectedTimeframe('upcoming');
                  setSearchQuery('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              Schedule an Event
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((ev) => {
            const startDateObj = new Date(ev.startDate);
            const endDateObj = new Date(ev.endDate);
            const dateStr = startDateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const startTimeStr = startDateObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
            const endTimeStr = endDateObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            const catColors = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.OTHER;
            const isFull = Boolean(ev.capacity && ev.attendeeCount >= ev.capacity);
            const isGoing = ev.userStatus === 'REGISTERED';
            const isInterested = ev.userStatus === 'INTERESTED';

            return (
              <div
                key={ev.id}
                className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Banner Image or Themed Gradient Header */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    {ev.coverImageUrl ? (
                      <img
                        src={ev.coverImageUrl}
                        alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${catColors.gradient} opacity-90 flex items-center justify-center p-6 text-center`}>
                        <div className="text-white/20 font-black text-6xl select-none font-mono">
                          {ev.category}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/30" />

                    {/* Category Pill */}
                    <div className="absolute top-4 left-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md bg-white/90 text-slate-800 shadow-xs border border-white/20`}>
                        {ev.category}
                      </span>
                    </div>

                    {/* Date Badge */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl px-3 py-1.5 text-center shadow-xs border border-white/20 text-slate-900">
                      <span className="text-[10px] font-black uppercase text-blue-600 block leading-tight">
                        {startDateObj.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold block leading-tight">
                        {startDateObj.getDate()}
                      </span>
                    </div>

                    {/* Live Calendar Synced Indicator */}
                    {(isGoing || isInterested) && (
                      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white backdrop-blur-md text-[11px] font-bold shadow-xs">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Synced to your Calendar</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    {/* Organizer Row */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        {ev.organizer.avatarUrl ? (
                          <img
                            src={ev.organizer.avatarUrl}
                            alt={ev.organizer.name}
                            className="w-5 h-5 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            {ev.organizer.name[0]}
                          </div>
                        )}
                        <span className="font-semibold text-slate-700 line-clamp-1">
                          {ev.organizer.name}
                        </span>
                        {ev.organizer.isOfficial && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Official
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleShare(ev)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Share event link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title */}
                    <h2 className="font-extrabold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {ev.title}
                    </h2>

                    {/* Description */}
                    {ev.description && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 font-normal">
                        {ev.description}
                      </p>
                    )}

                    {/* Event Meta Items */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>
                          {dateStr} • {startTimeStr} - {endTimeStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        {ev.isOnline ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            {ev.onlineMeetingUrl ? (
                              <a
                                href={ev.onlineMeetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <span>Virtual Meeting Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span>Online Campus Webinar</span>
                            )}
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            <span className="line-clamp-1">{ev.location || 'UNILAG Campus'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Capacity and Attendance Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong className="text-slate-900 font-bold">{ev.attendeeCount}</strong> going
                            {' • '}
                            <strong className="text-slate-700">{ev.interestedCount}</strong> interested
                          </span>
                        </div>

                        {ev.capacity && (
                          <span className={`text-[11px] font-bold ${isFull && !isGoing ? 'text-rose-600' : 'text-slate-500'}`}>
                            {isFull && !isGoing ? 'Capacity Full' : `${ev.attendeeCount} / ${ev.capacity}`}
                          </span>
                        )}
                      </div>

                      {ev.capacity && (
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? 'bg-rose-500' : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.round((ev.attendeeCount / ev.capacity) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-6 pt-0">
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      {/* Going / Register Button */}
                      <button
                        onClick={() => {
                          if (isGoing) {
                            rsvpMutation.mutate({ eventId: ev.id, status: 'CANCEL' });
                          } else {
                            rsvpMutation.mutate({ eventId: ev.id, status: 'GOING' });
                          }
                        }}
                        disabled={rsvpMutation.isPending || (isFull && !isGoing)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isGoing
                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                            : isFull
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                        }`}
                      >
                        {isGoing ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Going ✓</span>
                          </>
                        ) : isFull ? (
                          <span>Full</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Going</span>
                          </>
                        )}
                      </button>

                      {/* Interested Button */}
                      <button
                        onClick={() => {
                          if (isInterested) {
                            rsvpMutation.mutate({ eventId: ev.id, status: 'CANCEL' });
                          } else {
                            rsvpMutation.mutate({ eventId: ev.id, status: 'INTERESTED' });
                          }
                        }}
                        disabled={rsvpMutation.isPending}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                          isInterested
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isInterested ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                        <span>{isInterested ? 'Interested ★' : 'Interested'}</span>
                      </button>
                    </div>

                    {/* Cancel action if user is RSVP'd */}
                    {(isGoing || isInterested) && (
                      <button
                        onClick={() => rsvpMutation.mutate({ eventId: ev.id, status: 'CANCEL' })}
                        disabled={rsvpMutation.isPending}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors px-1"
                        title="Cancel attendance"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['calendar'] });
        }}
      />
    </div>
  );
}
