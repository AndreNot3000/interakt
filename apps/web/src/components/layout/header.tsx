'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  Search,
  Bell,
  MessageSquare,
  ShieldCheck,
  Plus,
  Building,
  Sparkles,
} from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* University Institution Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 shadow-xs">
          <Building className="w-3.5 h-3.5 text-blue-600" />
          <span>{user?.institution?.name || 'University of Lagos (UNILAG)'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>✓ Verified Student</span>
        </div>
      </div>

      {/* Global Campus Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-6 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, study materials, peers, clubs..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </form>

      {/* Action Utilities */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Create Post Shortcut */}
        <Link
          href="/?create=true"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post</span>
        </Link>

        {/* Messages */}
        <Link
          href="/messages"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Direct Messages"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="w-2 h-2 bg-blue-600 rounded-full absolute top-2 right-2 ring-2 ring-white" />
        </Link>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Campus Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-amber-500 rounded-full absolute top-2 right-2 ring-2 ring-white" />
        </Link>
      </div>
    </header>
  );
}
