'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  Edit3,
  Award,
  FileCheck,
  Star,
  Sparkles,
  ThumbsUp,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'reputation' | 'verification' | 'privacy'>('profile');

  // Verification request form state
  const [studentIdInput, setStudentIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  // Fetch live student profile and reputation data
  const { data: profileResponse } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.get('/users/profile');
      return res.data?.data || res.data;
    },
  });

  const currentUser = profileResponse || user;
  const isVerified = currentUser?.verificationStatus === 'VERIFIED';

  const reputation = currentUser?.reputation || {
    points: currentUser?.profile?.reputationPoints || 0,
    tier:
      (currentUser?.profile?.reputationPoints || 0) >= 100
        ? 'Campus Mentor'
        : (currentUser?.profile?.reputationPoints || 0) >= 50
        ? 'Course Scholar'
        : (currentUser?.profile?.reputationPoints || 0) >= 15
        ? 'Peer Contributor'
        : 'Active Learner',
    nextTierPoints:
      (currentUser?.profile?.reputationPoints || 0) < 15
        ? 15
        : (currentUser?.profile?.reputationPoints || 0) < 50
        ? 50
        : 100,
    badges: [],
    breakdown: { totalAnswers: 0, acceptedAnswers: 0, upvotesReceived: 0 },
  };

  const progressPercent = Math.min(
    100,
    Math.round(((reputation.points || 0) / (reputation.nextTierPoints || 100)) * 100)
  );

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput.trim()) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationSubmitted(true);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm flex-shrink-0">
              {currentUser?.profile?.firstName?.[0] || 'D'}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {currentUser?.profile?.firstName || 'David'} {currentUser?.profile?.lastName || 'Adeyemi'}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Student
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Verification Pending
                  </span>
                )}

                {/* Academic Reputation Score Chip */}
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  ★ {reputation.points} Rep • {reputation.tier}
                </span>
              </div>

              <p className="text-xs text-blue-600 font-bold">
                {currentUser?.institution?.name || 'University of Lagos (UNILAG)'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                {currentUser?.profile?.bio ||
                  'Undergraduate student in Computer Science passionate about distributed systems, algorithm optimization, and campus tech community building.'}
              </p>
            </div>
          </div>

          <button className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs">
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>

        {/* Profile Tabs */}
        <div className="flex border-b border-slate-200 gap-6 mt-8 overflow-x-auto">
          {[
            { id: 'profile', label: 'Academic Credentials' },
            { id: 'reputation', label: 'Reputation & Honors' },
            { id: 'verification', label: 'Student Verification' },
            { id: 'privacy', label: 'Privacy & Security' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.id === 'reputation' && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black">
                  ★ {reputation.points}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Academic Credentials */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Institutional Academic Record */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Academic Credentials
            </h2>

            <div className="space-y-3 divide-y divide-slate-100 text-xs">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Faculty</span>
                <span className="font-bold text-slate-800">
                  {currentUser?.profile?.faculty?.name || 'Faculty of Science'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Department</span>
                <span className="font-bold text-slate-800">
                  {currentUser?.profile?.department?.name || 'Department of Computer Science'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Degree Programme</span>
                <span className="font-bold text-slate-800">
                  {currentUser?.profile?.programme?.name || 'B.Sc. Computer Science'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Current Academic Level</span>
                <span className="font-bold text-slate-800">
                  {currentUser?.profile?.level ? `${currentUser.profile.level} Level` : '300 Level'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Matriculation / Student ID</span>
                <span className="font-bold text-slate-800 font-mono">
                  {currentUser?.profile?.matricNo || currentUser?.profile?.studentId || '190408012'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Expected Graduation</span>
                <span className="font-bold text-slate-800">
                  {currentUser?.profile?.graduationYear || '2027'}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Honors Quick Summary Card */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Academic Reputation Score
                </h2>
                <button
                  onClick={() => setActiveTab('reputation')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                >
                  View Full Breakdown →
                </button>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-900">★ {reputation.points}</span>
                <span className="text-xs font-bold text-amber-700">Campus Contribution Points</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-amber-800">
                  <span>Current Tier: <strong>{reputation.tier}</strong></span>
                  <span>{reputation.points} / {reputation.nextTierPoints} pts</span>
                </div>
                <div className="w-full bg-amber-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-white/80 border border-amber-200/60 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 font-medium">Accepted Solutions</p>
                  <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                    ✓ {reputation.breakdown?.acceptedAnswers ?? 0}
                  </p>
                </div>
                <div className="bg-white/80 border border-amber-200/60 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 font-medium">Peer Upvotes</p>
                  <p className="text-base font-extrabold text-blue-700 mt-0.5">
                    ▲ {reputation.breakdown?.upvotesReceived ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Skills & Interests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Technical Skills & Focus Areas
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(currentUser?.profile?.skills?.length
                  ? currentUser.profile.skills
                  : ['Algorithms & Data Structures', 'Python', 'TypeScript', 'Next.js', 'PostgreSQL', 'Docker']
                ).map((s: string) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reputation & Academic Honors */}
      {activeTab === 'reputation' && (
        <div className="space-y-6">
          {/* Main Hero Card */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  Academic Knowledge Contributor
                </span>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-4xl sm:text-5xl font-black">★ {reputation.points}</h2>
                  <span className="text-base font-bold text-amber-100">Reputation Points</span>
                </div>
                <p className="text-xs text-amber-100 max-w-lg leading-relaxed">
                  Reputation is earned by contributing verified solutions to coursework questions and receiving helpful upvotes from university peers.
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-full md:w-72 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-100">Academic Standing</span>
                  <span className="font-black text-white px-2 py-0.5 rounded-md bg-white/20">
                    {reputation.tier}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-amber-100 font-medium">
                    <span>Progress to next rank</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-white h-2.5 rounded-full transition-all duration-500 shadow-xs"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-amber-200 text-right mt-1">
                    {reputation.nextTierPoints - reputation.points > 0
                      ? `${reputation.nextTierPoints - reputation.points} more points needed`
                      : 'Milestone Achieved!'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Accepted Answers</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {reputation.breakdown?.acceptedAnswers ?? 0}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">+15 points each</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <ThumbsUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Peer Upvotes</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {reputation.breakdown?.upvotesReceived ?? 0}
                </p>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5">+5 points each</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Course Answers</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {reputation.breakdown?.totalAnswers ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Total solutions shared</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Solution Quality</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {reputation.breakdown?.totalAnswers > 0
                    ? `${Math.round(
                        (reputation.breakdown.acceptedAnswers / reputation.breakdown.totalAnswers) * 100
                      )}%`
                    : '100%'}
                </p>
                <p className="text-[11px] text-amber-600 font-bold mt-0.5">Acceptance Rate</p>
              </div>
            </div>
          </div>

          {/* Earned Academic Badges Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Earned Academic Badges
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Special distinctions conferred by academic peers and course communities based on verified coursework contributions.
              </p>
            </div>

            {reputation.badges && reputation.badges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {reputation.badges.map((badge: any) => (
                  <div
                    key={badge.id}
                    className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 flex items-start gap-3.5 hover:shadow-sm transition-all"
                  >
                    <span className="text-2xl flex-shrink-0">{badge.icon || '🏆'}</span>
                    <div>
                      <p className="text-xs font-black text-slate-900">{badge.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
                <span className="text-3xl">🏅</span>
                <p className="text-xs font-bold text-slate-800">No badges unlocked yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Submit answers to coursework questions in the Q&A Forum. Earn 15+ reputation points or an accepted solution to unlock your first academic badge!
                </p>
              </div>
            )}

            {/* Reputation Rule Guidelines Callout */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 mb-0.5">How Academic Reputation Works:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li><strong>+15 Points</strong>: When the question author marks your response as the <strong>Accepted Solution</strong>.</li>
                  <li><strong>+5 Points</strong>: Whenever any course peer upvotes your answer.</li>
                  <li><strong>Academic Badges</strong>: Granted automatically when you achieve course milestones or community tiers (e.g. <em>CSC 301 Top Contributor</em>).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Student Verification */}
      {activeTab === 'verification' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                University Student Verification
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Verified students gain access to course communities, student voting, official announcements, and academic opportunities.
            </p>
          </div>

          {isVerified ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Your student identity is fully verified!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Verified under University of Lagos (UNILAG). Validated through student matriculation record.
                </p>
              </div>
            </div>
          ) : verificationSubmitted ? (
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-900">
                  Verification request submitted!
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Your university administrator is reviewing your student ID. You will be notified in-app once approved.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Student ID Number / Admission Number
                </label>
                <input
                  type="text"
                  required
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="e.g. 190408012"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload Student ID Card Photo
                </label>
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-blue-600 cursor-pointer transition-colors">
                  <p className="text-xs text-slate-500">
                    Click to select your student ID card or official admission letter (JPG, PNG, or PDF up to 10MB)
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                {isVerifying ? 'Submitting...' : 'Submit Verification Request'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab: Privacy & Security */}
      {activeTab === 'privacy' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            Student Privacy Controls
          </h2>
          <p className="text-xs text-slate-500">
            Control what other students can see on your public campus profile.
          </p>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Show Email Address</p>
                <p className="text-slate-400">Allow course peers to see your student email</p>
              </div>
              <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Show Student ID Number</p>
                <p className="text-slate-400">Display matriculation number on profile</p>
              </div>
              <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Direct Messaging</p>
                <p className="text-slate-400">Allow students in your courses to send direct messages</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
