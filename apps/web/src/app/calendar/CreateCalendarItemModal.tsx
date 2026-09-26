'use client';

import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Tag,
  BookOpen,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface CreateCalendarItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseOption[];
  onSuccess: () => void;
}

const TYPE_OPTIONS = [
  { id: 'PERSONAL', label: 'Personal Study / Task', color: '#6366f1' },
  { id: 'ASSIGNMENT', label: 'Assignment Deadline', color: '#f59e0b' },
  { id: 'EXAM', label: 'Exam / Test Date', color: '#e11d48' },
  { id: 'CLASS', label: 'Extra Class / Tutorial', color: '#2563eb' },
  { id: 'REMINDER', label: 'General Reminder', color: '#10b981' },
];

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#d97706', // Amber
  '#0891b2', // Cyan
  '#475569', // Slate
];

export function CreateCalendarItemModal({
  isOpen,
  onClose,
  courses,
  onSuccess,
}: CreateCalendarItemModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PERSONAL');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [courseId, setCourseId] = useState('');
  const [color, setColor] = useState('#2563eb');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter an event or task title.');
      return;
    }
    if (!date) {
      setErrorMessage('Please select a date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);

      const startDateObj = new Date(date);
      startDateObj.setHours(sH || 0, sM || 0, 0, 0);

      const endDateObj = new Date(date);
      endDateObj.setHours(eH || 0, eM || 0, 0, 0);

      await api.post('/calendar', {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        color,
        location: location.trim() || undefined,
        courseId: courseId || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to save calendar item.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                Add Calendar Event
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Add an exam, assignment deadline, or personal study session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-extrabold text-slate-800">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CSC 301 Midterm Examination or SIWES Project Defense"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          {/* Type & Course Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">Category</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  const found = TYPE_OPTIONS.find((t) => t.id === e.target.value);
                  if (found) setColor(found.color);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-slate-800"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">
                Course <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
              >
                <option value="">None / General</option>
                {(courses || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-800">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Location / Venue */}
          <div className="space-y-1">
            <label className="block text-xs font-extrabold text-slate-800">
              Venue / Location <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Science Complex Hall 1 or Zoom Link"
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Color Accent Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800">Accent Color</label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-extrabold text-slate-800">
              Notes & Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Bring scientific calculator and student ID card..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Calendar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
