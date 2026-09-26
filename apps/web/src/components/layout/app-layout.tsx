'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CampusWidgets } from '@/components/layout/campus-widgets';
import { useAuthStore } from '@/stores/auth-store';
import { GraduationCap, Loader2 } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, fetchCurrentUser } = useAuthStore();
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    const verifySession = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('interakt_token');

      if (!token) {
        if (!isAuthPage) {
          router.replace('/login');
        }
        setIsVerifyingAuth(false);
        return;
      }

      // If token exists but user state isn't populated
      if (!user) {
        await fetchCurrentUser();
      }

      // If on auth page but already have a token
      if (isAuthPage) {
        router.replace('/');
      }

      setIsVerifyingAuth(false);
    };

    verifySession();
  }, [pathname, isAuthPage, user, router, fetchCurrentUser]);

  // Auth pages (login / register)
  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // Show clean campus splash while checking auth to prevent flash of 401 errors
  if (isVerifyingAuth || (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('interakt_token'))) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-3 shadow-md">
          <GraduationCap className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Connecting to digital campus...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Primary Campus Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto w-full">{children}</div>
          </main>

          {/* Right Campus Sidebar (shown on non-admin screens) */}
          {!isAdminPage && <CampusWidgets />}
        </div>
      </div>
    </div>
  );
}
