'use client';

import Link from 'next/link';
import {
  TrendingUp,
  Calendar,
  UsersRound,
  MessageSquare,
  Building2,
  Award,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function CampusDiscoverPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Discover Campus
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore student societies, active course debates, research grants, hackathons, and campus life.
        </p>
      </div>

      {/* 1. Trending on Campus */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Trending on Campus
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { tag: '#FacultyElections2026', desc: 'Campaigning begins for Science Faculty student executive seats', count: '142 discussions' },
            { tag: '#CSC301Midterm', desc: 'Peer study groups forming for tree traversals & dynamic programming', count: '98 discussions' },
            { tag: '#Hackathon2026', desc: 'Google Developer Student Clubs 48-hour campus hackathon announced', count: '84 registrations' },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-600 transition-all shadow-xs">
              <span className="text-xs font-bold text-blue-600">{item.tag}</span>
              <p className="text-xs text-slate-700 mt-1 leading-snug">{item.desc}</p>
              <span className="text-[11px] text-slate-400 mt-2 block font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Upcoming Events & Verified Clubs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">Upcoming Events</h2>
            </div>
            <Link href="/events" className="text-xs font-bold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Tech Innovation Summit 2026', date: 'Oct 5 • 10:00 AM', venue: 'Main Auditorium', count: 180 },
              { title: 'Inter-Faculty Chess & Debate Championship', date: 'Oct 12 • 14:00 PM', venue: 'Student Center', count: 95 },
              { title: 'Career Prep: Technical Interview Mastery', date: 'Oct 18 • 16:00 PM', venue: 'Online / Zoom', count: 240 },
            ].map((e, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{e.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{e.date} • {e.venue}</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {e.count} RSVP
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Clubs & Organizations */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Clubs & Verified Organizations</h2>
            </div>
            <Link href="/organizations" className="text-xs font-bold text-blue-600 hover:underline">
              Browse All
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { name: 'University Developers Club', category: 'Technology', members: 420, verified: true },
              { name: 'Debating & Literary Society', category: 'Arts & Culture', members: 215, verified: true },
              { name: 'AI & Machine Learning Research Circle', category: 'Academic Research', members: 160, verified: true },
            ].map((org, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900">{org.name}</h3>
                    {org.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{org.category} • {org.members} members</p>
                </div>
                <button className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100">
                  Join
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Opportunities Preview */}
      <section className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">Internships, Scholarships & Fellowships</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Verified opportunities vetted for university students.
            </p>
          </div>
          <Link
            href="/opportunities"
            className="px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors shadow-xs"
          >
            Explore All Opportunities
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { role: 'Software Engineering Summer Intern', org: 'Google Africa', stipend: 'Paid', deadline: 'Nov 30, 2026', category: 'INTERNSHIP' },
            { role: 'Undergraduate STEM Merit Scholarship', org: 'National Science Foundation', stipend: '$5,000 Grant', deadline: 'Dec 15, 2026', category: 'SCHOLARSHIP' },
          ].map((opp, i) => (
            <div key={i} className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {opp.category}
                </span>
                <h3 className="font-bold text-sm text-white mt-2">{opp.role}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{opp.org} • {opp.stipend}</p>
              </div>
              <p className="text-[11px] text-amber-300 font-medium mt-3">Deadline: {opp.deadline}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
