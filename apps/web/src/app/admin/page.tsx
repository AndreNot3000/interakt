'use client';

import {
  Users,
  CheckCircle,
  BookOpen,
  Calendar,
  ShieldAlert,
  Building2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const stats = [
    { title: 'Total Enrolled Students', value: '1,420', change: '+18% this month', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Verified Students', value: '1,180', change: '83% verification rate', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Active Course Communities', value: '48', change: 'Across 4 Faculties', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Student Clubs & Orgs', value: '26', change: '14 officially verified', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Upcoming Campus Events', value: '14', change: 'Next 30 days', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Pending Moderation Reports', value: '3', change: 'Action required', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          University Administration Oversight
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time institutional metrics, student verification queue, and course community oversight.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {s.title}
                </span>
                <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {s.value}
                </span>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  {s.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Queue Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Pending Student Verifications</h2>
            <Link
              href="/admin/users"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Full Queue (3)
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { name: 'David Adeyemi', id: '190408012', dept: 'Computer Science', level: '300L' },
              { name: 'Fatima Al-Hassan', id: '200405089', dept: 'Electrical Engineering', level: '200L' },
              { name: 'Emeka Okafor', id: '180402033', dept: 'Chemical Engineering', level: '400L' },
            ].map((st) => (
              <div key={st.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{st.name}</p>
                  <p className="text-xs text-slate-500">{st.dept} • {st.level} • ID: {st.id}</p>
                </div>
                <Link
                  href="/admin/users"
                  className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Course Communities Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Active Course Communities</h2>
            <Link
              href="/admin/academics"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Manage Academics
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { code: 'CSC 301', name: 'Data Structures and Algorithms', students: 184, discussions: 32 },
              { code: 'CSC 302', name: 'Operating Systems', students: 162, discussions: 21 },
              { code: 'EEE 301', name: 'Circuit Theory & Analysis', students: 145, discussions: 19 },
              { code: 'CSC 401', name: 'Software Engineering', students: 120, discussions: 28 },
            ].map((c) => (
              <div
                key={c.code}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mr-2">
                    {c.code}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-600 block">{c.students} peers</span>
                  <span className="text-[11px] text-slate-400">{c.discussions} discussions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
