'use client';

import { useState } from 'react';
import {
  Award,
  Search,
  ExternalLink,
  Bookmark,
  Calendar,
  Building,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export default function OpportunitiesPage() {
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({ opp1: true });

  const opportunities = [
    {
      id: 'opp1',
      title: 'Google Software Engineering Summer Internship 2027',
      organization: 'Google Africa (Lagos & Nairobi)',
      category: 'INTERNSHIP',
      deadline: 'Nov 30, 2026',
      stipend: 'Paid (Competitive + Accommodation Support)',
      location: 'Hybrid (Lagos, Nigeria)',
      description:
        '12-week immersive software engineering internship for undergraduate students enrolled in Computer Science, Computer Engineering, or related technical programs.',
      url: 'https://careers.google.com/students',
    },
    {
      id: 'opp2',
      title: 'Undergraduate STEM Future Leaders Scholarship',
      organization: 'National Science & Technology Trust Fund',
      category: 'SCHOLARSHIP',
      deadline: 'Dec 15, 2026',
      stipend: 'Full Tuition + ₦500,000 Annual Living Grant',
      location: 'National Merit Program',
      description:
        'Merit-based university scholarship for high-performing students across Engineering, Natural Sciences, and Mathematics with a minimum 4.0/5.0 CGPA.',
      url: 'https://nsteff.org/scholarships',
    },
    {
      id: 'opp3',
      title: 'Pan-African University FinTech & AI Hackathon',
      organization: 'Interswitch & AWS Startups',
      category: 'HACKATHON',
      deadline: 'Oct 20, 2026',
      stipend: '₦10,000,000 Prize Pool + Seed Funding',
      location: 'Main University Innovation Hub',
      description:
        '48-hour competitive product development hackathon challenging student teams to build financial inclusion and identity verification solutions.',
      url: 'https://campus-hackathon.africa',
    },
    {
      id: 'opp4',
      title: 'Deep Learning & Natural Language Processing Research Fellow',
      organization: 'University AI Research Lab',
      category: 'RESEARCH',
      deadline: 'Oct 31, 2026',
      stipend: 'Funded Research Assistantship',
      location: 'On Campus',
      description:
        'Join the lab to curate low-resource African language benchmark datasets and assist in training transformer models.',
      url: 'https://unilag-ai.org/fellowships',
    },
  ];

  const filtered = opportunities.filter(
    (o) => selectedCat === 'ALL' || o.category === selectedCat,
  );

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Opportunities & Internships
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curated internships, university scholarships, hackathons, and research assistantships tailored for undergraduate students.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'INTERNSHIP', 'SCHOLARSHIP', 'HACKATHON', 'RESEARCH'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCat === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'ALL' ? 'All Opportunities' : cat}
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {filtered.map((opp) => {
          const isSaved = !!bookmarked[opp.id];
          return (
            <div
              key={opp.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {opp.category}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {opp.organization}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {opp.location}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBookmark(opp.id)}
                    className={`p-2 rounded-xl transition-colors ${
                      isSaved
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600' : ''}`} />
                  </button>
                </div>

                <h3 className="font-extrabold text-base text-slate-900">{opp.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{opp.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-500 font-medium">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {opp.stipend}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Deadline: {opp.deadline}
                  </span>
                </div>

                <a
                  href={opp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>Apply Externally</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
