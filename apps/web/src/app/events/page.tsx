'use client';

import { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export default function EventsPage() {
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [rsvpState, setRsvpState] = useState<Record<string, 'ATTENDING' | 'INTERESTED' | null>>({
    ev1: 'ATTENDING',
  });

  const events = [
    {
      id: 'ev1',
      title: 'Pan-African Tech Innovation & AI Conference 2026',
      organizer: 'Faculty of Science & Developer Club',
      category: 'TECHNOLOGY',
      date: 'Saturday, Oct 5, 2026',
      time: '10:00 AM - 16:00 PM',
      location: 'University Main Auditorium',
      attendeeCount: 284,
      capacity: 500,
      description:
        'Keynote addresses by African founders, student product exhibitions, hands-on workshops, and networking with tech recruiters.',
    },
    {
      id: 'ev2',
      title: 'Inter-Departmental Parliamentary Debate Grand Final',
      organizer: 'Debating and Literary Society',
      category: 'CULTURAL',
      date: 'Thursday, Oct 10, 2026',
      time: '16:00 PM - 19:00 PM',
      location: 'Arts Faculty Theater 1',
      attendeeCount: 140,
      capacity: 250,
      description:
        'The championship debate matchup between the Department of Law and Department of Economics on Economic Sovereignty in the Digital Age.',
    },
    {
      id: 'ev3',
      title: 'Faculty of Science Annual Sports & Athletics Festival',
      organizer: 'Science Students Association',
      category: 'SPORTS',
      date: 'Saturday, Oct 19, 2026',
      time: '08:00 AM - 18:00 PM',
      location: 'Campus Sports Complex',
      attendeeCount: 350,
      capacity: 1000,
      description:
        'Track and field events, inter-departmental soccer finals, basketball games, and athletics competitions.',
    },
  ];

  const filtered = events.filter(
    (e) => selectedCat === 'ALL' || e.category === selectedCat,
  );

  const setRsvp = (id: string, status: 'ATTENDING' | 'INTERESTED') => {
    setRsvpState((prev) => ({
      ...prev,
      [id]: prev[id] === status ? null : status,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Events & Activities
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover academic seminars, hackathons, club meetings, and campus social gatherings.
          </p>
        </div>

        <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          Create Event
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'TECHNOLOGY', 'CULTURAL', 'SPORTS', 'ACADEMIC', 'CAREER'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCat === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'ALL' ? 'All Events' : cat}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="space-y-4">
        {filtered.map((ev) => {
          const userRsvp = rsvpState[ev.id];
          return (
            <div
              key={ev.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {ev.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Organized by {ev.organizer}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900">{ev.title}</h3>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setRsvp(ev.id, 'INTERESTED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      userRsvp === 'INTERESTED'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Interested
                  </button>

                  <button
                    onClick={() => setRsvp(ev.id, 'ATTENDING')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs ${
                      userRsvp === 'ATTENDING'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {userRsvp === 'ATTENDING' ? 'Attending ✓' : 'Register / RSVP'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {ev.date}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {ev.time}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {ev.location}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-500">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {ev.attendeeCount + (userRsvp === 'ATTENDING' ? 1 : 0)} / {ev.capacity} registered
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
