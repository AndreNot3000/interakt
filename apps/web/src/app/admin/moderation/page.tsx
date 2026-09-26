'use client';

import { ShieldAlert, Trash2 } from 'lucide-react';

export default function ModerationAdminPage() {
  const reports = [
    {
      id: 'rep_1',
      targetType: 'POST',
      targetTitle: 'CSC 301 Discussion post',
      reason: 'SPAM',
      description: 'Repeated promotional crypto bot messages in course study feed.',
      reportedBy: 'kemi@student.unilag.edu.ng',
      reportedAt: '1 hour ago',
      contentSnippet: 'Join our WhatsApp group for guaranteed exam answers and crypto doubling...',
    },
    {
      id: 'rep_2',
      targetType: 'USER',
      targetTitle: 'User Account (ID: usr_994)',
      reason: 'HARASSMENT',
      description: 'Persistent abusive personal attacks in departmental comments.',
      reportedBy: 'tunde@student.unilag.edu.ng',
      reportedAt: '3 hours ago',
      contentSnippet: 'Direct messages threatening peer in study team.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Content Moderation & Safety Queue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review community reports filed by students and enforce university campus safety guidelines.
        </p>
      </div>

      <div className="space-y-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start justify-between gap-6"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {r.reason}
                </span>
                <span className="text-xs text-slate-400 font-medium">Target: {r.targetType}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400">{r.reportedAt}</span>
              </div>
              <h3 className="font-bold text-base text-slate-900">{r.targetTitle}</h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                {r.contentSnippet}
              </p>
              <p className="text-xs text-slate-500">
                <strong className="text-slate-700">Reporter Note:</strong> {r.description} (Reported by {r.reportedBy})
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => alert(`Report ${r.id} dismissed.`)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              >
                Dismiss Report
              </button>
              <button
                onClick={() => alert(`Content removed for report ${r.id}. Action logged in audit logs.`)}
                className="px-3.5 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Content
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
