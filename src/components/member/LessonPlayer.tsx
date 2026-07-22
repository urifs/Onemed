import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, ExternalLink, Download, Printer } from 'lucide-react';
import { useLessonStreamUrl } from '@/hooks/useLessonStream';
import { PdfViewer } from './PdfViewer';
import { OfficeViewer } from './OfficeViewer';
import { TxtViewer } from './TxtViewer';
import type { Database } from '@/integrations/supabase/types';

type Lesson = Database['public']['Tables']['lessons']['Row'];

// Vídeo/áudio ficam só em streaming (controlsList="nodownload") — mas
// documentos (pdf/imagem/planilha/doc/txt) são conteúdo pra consulta e
// impressão, então ganham download/impressão de verdade.
const DOWNLOADABLE_TYPES = ['pdf', 'image', 'doc', 'sheet', 'txt'];

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  pdf: 'pdf', doc: 'docx', sheet: 'xlsx', txt: 'txt', image: 'jpg',
};

function fileExtensionFor(lesson: Lesson): string {
  return (lesson.mime_type && EXTENSION_BY_MIME[lesson.mime_type]) || EXTENSION_BY_TYPE[lesson.type] || 'bin';
}

function sanitizeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '').trim() || 'arquivo';
}

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
  const videoRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const lastReported = useRef(0);
  const mediaRetries = useRef(0);
  const [imgRetryCount, setImgRetryCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setError(null);
    lastReported.current = 0;
    mediaRetries.current = 0;
    setImgRetryCount(0);
    getUrl(lesson.id)
      .then(url => { if (alive) setSrc(url); })
      .catch(err => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [lesson.id, getUrl]);

  // A permissão do arquivo no Drive é concedida por trás, mas propaga pelos
  // servidores do Google em velocidades diferentes dependendo de onde a
  // requisição sai — a checagem que a Edge Function faz antes de devolver a
  // URL não garante que já propagou pro ponto de rede específico de onde o
  // navegador do aluno está acessando. Sem retry aqui, isso vira um erro de
  // CORS/403 visível bem na cara do aluno em vez de só demorar 1-2s a mais.
  const RETRY_DELAYS_MS = [2000, 3000, 5000, 8000, 13000];
  const handleMediaError = () => {
    if (mediaRetries.current >= RETRY_DELAYS_MS.length) {
      setError('Não foi possível carregar este arquivo. Tente novamente em instantes.');
      return;
    }
    const delay = RETRY_DELAYS_MS[mediaRetries.current];
    mediaRetries.current += 1;
    setTimeout(() => { videoRef.current?.load(); }, delay);
  };

  const handleImageError = () => {
    if (imgRetryCount >= RETRY_DELAYS_MS.length) {
      setError('Não foi possível carregar este arquivo. Tente novamente em instantes.');
      return;
    }
    setTimeout(() => setImgRetryCount(c => c + 1), RETRY_DELAYS_MS[imgRetryCount]);
  };

  useEffect(() => {
    if (!src || (lesson.type !== 'video' && lesson.type !== 'audio') || !initialWatchedSeconds) return;
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

  const canDownload = DOWNLOADABLE_TYPES.includes(lesson.type);

  const handleDownload = async () => {
    if (!src || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${sanitizeFilename(lesson.title)}.${fileExtensionFor(lesson)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download file', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!src) return;
    // doc/sheet (docx/xlsx) não têm renderizador nativo do navegador — o
    // visualizador do Office Online tem o próprio botão de imprimir na UI.
    if (lesson.type === 'doc' || lesson.type === 'sheet') {
      window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(src)}`, '_blank');
      return;
    }
    // Abre a aba já (gesto do clique) pra não cair no bloqueador de popup
    // enquanto o fetch do blob ainda está em andamento.
    const win = window.open('', '_blank');
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (!win) return;
      win.location.href = blobUrl;
      const tryPrint = () => { try { win.print(); } catch { /* ignore */ } };
      win.addEventListener('load', tryPrint);
      // Fallback: o visualizador nativo de PDF do navegador às vezes não
      // dispara 'load' no window pai.
      setTimeout(tryPrint, 1200);
    } catch (err) {
      console.error('Failed to open file for printing', err);
      win?.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] text-white/50 uppercase tracking-wide truncate">{courseTitle}</p>
          <p className="text-sm font-semibold text-white truncate">{lesson.title}</p>
        </div>
        <div className="flex-1" />
        {canDownload && src && (
          <div className="flex items-center gap-2 mr-1">
            <button
              onClick={handlePrint}
              title="Imprimir"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Baixar"
              className="w-9 h-9 rounded-full bg-white/10 disabled:opacity-40 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        )}
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
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            autoPlay
            className="max-w-full max-h-full rounded-lg bg-black"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={handleMediaError}
            onContextMenu={e => e.preventDefault()}
          />
        ) : lesson.type === 'pdf' ? (
          <PdfViewer url={src} title={lesson.title} />
        ) : lesson.type === 'doc' || lesson.type === 'sheet' ? (
          <OfficeViewer url={src} title={lesson.title} />
        ) : lesson.type === 'txt' ? (
          <TxtViewer url={src} title={lesson.title} />
        ) : lesson.type === 'image' ? (
          <img
            src={imgRetryCount > 0 ? `${src}&_r=${imgRetryCount}` : src}
            alt={lesson.title}
            className="max-w-full max-h-full rounded-lg object-contain"
            onError={handleImageError}
            onContextMenu={e => e.preventDefault()}
            draggable={false}
          />
        ) : lesson.type === 'audio' ? (
          <audio
            ref={videoRef as React.RefObject<HTMLAudioElement>}
            src={src}
            controls
            controlsList="nodownload"
            autoPlay
            className="w-full max-w-md"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={handleMediaError}
            onContextMenu={e => e.preventDefault()}
          />
        ) : (
          <div className="text-center">
            <p className="text-white/70 text-sm mb-4">Pré-visualização não disponível para este tipo de arquivo.</p>
            <a
              href={src} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Abrir em nova aba
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
