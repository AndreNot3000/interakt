'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Building2,
  ShieldCheck,
  Plus,
  ExternalLink,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  Calendar,
  MessageSquare,
  X,
  Mail,
  Globe,
  Loader2,
  Filter,
} from 'lucide-react';

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  email?: string;
  isOfficial: boolean;
  memberCount: number;
  isMember?: boolean;
  membershipRole?: string | null;
  _count?: {
    posts: number;
    events: number;
    resources: number;
    announcements: number;
    members: number;
  };
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Societies' },
  { id: 'Technology', label: 'Technology & Dev' },
  { id: 'Academic', label: 'Academic & Dept' },
  { id: 'Leadership', label: 'Student Councils' },
  { id: 'Arts & Culture', label: 'Debate & Arts' },
  { id: 'Sports & Gaming', label: 'Sports & Esports' },
  { id: 'Community & Service', label: 'Community Service' },
];

export default function OrganizationsDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // New Org Form State
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCategory, setNewOrgCategory] = useState('Technology');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 1. Fetch Organizations
  const { data: orgsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['organizations', search, selectedCategory, verifiedOnly],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: 50,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (verifiedOnly) params.verifiedOnly = true;

      const res = await api.get('/organizations', { params });
      return res.data?.data?.data as OrganizationItem[];
    },
  });

  // 2. Join / Leave Mutations
  const membershipMutation = useMutation({
    mutationFn: async ({ orgId, isCurrentlyMember }: { orgId: string; isCurrentlyMember: boolean }) => {
      if (isCurrentlyMember) {
        await api.delete(`/organizations/${orgId}/leave`);
      } else {
        await api.post(`/organizations/${orgId}/join`, {});
      }
    },
    onMutate: async ({ orgId, isCurrentlyMember }) => {
      await queryClient.cancelQueries({ queryKey: ['organizations'] });
      const previousData = queryClient.getQueryData(['organizations', search, selectedCategory, verifiedOnly]);

      queryClient.setQueryData(
        ['organizations', search, selectedCategory, verifiedOnly],
        (old: OrganizationItem[] | undefined) => {
          if (!old) return old;
          return old.map((org) => {
            if (org.id === orgId) {
              return {
                ...org,
                isMember: !isCurrentlyMember,
                memberCount: isCurrentlyMember
                  ? Math.max(0, org.memberCount - 1)
                  : org.memberCount + 1,
              };
            }
            return org;
          });
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['organizations', search, selectedCategory, verifiedOnly],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // 3. Register New Organization
  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmittingOrg(true);
    setModalError(null);

    try {
      const payload: any = {
        name: newOrgName.trim(),
        category: newOrgCategory,
        description: newOrgDescription.trim(),
      };
      if (newOrgWebsite.trim()) payload.websiteUrl = newOrgWebsite.trim();
      if (newOrgEmail.trim()) payload.email = newOrgEmail.trim();

      const res = await api.post('/organizations', payload);
      if (res.data?.id || res.data?.success) {
        setIsRegisterModalOpen(false);
        setNewOrgName('');
        setNewOrgDescription('');
        setNewOrgWebsite('');
        setNewOrgEmail('');
        queryClient.invalidateQueries({ queryKey: ['organizations'] });
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Unable to register student club.');
    } finally {
      setIsSubmittingOrg(false);
    }
  };

  const organizations = orgsData || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Building2 className="w-3.5 h-3.5" />
            <span>Campus Societies & Associations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Clubs & Student Organizations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Discover student-led engineering chapters, tech clubs, debating societies, and official academic bodies active across the university.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Register Student Club</span>
        </button>
      </div>

      {/* 2. Search & Category Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clubs by name, mission, or keywords..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium placeholder:text-slate-400 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Verified Only Toggle */}
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
              verifiedOnly
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${verifiedOnly ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Official Recognized Only</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Clubs Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-600">Discovering university societies...</p>
        </div>
      ) : isError ? (
        <div className="bg-white border border-rose-100 rounded-3xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-rose-700">Unable to load student organizations.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Retry
          </button>
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No organizations found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || selectedCategory !== 'ALL'
              ? 'Try changing your category filter or search query.'
              : 'Be the first student to register an official club or society!'}
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setVerifiedOnly(false);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizations.map((org) => {
            const isMember = Boolean(org.isMember);
            return (
              <div
                key={org.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Cover Banner */}
                  <div className="h-28 bg-slate-100 relative overflow-hidden">
                    {org.coverImageUrl ? (
                      <img
                        src={org.coverImageUrl}
                        alt={org.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Category Chip */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-xs text-slate-800 shadow-xs">
                        {org.category || 'General'}
                      </span>
                    </div>

                    {/* Official Verified Badge */}
                    {org.isOfficial && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Official</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 pt-3 space-y-3">
                    {/* Club Avatar & Title */}
                    <div className="flex items-start gap-3 -mt-9 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-white p-1 border-2 border-white shadow-md flex-shrink-0 overflow-hidden">
                        {org.avatarUrl ? (
                          <img
                            src={org.avatarUrl}
                            alt={org.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center font-bold text-base rounded-xl">
                            {org.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="pt-6 flex-1 min-w-0">
                        <Link
                          href={`/organizations/${org.slug || org.id}`}
                          className="font-extrabold text-sm text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 block"
                        >
                          {org.name}
                        </Link>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {org.description || 'Dedicated campus society fostering student collaboration and excellence.'}
                    </p>

                    {/* Stats Snippet */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {org.memberCount} members
                      </span>
                      {org._count?.events ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {org._count.events} events
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/organizations/${org.slug || org.id}`}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    View Hub →
                  </Link>

                  <button
                    onClick={() =>
                      membershipMutation.mutate({
                        orgId: org.id,
                        isCurrentlyMember: isMember,
                      })
                    }
                    disabled={membershipMutation.isPending}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ${
                      isMember
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isMember ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Joined</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Join Club</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Register Organization Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Register Student Club
                </h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRegisterOrg} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Club or Society Name *
                </label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. University Robotics Club"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Category *
                </label>
                <select
                  value={newOrgCategory}
                  onChange={(e) => setNewOrgCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                >
                  <option value="Technology">Technology & Engineering</option>
                  <option value="Academic">Academic & Departmental</option>
                  <option value="Leadership">Student Governance & Leadership</option>
                  <option value="Arts & Culture">Arts, Culture & Debate</option>
                  <option value="Sports & Gaming">Sports & Esports</option>
                  <option value="Community & Service">Community Service & Outreach</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description & Mission Statement
                </label>
                <textarea
                  rows={3}
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="What is the objective of this club? Who can join?"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Official Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={newOrgWebsite}
                    onChange={(e) => setNewOrgWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Official Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newOrgEmail}
                    onChange={(e) => setNewOrgEmail(e.target.value)}
                    placeholder="contact@club.unilag.edu.ng"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrg}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingOrg ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Club Registration</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
