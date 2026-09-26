'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  X,
  Upload,
  FileText,
  FileCode,
  BookOpen,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

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
}

interface UploadResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseItem[];
  onUploadSuccess: (newResource: ResourceItem) => void;
}

const CATEGORY_OPTIONS = [
  { id: 'PAST_QUESTION', label: 'Past Exam Question & Solutions', icon: FileText },
  { id: 'LECTURE_SLIDE', label: 'Official Lecture Slide Deck', icon: Layers },
  { id: 'SUMMARY_NOTE', label: 'Student Revision Summary Note', icon: BookOpen },
  { id: 'LAB_MANUAL', label: 'Lab Manual & Practical Guide', icon: FileCode },
  { id: 'TEXTBOOK', label: 'Textbook / Reference Guide', icon: GraduationCap },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadResourceModal({
  isOpen,
  onClose,
  courses,
  onUploadSuccess,
}: UploadResourceModalProps) {
  const user = useAuthStore((s) => s.user);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [category, setCategory] = useState('PAST_QUESTION');
  const [semester, setSemester] = useState('1');
  const [academicYear, setAcademicYear] = useState('2024');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload progress & lifecycle state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'presigning' | 'uploading' | 'saving' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setCourseId('');
    setCategory('PAST_QUESTION');
    setSemester('1');
    setAcademicYear('2024');
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStage('idle');
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetForm();
    onClose();
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
      return;
    }

    const validExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a PDF, Word document (.docx), or PowerPoint presentation (.pptx).');
      return;
    }

    setSelectedFile(file);

    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a title for this study material.');
      return;
    }
    if (!courseId) {
      setErrorMessage('Please select a course for this material.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadStage('presigning');
      setUploadProgress(5);

      // Determine resource type enum
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      const resourceType = isPdf ? 'PDF' : 'DOCUMENT';

      // Course code for structured S3 path
      const selectedCourse = (courses || []).find((c) => c.id === courseId);
      const courseCode = selectedCourse?.code?.replace(/[^a-zA-Z0-9]/g, '') || 'GEN';
      const institutionId = user?.institutionId || 'cmufo7bc800041135w2shvi9x';

      // 1. Request presigned upload URL with structured S3 path
      const folder = `${institutionId}/courses/${courseCode}/${category}`;
      const presignRes = await api.post('/storage/upload-url', {
        folder,
        mimeType: selectedFile.type || 'application/pdf',
        fileName: selectedFile.name,
      });

      const { uploadUrl, key } = presignRes.data?.data || presignRes.data;
      if (!uploadUrl || !key) {
        throw new Error('Failed to obtain secure storage upload authorization.');
      }

      // 2. Direct binary upload to MinIO/S3 with real-time XHR progress tracking
      setUploadStage('uploading');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/pdf');

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 90); // 0% to 90%
            setUploadProgress(Math.max(5, pct));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(95);
            resolve();
          } else {
            reject(new Error(`Storage server returned error status ${xhr.status}.`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during direct storage upload. Please check connection.'));
        };

        xhr.send(selectedFile);
      });

      // 3. Persist resource metadata in database
      setUploadStage('saving');
      const saveRes = await api.post('/resources', {
        title: title.trim(),
        description: description.trim() || undefined,
        type: resourceType,
        fileKey: key,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
        category,
        courseId,
        semester: semester ? Number(semester) : undefined,
        academicYear: academicYear ? Number(academicYear) : undefined,
      });

      const newResource = saveRes.data?.data || saveRes.data;

      setUploadProgress(100);
      setUploadStage('complete');

      // Brief delay to show 100% completion before closing
      setTimeout(() => {
        onUploadSuccess(newResource);
        resetForm();
        onClose();
      }, 800);
    } catch (err: any) {
      setUploadStage('error');
      setIsUploading(false);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Upload failed. Please check network connection.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-2xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Share Study Material
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload past questions, lecture decks, or summaries to the campus vault
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800">
              Document File <span className="text-rose-500">*</span>
            </label>
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Click to select file or drag & drop here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PDF, Word (.docx), PowerPoint (.pptx) up to 50MB
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-2xs flex-shrink-0">
                    {selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. CSC 301 Past Exam Papers (2020-2024) with Marking Guide"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white font-medium"
            />
          </div>

          {/* Grid: Course & Material Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Course <span className="text-rose-500">*</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-slate-800"
              >
                <option value="">Select University Course</option>
                {(courses || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold text-slate-800"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Semester & Academic Exam Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
              >
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">Exam / Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>
          </div>

          {/* Description / Summary Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800">
              Description & Highlights <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={2}
              placeholder="e.g. Contains detailed worked solutions for Sections A and B with lecturer key tips..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white font-medium resize-none"
            />
          </div>

          {/* Live Progress Bar Section */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold flex items-center gap-2">
                  {uploadStage === 'complete' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {uploadStage === 'presigning' && 'Authorizing S3 Storage Key...'}
                  {uploadStage === 'uploading' && `Direct S3 Upload: ${uploadProgress}%`}
                  {uploadStage === 'saving' && 'Saving Catalog Metadata...'}
                  {uploadStage === 'complete' && 'Material Published Successfully!'}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Structured tenant storage path under university encrypted vault
              </p>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile || !title.trim() || !courseId}
            className="px-5 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Publish to Vault</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
