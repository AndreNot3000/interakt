'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BookOpen,
  Users,
  Search,
  Layers,
  ChevronRight,
  CheckCircle2,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface CourseItem {
  id: string;
  code: string;
  name: string;
  level: number;
  units: number;
  semester: number;
  description?: string;
  isEnrolled?: boolean;
  programme?: {
    id: string;
    name: string;
    shortName: string;
    department?: {
      name: string;
      shortName: string;
    };
  };
  _count?: {
    enrollments: number;
    posts: number;
    resources: number;
    questions: number;
  };
}

export default function CoursesDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | 'ALL'>('ALL');

  const { data: coursesData, isLoading, error } = useQuery({
    queryKey: ['courses', search, selectedLevel],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (selectedLevel !== 'ALL') params.level = selectedLevel;

      const res = await api.get('/courses', { params });
      return res.data.data?.data as CourseItem[];
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) => {
      if (isEnrolled) {
        await api.delete(`/courses/${courseId}/enroll`);
      } else {
        await api.post(`/courses/${courseId}/enroll`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });

  // Fallback sample courses if backend is initializing or empty
  const fallbackCourses: CourseItem[] = [
    {
      id: 'csc101',
      code: 'CSC 101',
      name: 'Introduction to Computing',
      level: 100,
      units: 3,
      semester: 1,
      isEnrolled: false,
      programme: { id: 'p1', name: 'B.Sc. Computer Science', shortName: 'BSC-CS', department: { name: 'Computer Science', shortName: 'CSC' } },
      _count: { enrollments: 310, posts: 14, resources: 8, questions: 12 },
    },
    {
      id: 'csc201',
      code: 'CSC 201',
      name: 'Data Structures and Algorithms I',
      level: 200,
      units: 3,
      semester: 1,
      isEnrolled: false,
      programme: { id: 'p1', name: 'B.Sc. Computer Science', shortName: 'BSC-CS', department: { name: 'Computer Science', shortName: 'CSC' } },
      _count: { enrollments: 220, posts: 29, resources: 18, questions: 25 },
    },
    {
      id: 'csc301',
      code: 'CSC 301',
      name: 'Algorithm Design and Analysis',
      level: 300,
      units: 3,
      semester: 1,
      isEnrolled: true,
      programme: { id: 'p1', name: 'B.Sc. Computer Science', shortName: 'BSC-CS', department: { name: 'Computer Science', shortName: 'CSC' } },
      _count: { enrollments: 184, posts: 42, resources: 26, questions: 38 },
    },
    {
      id: 'csc302',
      code: 'CSC 302',
      name: 'Operating Systems & Architecture',
      level: 300,
      units: 3,
      semester: 2,
      isEnrolled: false,
      programme: { id: 'p1', name: 'B.Sc. Computer Science', shortName: 'BSC-CS', department: { name: 'Computer Science', shortName: 'CSC' } },
      _count: { enrollments: 162, posts: 19, resources: 12, questions: 15 },
    },
    {
      id: 'csc401',
      code: 'CSC 401',
      name: 'Software Engineering Principles',
      level: 400,
      units: 3,
      semester: 1,
      isEnrolled: false,
      programme: { id: 'p1', name: 'B.Sc. Computer Science', shortName: 'BSC-CS', department: { name: 'Computer Science', shortName: 'CSC' } },
      _count: { enrollments: 120, posts: 33, resources: 19, questions: 21 },
    },
  ];

  const courses = coursesData && coursesData.length > 0 ? coursesData : fallbackCourses;

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || c.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
            University Academic Core
          </span>
          <span className="text-xs text-slate-400 font-medium">Faculty ➔ Department ➔ Courses</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
          Course Communities
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Every university course is a community. Discuss lectures, share past questions, organize study groups, and prepare for exams.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or title (e.g. CSC 301)..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 100, 200, 300, 400].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedLevel === lvl
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'All Levels' : `${lvl} Level`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs font-semibold">Loading university courses...</span>
        </div>
      )}

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((course) => {
          const courseSlug = course.code.toLowerCase().replace(/\s+/g, '');
          const isPending = enrollMutation.isPending && (enrollMutation.variables as any)?.courseId === course.id;

          return (
            <div
              key={course.id}
              className="group bg-white border border-slate-200 hover:border-blue-600 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {course.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {course.programme?.department?.name || course.programme?.name || 'Computer Science'}
                    </span>
                  </div>

                  {/* Enroll / Enrolled Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      enrollMutation.mutate({ courseId: course.id, isEnrolled: !!course.isEnrolled });
                    }}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                      course.isEnrolled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : course.isEnrolled ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 group-hover:hidden" />
                        <span>Enrolled</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Enroll</span>
                      </>
                    )}
                  </button>
                </div>

                <Link href={`/courses/${courseSlug}`}>
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                    {course.name}
                  </h3>
                </Link>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">{course.level}L</span>
                  <span>•</span>
                  <span>{course.units} Units</span>
                  <span>•</span>
                  <span>Semester {course.semester}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {course._count?.enrollments ?? 0} peers
                  </span>
                </div>
                <Link
                  href={`/courses/${courseSlug}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline font-bold text-xs"
                >
                  <span>Enter Hub</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
