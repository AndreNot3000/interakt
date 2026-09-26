'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  User,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Loader2,
  Layers,
} from 'lucide-react';
import { CreateCalendarItemModal } from './CreateCalendarItemModal';

interface CourseMeta {
  id: string;
  code: string;
  name: string;
}

interface CalendarEventItem {
  id: string;
  scheduleId?: string;
  userId?: string;
  title: string;
  description?: string | null;
  type: 'CLASS' | 'EXAM' | 'ASSIGNMENT' | 'EVENT' | 'PERSONAL' | 'REMINDER';
  startDate: string;
  endDate?: string | null;
  allDay?: boolean;
  color?: string;
  courseId?: string | null;
  course?: CourseMeta | null;
  venue?: string | null;
  location?: string | null;
  building?: string | null;
  lecturerName?: string | null;
  timeSlot?: string | null;
  dayOfWeek?: number | null;
  dayName?: string | null;
}

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'All Schedule' },
  { id: 'CLASS', label: 'Course Lectures', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'EXAM', label: 'Exams & Tests', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { id: 'ASSIGNMENT', label: 'Assignments', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'EVENT', label: 'Campus Events', color: 'text-purple-700 bg-purple-50 border-purple-200' },
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Helper to format 24h to 12h
function format12h(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

export default function CampusCalendarPage() {
  const queryClient = useQueryClient();

  // Navigation & View Mode state
  const [viewMode, setViewMode] = useState<'Week' | 'Month' | 'Agenda'>('Week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  // Modal & Interactive state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; items: CalendarEventItem[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculate start & end range based on active view mode
  const { rangeStart, rangeEnd, headerTitle } = useMemo(() => {
    const cur = new Date(currentDate);

    if (viewMode === 'Week') {
      // Find Monday of current week
      const day = cur.getDay();
      const diff = cur.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const mon = new Date(cur.setDate(diff));
      mon.setHours(0, 0, 0, 0);

      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const monStr = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sunStr = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      return {
        rangeStart: mon,
        rangeEnd: sun,
        headerTitle: `${monStr} – ${sunStr}`,
      };
    }

    if (viewMode === 'Month') {
      const firstDay = new Date(cur.getFullYear(), cur.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      return {
        rangeStart: firstDay,
        rangeEnd: lastDay,
        headerTitle: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    }

    // Agenda: 30 days window from start of current week
    const start = new Date(cur);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 30);
    end.setHours(23, 59, 59, 999);

    return {
      rangeStart: start,
      rangeEnd: end,
      headerTitle: 'Upcoming 30-Day Campus Schedule',
    };
  }, [currentDate, viewMode]);

  // Fetch enrolled courses for the modal
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data;
    },
  });

  const courses: CourseMeta[] = Array.isArray(coursesData?.data?.data)
    ? coursesData.data.data
    : Array.isArray(coursesData?.data)
    ? coursesData.data
    : Array.isArray(coursesData)
    ? coursesData
    : [];

  // Query unified student calendar items
  const { data: calendarItems = [], isLoading } = useQuery<CalendarEventItem[]>({
    queryKey: [
      'calendar',
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
      selectedFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });
      if (selectedFilter !== 'ALL') {
        params.append('type', selectedFilter);
      }
      const res = await api.get(`/calendar?${params.toString()}`);
      return res.data?.data || res.data || [];
    },
  });

  // Navigate periods
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'Week') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'Month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 14);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'Week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'Month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 14);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Delete personal calendar item
  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || id.startsWith('class_') || id.startsWith('event_')) return;
    try {
      await api.delete(`/calendar/${id}`);
      showToast('Calendar item removed.');
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    } catch {
      showToast('Could not remove item.');
    }
  };

  // Days array for Week View (Monday to Friday)
  const weekDayDates = useMemo(() => {
    const dates: Date[] = [];
    const mon = new Date(rangeStart);
    for (let i = 0; i < 5; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [rangeStart]);

  // Calendar dates matrix for Month View
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const matrix: { date: Date; isCurrentMonth: boolean }[] = [];

    // Fill days from preceding month
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const preCount = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Mon as start
    for (let i = preCount; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      matrix.push({ date: d, isCurrentMonth: false });
    }

    // Days in current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      matrix.push({ date: d, isCurrentMonth: true });
    }

    // Days in following month to complete 35 or 42 cells
    const remaining = 35 - matrix.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        matrix.push({ date: d, isCurrentMonth: false });
      }
    }

    return matrix;
  }, [currentDate]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-extrabold border border-blue-200">
                <CalendarIcon className="w-3.5 h-3.5" />
                Lecture Timetable & Campus Schedule
              </span>
              <span className="text-xs font-bold text-slate-500">
                {calendarItems.length} Scheduled Events
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Campus Calendar & Timetables
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Synchronized university schedule aggregating your enrolled course weekly lectures, class venues, assignment deadlines, exam timetables, and campus events.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event / Task</span>
            </button>
          </div>
        </div>

        {/* View Mode & Period Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                title="Previous period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                title="Next period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-sm font-extrabold text-slate-800 ml-2">
              {headerTitle}
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto justify-center">
            {(['Week', 'Month', 'Agenda'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'Week' ? 'Weekly Timetable' : mode === 'Month' ? 'Month View' : 'Agenda View'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1">
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = selectedFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Calendar Views */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">
            Synchronizing course timetables & campus schedule...
          </p>
        </div>
      ) : viewMode === 'Week' ? (
        /* ========================================================= */
        /* 1. WEEK VIEW: Interactive 5-Day Weekly Timetable Grid    */
        /* ========================================================= */
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4">
            {weekDayDates.map((dateObj, colIndex) => {
              const dateStr = dateObj.toISOString().split('T')[0];
              const isToday = new Date().toDateString() === dateObj.toDateString();

              // Filter items for this specific date
              const dayItems = calendarItems.filter((item) => {
                const itemDateStr = new Date(item.startDate).toISOString().split('T')[0];
                return itemDateStr === dateStr;
              });

              return (
                <div
                  key={colIndex}
                  className={`flex flex-col rounded-2xl border transition-all min-h-[380px] ${
                    isToday
                      ? 'bg-blue-50/20 border-blue-200/90 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-200/80'
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`p-3.5 border-b text-center rounded-t-2xl ${
                      isToday
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-800 border-slate-200/80'
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-100' : 'text-slate-400'}`}>
                      {WEEK_DAYS[colIndex]}
                    </p>
                    <p className="text-lg font-black leading-tight">
                      {dateObj.getDate()}{' '}
                      <span className="text-xs font-semibold opacity-80">
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </p>
                    {isToday && (
                      <span className="inline-block mt-1 px-2 py-0.2 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Day Schedule Slots */}
                  <div className="p-3 flex-1 space-y-2.5 overflow-y-auto">
                    {dayItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-300">
                        <Clock className="w-5 h-5 mb-1.5 opacity-60" />
                        <span className="text-[11px] font-medium text-slate-400">
                          No classes
                        </span>
                      </div>
                    ) : (
                      dayItems.map((item) => {
                        const isClass = item.type === 'CLASS';
                        const isExam = item.type === 'EXAM';
                        const isAssignment = item.type === 'ASSIGNMENT';

                        const startFormatted = format12h(item.startTime || new Date(item.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
                        const endFormatted = item.endTime ? format12h(item.endTime) : (item.endDate ? format12h(new Date(item.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })) : '');

                        const timeDisplay = item.timeSlot || `${startFormatted} - ${endFormatted}`;

                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden text-left space-y-2 group"
                            style={{
                              borderLeftWidth: '4px',
                              borderLeftColor: item.color || '#2563eb',
                            }}
                          >
                            {/* Course / Category Tag & Time */}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span
                                className="text-[10px] font-black px-2 py-0.5 rounded-md text-white font-mono shadow-2xs"
                                style={{ backgroundColor: item.color || '#2563eb' }}
                              >
                                {item.course?.code || (isExam ? 'EXAM' : isAssignment ? 'TASK' : 'EVENT')}
                              </span>

                              <span className="text-[10px] font-bold text-slate-500 font-mono">
                                {timeDisplay}
                              </span>
                            </div>

                            {/* Title */}
                            <div>
                              <p className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">
                                {item.title}
                              </p>
                              {item.course?.name && isClass && (
                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                  {item.course.name}
                                </p>
                              )}
                            </div>

                            {/* Venue & Lecturer Details */}
                            {(item.venue || item.location) && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium pt-1 border-t border-slate-100">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate font-semibold text-slate-800" title={item.venue || item.location || ''}>
                                  {item.venue || item.location}
                                </span>
                              </div>
                            )}

                            {item.lecturerName && (
                              <p className="text-[10px] text-slate-400 truncate" title={item.lecturerName}>
                                👨‍🏫 {item.lecturerName}
                              </p>
                            )}

                            {/* Delete button for personal items */}
                            {!item.id.startsWith('class_') && !item.id.startsWith('event_') && (
                              <button
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-600 transition-opacity"
                                title="Remove personal event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'Month' ? (
        /* ========================================================= */
        /* 2. MONTH VIEW: 7x5 Calendar Grid with Event Chips        */
        /* ========================================================= */
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Month Date Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthMatrix.map((cell, idx) => {
              const cellDateStr = cell.date.toISOString().split('T')[0];
              const isToday = new Date().toDateString() === cell.date.toDateString();

              // Items for this day
              const dayItems = calendarItems.filter((item) => {
                const itemDateStr = new Date(item.startDate).toISOString().split('T')[0];
                return itemDateStr === cellDateStr;
              });

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDayEvents({ date: cell.date, items: dayItems })}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? isToday
                        ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                      : 'bg-slate-50/40 border-slate-100 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Event Chips */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold truncate text-white shadow-2xs"
                        style={{ backgroundColor: item.color || '#2563eb' }}
                        title={`${item.title} (${item.venue || item.location || ''})`}
                      >
                        {item.course?.code || item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-400 block text-right">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 3. AGENDA VIEW: Chronological Stream of Events           */
        /* ========================================================= */
        <div className="space-y-4">
          {calendarItems.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900">
                No items scheduled in this period
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No course lectures or personal events match the selected category filter in this time window.
              </p>
              <button
                onClick={() => setSelectedFilter('ALL')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {calendarItems.map((item) => {
                const dateObj = new Date(item.startDate);
                const dateStr = dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                const isClass = item.type === 'CLASS';

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl p-4 sm:p-5 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Pill */}
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center font-black flex-shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase">
                          {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-base text-slate-900">{dateObj.getDate()}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.course?.code && (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-md text-white font-mono"
                              style={{ backgroundColor: item.color || '#2563eb' }}
                            >
                              {item.course.code}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {item.type}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.timeSlot || `${format12h(item.startTime)} - ${format12h(item.endTime)}`}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                          {(item.venue || item.location) && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {item.venue || item.location}
                            </span>
                          )}
                          {item.lecturerName && (
                            <span>👨‍🏫 {item.lecturerName}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!item.id.startsWith('class_') && !item.id.startsWith('event_') && (
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all self-end sm:self-auto"
                        title="Delete personal task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Day Agenda Modal (When clicking a day in Month View) */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Daily Schedule
                </p>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedDayEvents.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {selectedDayEvents.items.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No classes or events scheduled on this day.
                </p>
              ) : (
                selectedDayEvents.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5"
                    style={{ borderLeftWidth: '4px', borderLeftColor: item.color || '#2563eb' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded text-white font-mono" style={{ backgroundColor: item.color || '#2563eb' }}>
                        {item.course?.code || item.type}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {item.timeSlot || `${format12h(item.startTime)} - ${format12h(item.endTime)}`}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-snug">{item.title}</p>
                    {(item.venue || item.location) && (
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.venue || item.location}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Calendar Item Modal */}
      <CreateCalendarItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        courses={courses}
        onSuccess={() => {
          showToast('Event successfully added to your calendar!');
          queryClient.invalidateQueries({ queryKey: ['calendar'] });
        }}
      />
    </div>
  );
}
