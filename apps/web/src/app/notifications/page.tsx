'use client';

import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  ThumbsUp,
  Award,
  AlertTriangle,
  Building,
  GraduationCap,
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Assignment Deadline Notice',
      body: 'CSC 301 Assignment 1: Graph Algorithms is due tomorrow at 23:59.',
      type: 'ALERT',
      time: '1 hour ago',
      read: false,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      id: 'n2',
      title: 'New Response in Course Community',
      body: 'Chioma Eze replied to your question in CSC 301: "Can someone explain recursion trees?"',
      type: 'COMMENT',
      time: '3 hours ago',
      read: false,
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: 'n3',
      title: 'Official Senate Announcement',
      body: 'First Semester Examination Schedule 2025/2026 has been published.',
      type: 'ANNOUNCEMENT',
      time: '5 hours ago',
      read: true,
      icon: Building,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      id: 'n4',
      title: 'New Internship Opportunity Alert',
      body: 'Google Africa Software Engineering Summer Internship 2027 is now open for applications.',
      type: 'OPPORTUNITY',
      time: 'Yesterday',
      read: true,
      icon: Award,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time alerts for lecture updates, assignments, responses, and official notices.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
          Mark All as Read
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
        {notifications.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                !n.read ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.body}</p>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">{n.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
