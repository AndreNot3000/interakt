'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import {
  GraduationCap,
  Building,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('interakt_token');
      if (token) {
        router.replace('/');
      }
    }
  }, [router]);

  const handleFillDemo = (type: 'david' | 'student1') => {
    if (type === 'david') {
      setEmail('david@student.unilag.edu.ng');
    } else {
      setEmail('student1@university.edu.ng');
    }
    setPassword('SecurePassword123!');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (res.data?.success && res.data?.data) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        router.push('/');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        'Unable to log in. Please check your student credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Interakt
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>University of Lagos Campus</span>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Sign in to your university student portal.
          </p>
        </div>

        {/* Demo Credentials Quick-Fill Banner */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Demo Student Accounts
            </span>
            <span className="text-[11px] text-blue-600 font-semibold font-mono">
              Password: SecurePassword123!
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('david')}
              className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs"
            >
              Fill David (UNILAG)
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('student1')}
              className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold transition shadow-xs"
            >
              Fill Student 1
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Student Email */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. david@student.unilag.edu.ng"
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <Link href="#" className="text-[11px] text-blue-600 font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In to Campus'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          New student?{' '}
          <Link href="/register" className="font-bold text-blue-600 hover:underline">
            Register your university account
          </Link>
        </div>
      </div>
    </div>
  );
}
