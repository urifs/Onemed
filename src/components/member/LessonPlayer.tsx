import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { useLessonStreamUrl } from '@/hooks/useLessonStream';
import { PdfViewer } from './PdfViewer';
import type { Database } from '@/integrations/supabase/types';

type Lesson = Database['public']['Tables']['lessons']['Row'];

interface LessonPlayerProps {
  lesson: Lesson;
  courseTitle: string;
  initialWatchedSeconds?: number;
  onClose: () => void;
  onProgress: (lessonId: string, watchedSeconds: number, completed: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function LessonPlayer({
  lesson, courseTitle, initialWatchedSeconds, onClose, onProgress, onPrev, onNext, hasPrev, hasNext,
}: LessonPlayerProps) {
  const getUrl = useLessonStreamUrl();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReported = useRef(0);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setError(null);
    lastReported.current = 0;
    getUrl(lesson.id)
      .then(url => { if (alive) setSrc(url); })
      .catch(err => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [lesson.id, getUrl]);

  useEffect(() => {
    if (!src || lesson.type !== 'video' || !initialWatchedSeconds) return;
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      if (initialWatchedSeconds < v.duration - 5) v.currentTime = initialWatchedSeconds;
    };
    v.addEventListener('loadedmetadata', onLoaded, { once: true });
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, [src, lesson.type, initialWatchedSeconds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.floor(v.currentTime);
    if (Math.abs(t - lastReported.current) >= 5) {
      lastReported.current = t;
      onProgress(lesson.id, t, v.duration ? t / v.duration > 0.92 : false);
    }
  };

  const handleEnded = () => {
    const v = videoRef.current;
    onProgress(lesson.id, Math.floor(v?.duration || lastReported.current), true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex flex-col">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] text-white/50 uppercase tracking-wide truncate">{courseTitle}</p>
          <p className="text-sm font-semibold text-white truncate">{lesson.title}</p>
        </div>
        <div className="flex-1" />
        <div className="hidden sm:flex items-center gap-2">
          <button
            disabled={!hasPrev} onClick={onPrev}
            className="w-9 h-9 rounded-full bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!hasNext} onClick={onNext}
            className="w-9 h-9 rounded-full bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-3 md:p-6 min-h-0">
        {error ? (
          <p className="text-white/70 text-sm max-w-sm text-center">{error}</p>
        ) : !src ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : lesson.type === 'video' ? (
          <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg bg-black"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        ) : lesson.type === 'pdf' ? (
          <PdfViewer url={src} title={lesson.title} />
        ) : lesson.type === 'image' ? (
          <img src={src} alt={lesson.title} className="max-w-full max-h-full rounded-lg object-contain" />
        ) : (
          <div className="text-center">
            <p className="text-white/70 text-sm mb-4">Pré-visualização não disponível para este tipo de arquivo.</p>
            <a
              href={src} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Abrir arquivo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
