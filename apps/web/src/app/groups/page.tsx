'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  UsersRound,
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Globe2,
  BookOpen,
  FolderGit2,
  MessageSquare,
  FileText,
  Loader2,
  X,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface CourseOption {
  id: string;
  name: string;
  code: string;
  level?: number;
}

interface GroupItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  courseId?: string | null;
  course?: {
    id: string;
    name: string;
    code: string;
    level?: number;
  } | null;
  avatarUrl?: string;
  coverImageUrl?: string;
  isPrivate: boolean;
  requireApproval: boolean;
  memberCount: number;
  isMember?: boolean;
  membershipRole?: string | null;
  _count?: {
    posts: number;
    events: number;
    resources: number;
    members: number;
  };
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Groups & Circles', icon: UsersRound },
  { id: 'ACADEMIC', label: 'Course Study Circles', icon: GraduationCap },
  { id: 'PROFESSIONAL', label: 'Tech & Career Squads', icon: FolderGit2 },
  { id: 'HOBBY', label: 'Hobbies & Gaming', icon: Sparkles },
  { id: 'SPORTS', label: 'Sports & Athletics', icon: Users },
  { id: 'MY_GROUPS', label: 'My Enrolled Circles', icon: CheckCircle2 },
];

export default function GroupsDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State for Creating a Study Circle
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('ACADEMIC');
  const [newGroupCourseId, setNewGroupCourseId] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
  const [newGroupRequireApproval, setNewGroupRequireApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch UNILAG Courses for linking
  const { data: coursesData } = useQuery<CourseOption[]>({
    queryKey: ['unilag-courses-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/courses', { params: { limit: 100 } });
        return res.data?.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Groups with filters
  const { data: groupsData, isLoading, isError, refetch } = useQuery<GroupItem[]>({
    queryKey: ['groups-directory', search, selectedCategory, selectedCourseId],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: 50,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory === 'MY_GROUPS') {
        params.myGroupsOnly = true;
      } else if (selectedCategory !== 'ALL') {
        params.type = selectedCategory;
      }
      if (selectedCourseId !== 'ALL') {
        params.courseId = selectedCourseId;
      }

      const res = await api.get('/groups', { params });
      return res.data?.data?.data || [];
    },
  });

  // 3. Join / Leave Mutation
  const membershipMutation = useMutation({
    mutationFn: async ({ groupId, isCurrentlyMember }: { groupId: string; isCurrentlyMember: boolean }) => {
      if (isCurrentlyMember) {
        await api.delete(`/groups/${groupId}/leave`);
      } else {
        await api.post(`/groups/${groupId}/join`, {});
      }
    },
    onMutate: async ({ groupId, isCurrentlyMember }) => {
      await queryClient.cancelQueries({ queryKey: ['groups-directory'] });
      const previousGroups = queryClient.getQueryData<GroupItem[]>(['groups-directory', search, selectedCategory, selectedCourseId]);

      if (previousGroups) {
        queryClient.setQueryData<GroupItem[]>(
          ['groups-directory', search, selectedCategory, selectedCourseId],
          previousGroups.map((group) => {
            if (group.id === groupId) {
              return {
                ...group,
                isMember: !isCurrentlyMember,
                memberCount: isCurrentlyMember ? Math.max(0, group.memberCount - 1) : group.memberCount + 1,
                membershipRole: isCurrentlyMember ? null : 'MEMBER',
              };
            }
            return group;
          }),
        );
      }

      return { previousGroups };
    },
    onError: (err, variables, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(
          ['groups-directory', search, selectedCategory, selectedCourseId],
          context.previousGroups,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-directory'] });
    },
  });

  const handleToggleJoin = (group: GroupItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    membershipMutation.mutate({
      groupId: group.id,
      isCurrentlyMember: !!group.isMember,
    });
  };

  // 4. Create Group Handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setFormError('Please enter a group or circle title.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.post('/groups', {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        type: newGroupType,
        courseId: newGroupCourseId || undefined,
        isPrivate: newGroupIsPrivate,
        requireApproval: newGroupRequireApproval,
      });

      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupCourseId('');
      setNewGroupType('ACADEMIC');
      setNewGroupIsPrivate(false);
      setNewGroupRequireApproval(false);
      queryClient.invalidateQueries({ queryKey: ['groups-directory'] });
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to form study circle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>University of Lagos Academic & Peer Circles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Study Groups & Peer Circles
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Form small, focused study pods linked directly to your courses, collaborate on problem sets, share lecture notes, and study for semester exams with verified classmates.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Form Study Circle</span>
          </button>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Course Link Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search circles by name, course code, or description (e.g. CSC 301, Algorithms, OS)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-2xs"
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

          {/* Optional Course Filter Dropdown */}
          <div className="sm:w-64">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-2xs"
            >
              <option value="ALL">All Associated Courses</option>
              {coursesData?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
              <div className="h-12 bg-slate-50 rounded" />
              <div className="h-8 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-rose-800">Failed to load study groups.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : groupsData && groupsData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groupsData.map((group) => {
            const isOwner = group.membershipRole === 'OWNER';
            const isMod = group.membershipRole === 'MODERATOR';

            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="group bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                        {group.type}
                      </span>
                      {group.course && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          <span>{group.course.code}</span>
                        </span>
                      )}
                      {group.isPrivate && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>

                    {isOwner ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        Owner
                      </span>
                    ) : isMod ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Mod
                      </span>
                    ) : null}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {group.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {group.description || 'Collaborative study circle for coursework, exam prep, and peer review.'}
                    </p>
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{group.memberCount} members</span>
                    </span>
                    {group._count?.posts ? (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>{group._count.posts}</span>
                      </span>
                    ) : null}
                  </div>

                  <button
                    onClick={(e) => handleToggleJoin(group, e)}
                    disabled={membershipMutation.isPending || isOwner}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isOwner
                        ? 'bg-purple-50 text-purple-700 cursor-default'
                        : group.isMember
                        ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                    }`}
                  >
                    {isOwner ? (
                      'Owner'
                    ) : group.isMember ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Joined</span>
                      </>
                    ) : (
                      'Join Circle'
                    )}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <UsersRound className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">No study circles found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== 'ALL' || selectedCourseId !== 'ALL'
                ? 'No groups match your current filters. Try changing your search query or clear the filter.'
                : 'Be the first to start a peer study squad for your courses!'}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Form Study Circle</span>
          </button>
        </div>
      )}

      {/* Modal: Form New Study Circle */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900">Form a New Study Circle</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a peer pod for exam prep, problem walkthroughs, or course collaboration.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Circle Title *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. CSC 301 Algorithms Study Squad"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Circle Type
                  </label>
                  <select
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-semibold"
                  >
                    <option value="ACADEMIC">Academic / Course Circle</option>
                    <option value="PROFESSIONAL">Tech / Professional Squad</option>
                    <option value="HOBBY">Hobby & Special Interest</option>
                    <option value="SPORTS">Sports & Athletics</option>
                    <option value="SOCIAL">Social & Community</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Link to Course (Optional)
                  </label>
                  <select
                    value={newGroupCourseId}
                    onChange={(e) => setNewGroupCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                  >
                    <option value="">No Course Link (General)</option>
                    {coursesData?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description & Study Goals
                </label>
                <textarea
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Outline what your pod focuses on: past question reviews, weekly library sessions, lab assignments..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-normal leading-relaxed"
                />
              </div>

              {/* Privacy Toggles */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Private Circle</span>
                    <span className="text-[11px] text-slate-500">Only enrolled members can view circle materials</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newGroupIsPrivate}
                    onChange={(e) => setNewGroupIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200/70">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Require Approval</span>
                    <span className="text-[11px] text-slate-500">New joiners must be reviewed by circle leads</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newGroupRequireApproval}
                    onChange={(e) => setNewGroupRequireApproval(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Forming Circle...</span>
                    </>
                  ) : (
                    <span>Create Circle</span>
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
