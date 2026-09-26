'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Download,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';

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

interface PdfPreviewModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (resource: ResourceItem) => void;
}

interface PreviewResponse {
  previewUrl: string;
  fileName?: string;
  mimeType?: string;
  title: string;
  course?: CourseItem;
  expiresIn: number;
}

export function PdfPreviewModal({
  resource,
  isOpen,
  onClose,
  onDownload,
}: PdfPreviewModalProps) {
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resource) {
      setPreviewData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .get(`/resources/${resource.id}/preview`)
      .then((res) => {
        if (!isMounted) return;
        setPreviewData(res.data?.data || res.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err.response?.data?.message || 'Unable to generate document preview link. Please try downloading directly.'
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, resource?.id]);

  if (!isOpen || !resource) return null;

  const isPdf =
    resource.type === 'PDF' ||
    resource.mimeType === 'application/pdf' ||
    resource.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                {resource.course?.code && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono">
                    📚 {resource.course.code}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {resource.category?.replace(/_/g, ' ') || 'Study Material'}
                </span>
                {resource.academicYear && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {resource.academicYear}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate mt-0.5">
                {resource.title}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            {previewData?.previewUrl && (
              <a
                href={previewData.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Open in standalone browser window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
            )}

            <button
              onClick={() => onDownload(resource)}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 bg-slate-100/50 p-4 sm:p-6 overflow-hidden flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-slate-800">
                  Retrieving secure inline document stream...
                </p>
                <p className="text-[11px] text-slate-400">
                  Authorizing temporary read access from encrypted campus vault
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-rose-200 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900">Preview Unavailable</h3>
                <p className="text-xs text-slate-500">{error}</p>
              </div>
              <button
                onClick={() => onDownload(resource)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File Directly</span>
              </button>
            </div>
          ) : isPdf && previewData?.previewUrl ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              <iframe
                src={`${previewData.previewUrl}#toolbar=1`}
                className="w-full h-full border-0"
                title={previewData.title || resource.title}
              />
            </div>
          ) : (
            <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  {resource.fileName?.split('.').pop()?.toUpperCase() || resource.type} Document
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{resource.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  In-browser direct rendering is optimized for PDF documents. Word (.docx) and presentation files can be downloaded directly to view on your device.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => onDownload(resource)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document ({resource.fileSize ? `${(resource.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Direct'})</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            MinIO S3 Encrypted Storage • Atomic Download Tracking
          </span>
          <span className="font-medium text-slate-500 font-mono">
            {resource.fileName || 'document.pdf'}
          </span>
        </div>
      </div>
    </div>
  );
}
