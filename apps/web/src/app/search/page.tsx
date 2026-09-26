'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Users,
  Building2,
  Calendar,
  FileText,
  HelpCircle,
  Award,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

function CampusSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  const mockResults = {
    courses: [
      { code: 'CSC 301', name: 'Data Structures and Algorithms II', level: 300, peers: 184 },
      { code: 'CSC 302', name: 'Operating Systems & Architecture', level: 300, peers: 162 },
    ],
    students: [
      { name: 'David Adeyemi', dept: 'Computer Science', level: '300L', verified: true },
      { name: 'Chioma Eze', dept: 'Computer Science', level: '300L', verified: true },
    ],
    groups: [
      { name: 'CSC 301 Peer Study Circle', type: 'ACADEMIC', members: 48 },
      { name: 'Campus Hackathon Squad', type: 'PROFESSIONAL', members: 112 },
    ],
    organizations: [
      { name: 'University Developers Club', category: 'Technology', verified: true, members: 420 },
    ],
    events: [
      { title: 'Tech Innovation Summit 2026', date: 'Oct 5, 2026', location: 'Main Auditorium' },
    ],
    resources: [
      { title: 'CSC 301 Past Exam Questions (2020-2025)', type: 'PDF', size: '12.1 MB' },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Campus Search
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search across course communities, student clubs, study materials, questions, and classmates.
        </p>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses, study materials, peers, clubs..."
          className="w-full pl-12 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-xs"
        />
      </div>

      <div className="space-y-6">
        {/* Courses Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Matching Course Communities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockResults.courses.map((c) => (
              <Link
                key={c.code}
                href="/courses/csc301"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-600 transition-all flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600 block">{c.code}</span>
                  <span className="text-xs font-semibold text-slate-900 block">{c.name}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{c.peers} peers</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>

        {/* Peers Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            Classmates & Peers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockResults.students.map((st) => (
              <div
                key={st.name}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    {st.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900">{st.name}</span>
                      {st.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-400">{st.dept} • {st.level}</span>
                  </div>
                </div>
                <button className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100">
                  Profile
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Study Resources Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-600" />
            Matching Study Resources
          </h2>
          <div className="space-y-2">
            {mockResults.resources.map((r, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{r.title}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{r.type} • {r.size}</span>
                </div>
                <button className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampusSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          Loading campus search...
        </div>
      }
    >
      <CampusSearchContent />
    </Suspense>
  );
}
