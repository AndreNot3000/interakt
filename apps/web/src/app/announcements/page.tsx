'use client';

import { useState } from 'react';
import {
  Megaphone,
  Pin,
  Calendar,
  Building,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

export default function CampusAnnouncementsPage() {
  const [selectedScope, setSelectedScope] = useState<'ALL' | 'INSTITUTION' | 'FACULTY' | 'DEPARTMENT'>('ALL');

  const announcements = [
    {
      id: 'anc_1',
      title: 'First Semester Examination Schedule 2025/2026 Senate Approval',
      content:
        'The University Senate has ratified the academic calendar and confirmed that First Semester examinations will commence on Monday, November 16, 2026. All students must ensure their course registration forms are verified and stamped by their faculty course advisors before Friday, October 30.',
      scope: 'INSTITUTION',
      author: 'Office of the Academic Registrar',
      isPinned: true,
      date: 'Sep 24, 2026',
    },
    {
      id: 'anc_2',
      title: 'Faculty of Science: Annual Undergraduate Innovation Project Showcase',
      content:
        'The Dean, Faculty of Science, invites all students to submit ongoing research, software projects, robotics demos, and experimental prototypes for the Annual Science Fair. Submissions close on October 25.',
      scope: 'FACULTY',
      author: 'Office of the Dean, Faculty of Science',
      isPinned: true,
      date: 'Sep 22, 2026',
    },
    {
      id: 'anc_3',
      title: 'Department of Computer Science: Lab Maintenance & System Upgrades',
      content:
        'Please be informed that Computer Science Laboratories 1 and 2 will undergo scheduled server and network hardware upgrades this Saturday between 08:00 and 16:00. Lab sessions will resume as scheduled on Monday morning.',
      scope: 'DEPARTMENT',
      author: 'Department of Computer Science Technical Head',
      isPinned: false,
      date: 'Sep 20, 2026',
    },
  ];

  const filtered = announcements.filter(
    (a) => selectedScope === 'ALL' || a.scope === selectedScope,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Official Campus Announcements
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Verified institutional notices issued directly by university leadership, faculty deans, and academic departments.
        </p>
      </div>

      {/* Scope Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Announcements' },
          { id: 'INSTITUTION', label: 'University-wide' },
          { id: 'FACULTY', label: 'Faculty Level' },
          { id: 'DEPARTMENT', label: 'Department Level' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedScope(s.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedScope === s.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((anc) => (
          <div
            key={anc.id}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-slate-300 transition-all space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  ✓ Official University Announcement
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                  Scope: {anc.scope}
                </span>
              </div>

              {anc.isPinned && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <Pin className="w-3.5 h-3.5" />
                  Pinned Announcement
                </span>
              )}
            </div>

            <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-snug">
              {anc.title}
            </h3>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {anc.content}
            </p>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 font-medium">
              <span className="font-semibold text-slate-700">{anc.author}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Published {anc.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
