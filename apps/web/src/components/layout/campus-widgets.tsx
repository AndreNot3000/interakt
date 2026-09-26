'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Clock,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Briefcase,
  ChevronRight,
  BookOpen,
  MapPin,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface TodayClassItem {
  id: string;
  scheduleId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  venue: string;
  building?: string;
  lecturerName?: string;
  color?: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

export function CampusWidgets() {
  // Query live Today's Schedule from backend
  const { data: todayData, isLoading } = useQuery({
    queryKey: ['calendar', 'today'],
    queryFn: async () => {
      const res = await api.get('/calendar/today');
      return res.data?.data || res.data;
    },
    refetchInterval: 60000, // refresh every minute for live status updates
  });

  const classes: TodayClassItem[] = todayData?.classes || [];
  const dayName = todayData?.dayName || 'Today';

  return (
    <aside className="w-80 border-l border-slate-200 bg-white p-5 space-y-6 hidden xl:block overflow-y-auto">
      {/* 1. Today Schedule Widget */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Today on Campus ({dayName})
            </h3>
          </div>
          <Link href="/calendar" className="text-xs font-semibold text-blue-600 hover:underline">
            Calendar
          </Link>
        </div>

        {isLoading ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin mx-auto" />
            <p className="text-[11px] text-slate-400 font-medium">Checking today&apos;s lectures...</p>
          </div>
        ) : classes.length > 0 ? (
          <div className="space-y-2">
            {classes.map((item) => {
              const isOngoing = item.status === 'ONGOING';
              const isCompleted = item.status === 'COMPLETED';

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all text-left relative overflow-hidden ${
                    isOngoing
                      ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                      : isCompleted
                      ? 'bg-slate-50/60 border-slate-200/60 opacity-75'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isOngoing && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600" />
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-md text-white font-mono shadow-2xs"
                      style={{ backgroundColor: item.color || '#2563eb' }}
                    >
                      {item.courseCode}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isOngoing ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Now
                        </span>
                      ) : isCompleted ? (
                        <span className="text-[10px] font-medium text-slate-400">Done</span>
                      ) : null}

                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {item.timeSlot}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                    {item.courseName}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate max-w-[140px]">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{item.venue}</span>
                    </span>

                    {item.lecturerName && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={item.lecturerName}>
                        {item.lecturerName.split(' ')[0]} {item.lecturerName.split(' ').slice(-1)[0]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <Sparkles className="w-5 h-5 text-amber-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800">No lectures today!</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              No classes scheduled for your enrolled courses on {dayName}.
            </p>
            <Link
              href="/calendar"
              className="inline-block text-[11px] font-bold text-blue-600 hover:underline pt-1"
            >
              View Full Week Timetable →
            </Link>
          </div>
        )}
      </div>

      {/* 2. Upcoming Deadlines */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Upcoming Deadlines
          </h3>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900 leading-tight">
                CSC 301 Assignment: Graph Algorithms
              </p>
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                Due tomorrow at 23:59
              </p>
              <Link
                href="/courses/csc-301"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:underline mt-2"
              >
                Go to submission hub
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Campus Dispatch */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Campus Activity
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/events"
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center hover:bg-slate-100 transition-colors"
          >
            <Calendar className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <span className="text-base font-extrabold text-slate-900 block">5</span>
            <span className="text-[10px] text-slate-500 font-medium block">Events Today</span>
          </Link>

          <Link
            href="/courses"
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center hover:bg-slate-100 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-base font-extrabold text-slate-900 block">12</span>
            <span className="text-[10px] text-slate-500 font-medium block">Discussions</span>
          </Link>

          <Link
            href="/opportunities"
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center hover:bg-slate-100 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <span className="text-base font-extrabold text-slate-900 block">2</span>
            <span className="text-[10px] text-slate-500 font-medium block">Internships</span>
          </Link>
        </div>
      </div>

      {/* 4. Enrolled Course Communities */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              My Courses
            </h3>
          </div>
          <Link href="/courses" className="text-xs font-semibold text-blue-600 hover:underline">
            All
          </Link>
        </div>

        <div className="space-y-1.5">
          {[
            { code: 'CSC 301', name: 'Data Structures & Algorithms', peers: 184 },
            { code: 'CSC 302', name: 'Operating Systems', peers: 162 },
            { code: 'CSC 201', name: 'Computer Programming I', peers: 210 },
          ].map((c) => (
            <Link
              key={c.code}
              href={`/courses/${c.code.toLowerCase().replace(' ', '-')}`}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
            >
              <div className="overflow-hidden">
                <p className="text-xs font-bold">{c.code}</p>
                <p className="text-[11px] text-slate-400 truncate">{c.name}</p>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{c.peers} peers</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
