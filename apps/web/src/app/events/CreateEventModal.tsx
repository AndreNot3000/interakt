'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Users,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const PRESET_BANNERS = [
  {
    name: 'Tech & Hackathon',
    category: 'TECHNOLOGY',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Career & Networking',
    category: 'CAREER',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Academic & Study',
    category: 'ACADEMIC',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sports & Athletics',
    category: 'SPORTS',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Arts & Cultural Gala',
    category: 'CULTURAL',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
  },
];

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TECHNOLOGY');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('13:00');
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [capacity, setCapacity] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }

    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime || '00:00'}:00`);
    const finalEndDate = endDate || startDate;
    const endDateTime = new Date(`${finalEndDate}T${endTime || '23:59'}:00`);

    if (endDateTime <= startDateTime) {
      setError('End date and time must be after the start time.');
      return;
    }

    if (!isOnline && !location.trim()) {
      setError('Please provide a physical campus venue.');
      return;
    }

    if (isOnline && !onlineMeetingUrl.trim()) {
      setError('Please provide an online meeting URL.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        isOnline,
        location: isOnline ? undefined : location.trim(),
        onlineMeetingUrl: isOnline ? onlineMeetingUrl.trim() : undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
      };

      await api.post('/events', payload);
      onSuccess(`"${title.trim()}" scheduled successfully! Synced to your calendar.`);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create event.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Schedule Campus Event</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Host a lecture, workshop, hackathon, sports match, or social activity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UNILAG Artificial Intelligence & Robotics Summit"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              required
            />
          </div>

          {/* Category & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              >
                <option value="TECHNOLOGY">Technology & Hackathons</option>
                <option value="ACADEMIC">Academic & Lectures</option>
                <option value="CAREER">Career & Internships</option>
                <option value="SPORTS">Sports & Athletics</option>
                <option value="CULTURAL">Arts & Cultural</option>
                <option value="SOCIAL">Social & Hangouts</option>
                <option value="OTHER">Other Campus Events</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Attendee Capacity (Optional)</label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 250 (Leave blank for unlimited)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl">
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Start Schedule
              </span>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                />
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                End Schedule
              </span>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* Venue & Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Location & Attendance</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnline(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !isOnline
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  In-Person
                </button>
                <button
                  type="button"
                  onClick={() => setIsOnline(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isOnline
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Virtual / Online
                </button>
              </div>
            </div>

            {!isOnline ? (
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Faculty of Science Main Auditorium, LT1"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>
            ) : (
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={onlineMeetingUrl}
                  onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                  placeholder="e.g. https://meet.google.com/abc-defg-hij"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>
            )}
          </div>

          {/* Banner Image & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Cover Banner Image</label>
              <span className="text-[11px] text-slate-400">URL or select preset below</span>
            </div>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
              {PRESET_BANNERS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setCoverImageUrl(preset.url);
                    setCategory(preset.category);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap ${
                    coverImageUrl === preset.url
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Event Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline what students can expect, keynote speakers, agendas, or prerequisites..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
