'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  FileText,
  FileCode,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  UserCheck,
  RotateCcw,
  Loader2,
  Check,
  GraduationCap,
  ExternalLink,
  Eye,
  Upload,
} from 'lucide-react';
import { UploadResourceModal } from './UploadResourceModal';
import { PdfPreviewModal } from './PdfPreviewModal';

interface UploaderProfile {
  id: string;
  verificationStatus?: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    level?: number | string | null;
    reputationPoints?: number;
  } | null;
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  semester?: number | null;
}

interface ResourceItem {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  type: string;
  fileKey: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  downloadCount: number;
  semester?: number | null;
  academicYear?: number | null;
  createdAt: string;
  course?: CourseItem | null;
  uploader?: UploaderProfile | null;
}

// Category configuration
const CATEGORIES = [
  { id: 'ALL', label: 'All Materials', icon: Layers },
  { id: 'PAST_QUESTION', label: 'Past Questions', icon: FileText, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'LECTURE_SLIDE', label: 'Lecture Slides', icon: Layers, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { id: 'SUMMARY_NOTE', label: 'Summary Notes', icon: BookOpen, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { id: 'LAB_MANUAL', label: 'Lab Manuals', icon: FileCode, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'TEXTBOOK', label: 'Textbooks', icon: GraduationCap, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
];

function formatBytes(bytes?: number | null): string {
  if (!bytes) return 'Unknown size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFormatDetails(mimeType?: string | null, fileName?: string | null, type?: string) {
  const ext = fileName?.split('.').pop()?.toUpperCase() || (type === 'PDF' ? 'PDF' : 'DOCX');
  if (ext === 'PDF' || mimeType?.includes('pdf')) {
    return { ext: 'PDF', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (ext === 'DOCX' || ext === 'DOC' || mimeType?.includes('word')) {
    return { ext: 'DOCX', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (ext === 'ZIP' || ext === 'RAR') {
    return { ext: 'ZIP', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (ext === 'PPTX' || ext === 'PPT') {
    return { ext: 'PPTX', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
  }
  return { ext: ext || 'FILE', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function ResourcesPage() {
  const queryClient = useQueryClient();

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [sortBy, setSortBy] = useState<'downloads' | 'latest'>('downloads');

  // Interactive feedback state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Upload and Preview Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Courses list
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data;
    },
  });

  const courses: CourseItem[] = Array.isArray(coursesData?.data?.data)
    ? coursesData.data.data
    : Array.isArray(coursesData?.data)
    ? coursesData.data
    : Array.isArray(coursesData)
    ? coursesData
    : [];

  // Fetch Resources with server-side query filters
  const { data: resourcesData, isLoading } = useQuery({
    queryKey: [
      'resources',
      search,
      selectedCategory,
      selectedCourse,
      selectedSemester,
      selectedYear,
      selectedFormat,
      sortBy,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedCourse !== 'ALL') params.append('courseId', selectedCourse);
      if (selectedSemester !== 'ALL') params.append('semester', selectedSemester);
      if (selectedYear !== 'ALL') params.append('academicYear', selectedYear);
      if (selectedFormat !== 'ALL') params.append('type', selectedFormat);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await api.get(`/resources?${params.toString()}`);
      return res.data?.data || res.data;
    },
  });

  const resources: ResourceItem[] = resourcesData?.data || (Array.isArray(resourcesData) ? resourcesData : []);
  const totalCount = resourcesData?.meta?.total ?? resources.length;

  // Handle resource download
  const handleDownload = async (resource: ResourceItem) => {
    try {
      setDownloadingId(resource.id);
      const res = await api.get(`/resources/${resource.id}/download`);
      const { downloadUrl, fileName } = res.data?.data || res.data;

      // Optimistic update of local downloadCount in React Query cache
      queryClient.setQueryData(
        [
          'resources',
          search,
          selectedCategory,
          selectedCourse,
          selectedSemester,
          selectedYear,
          selectedFormat,
          sortBy,
        ],
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((r: ResourceItem) => (r.id === resource.id ? { ...r, downloadCount: r.downloadCount + 1 } : r));
          }
          if (old.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((r: ResourceItem) =>
                r.id === resource.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
              ),
            };
          }
          return old;
        }
      );

      showToast(`Downloading "${fileName || resource.title}"...`, 'success');

      // Trigger download in browser
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Download initialization failed.', 'info');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedCourse('ALL');
    setSelectedSemester('ALL');
    setSelectedYear('ALL');
    setSelectedFormat('ALL');
    setSortBy('downloads');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedCategory !== 'ALL' ||
    selectedCourse !== 'ALL' ||
    selectedSemester !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedFormat !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-blue-600 text-white border-blue-500'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-extrabold border border-blue-200">
                <GraduationCap className="w-3.5 h-3.5" />
                Digital Academic Vault
              </span>
              <span className="text-xs font-bold text-slate-500">
                {totalCount} Verified Academic Materials
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Course Study Materials & Digital Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Centralized repository for past examination papers with marking rubrics, official lecture slide decks, revision summary sheets, lab manuals, and syllabus guides.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                hasActiveFilters
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition-all flex items-center gap-1.5 shadow-xs flex-shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Share Material</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 gap-3 sm:gap-6 mt-8 overflow-x-auto pb-px">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Search & Multi-Faceted Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by course code (e.g. CSC 301), exam topic, or title..."
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Course Selector Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-slate-800"
            >
              <option value="ALL">🎓 All University Courses</option>
              {(courses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-slate-800"
            >
              <option value="downloads">🔥 Most Downloaded First</option>
              <option value="latest">🕒 Recently Uploaded First</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Semester, Exam Year, and File Format */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter by:
            </span>

            {/* Semester Dropdown */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>

            {/* Exam Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Exam Years</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>

            {/* Format Dropdown */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Formats (PDF/DOCX)</option>
              <option value="PDF">PDF Only</option>
              <option value="DOCUMENT">Word Document (.docx)</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Showing <strong className="text-slate-800">{resources.length}</strong> of{' '}
            <strong className="text-slate-800">{totalCount}</strong> items
          </div>
        </div>
      </div>

      {/* Materials List Stream */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Searching and loading study materials...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">No study materials found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No course documents matched your current search filters. Try broadening your keywords or resetting semester/year filters.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((item) => {
            const format = getFormatDetails(item.mimeType, item.fileName, item.type);
            const categoryObj = CATEGORIES.find((c) => c.id === item.category);
            const categoryLabel = categoryObj?.label || item.category || 'Summary Notes';
            const categoryColor = categoryObj?.color || 'text-slate-700 bg-slate-100 border-slate-200';

            const uploaderName = item.uploader?.profile
              ? `${item.uploader.profile.firstName} ${item.uploader.profile.lastName}`
              : 'Academic Department';
            const uploaderLevel = item.uploader?.profile?.level ? `${item.uploader.profile.level}L` : null;

            const isDownloading = downloadingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl p-5 sm:p-6 transition-all hover:shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* File Format Box */}
                    <div
                      className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center font-black text-[11px] shadow-2xs flex-shrink-0 ${format.bg}`}
                    >
                      <span>{format.ext}</span>
                      <span className="text-[8px] font-bold opacity-80 uppercase tracking-tighter">FILE</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Badge Tags Row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.course?.code && (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono">
                            📚 {item.course.code}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${categoryColor}`}
                        >
                          {categoryLabel}
                        </span>

                        {(item.semester || item.academicYear) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {item.semester ? `${item.semester === 1 ? '1st' : '2nd'} Sem` : ''}
                            {item.semester && item.academicYear ? ' • ' : ''}
                            {item.academicYear ? item.academicYear : ''}
                          </span>
                        )}

                        {item.downloadCount > 100 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                            Popular
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                        <HighlightText text={item.title} highlight={search} />
                      </h3>

                      {/* Description */}
                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          <HighlightText text={item.description} highlight={search} />
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Preview & Download */}
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                    <button
                      onClick={() => setPreviewResource(item)}
                      className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      title="Preview document in browser"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => handleDownload(item)}
                      disabled={isDownloading}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Fetching...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-600">
                      {formatBytes(item.fileSize)}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">
                      <strong>{item.downloadCount}</strong> student downloads
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>Uploaded by</span>
                    <span className="font-extrabold text-slate-800">{uploaderName}</span>
                    {uploaderLevel && (
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold">
                        {uploaderLevel}
                      </span>
                    )}
                    {item.uploader?.verificationStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center text-blue-600" title="Verified University Student">
                        <UserCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Study Material Modal */}
      <UploadResourceModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        courses={courses}
        onUploadSuccess={(newResource) => {
          showToast(`"${newResource.title}" published successfully to campus vault!`, 'success');
          queryClient.invalidateQueries({ queryKey: ['resources'] });
        }}
      />

      {/* In-Browser PDF & Document Preview Modal */}
      <PdfPreviewModal
        isOpen={!!previewResource}
        resource={previewResource}
        onClose={() => setPreviewResource(null)}
        onDownload={(res) => handleDownload(res)}
      />
    </div>
  );
}
