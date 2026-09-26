'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  GraduationCap,
  LayoutDashboard,
  Compass,
  Calendar,
  Megaphone,
  BookOpen,
  HelpCircle,
  FolderDown,
  UsersRound,
  Building2,
  CalendarCheck,
  Award,
  MessageSquare,
  Bookmark,
  User,
  ShieldAlert,
  ShieldCheck,
  Layers,
  LogOut,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'UNIVERSITY_ADMIN' || user?.role === 'SUPER_ADMIN';

  const campusNav: NavItem[] = [
    { name: 'Campus Stream', href: '/', icon: LayoutDashboard },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Campus Calendar', href: '/calendar', icon: Calendar },
    { name: 'Official News', href: '/announcements', icon: Megaphone },
  ];

  const academicNav: NavItem[] = [
    { name: 'Course Communities', href: '/courses', icon: BookOpen },
    { name: 'Academic Q&A', href: '/qa', icon: HelpCircle },
    { name: 'Study Resources', href: '/resources', icon: FolderDown },
  ];

  const studentLifeNav: NavItem[] = [
    { name: 'Student Groups', href: '/groups', icon: UsersRound },
    { name: 'Clubs & Orgs', href: '/organizations', icon: Building2 },
    { name: 'Campus Events', href: '/events', icon: CalendarCheck },
    { name: 'Opportunities', href: '/opportunities', icon: Award, badge: 'New' },
  ];

  const personalNav: NavItem[] = [
    { name: 'Direct Messages', href: '/messages', icon: MessageSquare },
    { name: 'Saved Bookmarks', href: '/bookmarks', icon: Bookmark },
    { name: 'Student Profile', href: '/profile', icon: User },
  ];

  const adminNav: NavItem[] = [
    { name: 'Admin Dashboard', href: '/admin', icon: Layers },
    { name: 'Student Verification', href: '/admin/users', icon: ShieldCheck },
    { name: 'Academic Hierarchy', href: '/admin/academics', icon: BookOpen },
    { name: 'Safety Moderation', href: '/admin/moderation', icon: ShieldAlert },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-5">
      <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </h3>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !item.href.startsWith('/admin'));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 block">
            Interakt
          </span>
          <span className="text-[10px] text-blue-600 font-semibold tracking-wide uppercase block -mt-0.5">
            Digital Campus
          </span>
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {renderNavGroup('Campus', campusNav)}
        {renderNavGroup('Academics', academicNav)}
        {renderNavGroup('Student Life', studentLifeNav)}
        {renderNavGroup('Personal', personalNav)}

        {/* Admin Section (shown for admins or available for testing) */}
        {renderNavGroup('University Admin', adminNav)}
      </nav>

      {/* Student Profile Footer Badge */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-200/50 transition-colors flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
            {user?.profile?.firstName ? user.profile.firstName[0] : 'S'}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.profile?.firstName
                  ? `${user.profile.firstName} ${user.profile.lastName || ''}`
                  : 'Student Account'}
              </p>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.profile?.programme?.name || 'Undergraduate'}
            </p>
          </div>
        </Link>
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
