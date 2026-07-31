import { useEffect, useRef, useState } from 'react';
import type Mpegts from 'mpegts.js';
import { X, ChevronLeft, ChevronRight, Loader2, ExternalLink, Download, Printer, Gauge, Check } from 'lucide-react';
import { useLessonStreamUrl } from '@/hooks/useLessonStream';
import { PdfViewer } from './PdfViewer';
import { OfficeViewer } from './OfficeViewer';
import { TxtViewer } from './TxtViewer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { downloadFilenameFor } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Lesson = Database['public']['Tables']['lessons']['Row'];

const PLAYBACK_RATES = [1, 1.5, 2, 3];
const PLAYBACK_RATE_STORAGE_KEY = 'onemed_playback_rate';

// Vídeo/áudio ficam só em streaming (controlsList="nodownload") — mas
// documentos (pdf/imagem/planilha/doc/txt) são conteúdo pra consulta e
// impressão, então ganham download/impressão de verdade. (Vitalício Pro tem
// um caminho de download separado — o seletor em massa da CourseDetailPage —
// que libera vídeo/áudio também; isso aqui só rege o player avulso.)
// 'other' entra na lista porque é onde caem os materiais que não dá pra
// consumir dentro do navegador de jeito nenhum — baralho do Anki (.apkg),
// .epub, .zip: sem download eles são inúteis pro aluno.
const DOWNLOADABLE_TYPES = ['pdf', 'image', 'doc', 'sheet', 'txt', 'other'];

interface LessonPlayerProps {
  lesson: Lesson;
  courseTitle: string;
  initialWatchedSeconds?: number;
  onClose: () => void;
  onProgress: (lessonId: string, watchedSeconds: number, completed: boolean) => void;
  completed?: boolean;
  onToggleCompleted?: (completed: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function LessonPlayer({
  lesson, courseTitle, initialWatchedSeconds, onClose, onProgress, onPrev, onNext, hasPrev, hasNext,
  completed, onToggleCompleted,
}: LessonPlayerProps) {
  const getUrl = useLessonStreamUrl();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const lastReported = useRef(0);
  const mediaRetries = useRef(0);
  const [imgRetryCount, setImgRetryCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    const stored = Number(localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY));
    return PLAYBACK_RATES.includes(stored) ? stored : 1;
  });

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

  /**
   * Descobre POR QUE o <video> falhou.
   *
   * O elemento de mídia não conta: o evento `error` é o mesmo para 403, 502
   * e conexão caída. Refazendo a requisição dá pra ler o status que o worker
   * devolveu — em especial o 429, que ele usa só para a cota diária de
   * download do arquivo no Drive.
   *
   * Precisa ser `Range: bytes=0-` (aberto), igual ao que o navegador pede: o
   * Google só recusa quando o pedido é do arquivo todo, um range pequeno
   * passa mesmo com a cota estourada e daria um falso "está tudo bem". O
   * corpo é abortado assim que os cabeçalhos chegam, então nada é baixado.
   */
  const quotaMessage = async (url: string): Promise<string | null> => {
    const ctrl = new AbortController();
    try {
      const res = await fetch(url, { headers: { Range: 'bytes=0-' }, signal: ctrl.signal });
      if (res.status !== 429) return null;
      return (await res.text()).slice(0, 300);
    } catch {
      return null; // rede caiu no meio: trata como falha comum e tenta de novo
    } finally {
      ctrl.abort();
    }
  };

  const handleMediaError = () => {
    // Cota estourada não melhora tentando de novo — some com o "carregando"
    // e explica, em vez de insistir cinco vezes e mostrar um erro genérico.
    if (src) {
      void quotaMessage(src).then(msg => { if (msg) { mediaRetries.current = RETRY_DELAYS_MS.length; setError(msg); } });
    }
    if (mediaRetries.current >= RETRY_DELAYS_MS.length) {
      setError('Não foi possível carregar este arquivo. Tente novamente em instantes.');
      return;
    }
    const delay = RETRY_DELAYS_MS[mediaRetries.current];
    mediaRetries.current += 1;
    setTimeout(() => {
      if (mpegtsPlayerRef.current) {
        mpegtsPlayerRef.current.unload();
        mpegtsPlayerRef.current.load();
      } else {
        videoRef.current?.load();
      }
    }, delay);
  };

  // Arquivos .ts (MPEG Transport Stream — comuns nas aulas "#Aprenda") não
  // tocam num <video src> nativo em nenhum navegador principal: o container
  // em si não é suportado, mesmo com os codecs H.264/AAC de dentro (que
  // tocariam normal num .mp4). mpegts.js remuxa TS → fMP4 no próprio
  // navegador via MediaSource Extensions, reaproveitando a mesma URL
  // autenticada do worker de streaming (que já suporta Range) sem precisar
  // reprocessar o arquivo no servidor. Carregado sob demanda (import
  // dinâmico) — a grande maioria das aulas não é .ts e não deveria pagar
  // pelo peso dessa biblioteca no carregamento inicial do app.
  //
  // Detectar por `mime_type` sozinho não bastava: o mime que vem do Drive é o
  // que o Google adivinhou no upload, e ele erra em parte dos .ts — 134 aulas
  // (27 GB) da biblioteca estão gravadas como `text/texmacs`, não `video/mp2t`.
  // Essas caíam no <video> nativo e não tocavam, exatamente o sintoma que os
  // .ts já tinham antes da correção. A extensão do arquivo é o sinal confiável
  // aqui, então vale para os dois lados.
  const isTsVideo = lesson.type === 'video' &&
    (lesson.mime_type === 'video/mp2t' || /\.ts$/i.test(lesson.title || ''));
  const [mpegtsLib, setMpegtsLib] = useState<typeof Mpegts | null>(null);
  const mpegtsPlayerRef = useRef<Mpegts.Player | null>(null);

  useEffect(() => {
    if (!isTsVideo) { setMpegtsLib(null); return; }
    let alive = true;
    import('mpegts.js').then(mod => { if (alive) setMpegtsLib(mod.default); });
    return () => { alive = false; };
  }, [isTsVideo]);

  const useMpegts = isTsVideo && !!mpegtsLib?.isSupported();

  useEffect(() => {
    if (!src || !useMpegts || !mpegtsLib) return;
    const video = videoRef.current as HTMLVideoElement | null;
    if (!video) return;
    const player = mpegtsLib.createPlayer({ type: 'mpegts', url: src, isLive: false }, { enableWorker: true });
    mpegtsPlayerRef.current = player;
    player.attachMediaElement(video);
    player.load();
    player.on(mpegtsLib.Events.ERROR, handleMediaError);
    return () => {
      player.off(mpegtsLib.Events.ERROR, handleMediaError);
      player.detachMediaElement();
      player.destroy();
      mpegtsPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, useMpegts]);

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

  // Cada troca de aula recarrega o elemento <video>/<audio> com um src novo,
  // o que reseta playbackRate pra 1 em alguns navegadores — reaplica a
  // velocidade escolhida assim que os metadados do arquivo novo carregam.
  useEffect(() => {
    if (!src || (lesson.type !== 'video' && lesson.type !== 'audio')) return;
    const v = videoRef.current;
    if (!v) return;
    const applyRate = () => { v.playbackRate = playbackRate; };
    applyRate();
    v.addEventListener('loadedmetadata', applyRate);
    return () => v.removeEventListener('loadedmetadata', applyRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, lesson.type]);

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
  };

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
      a.download = downloadFilenameFor(lesson);
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
    // Chrome do player sempre escuro de propósito, independente do tema da
    // plataforma — convenção universal de players de vídeo/documento
    // (YouTube, Vimeo, Netflix), não bg-background/text-foreground.
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
        {/* Marcar como concluída direto do player. Vale pra qualquer tipo —
            vídeo se marca sozinho ao passar de 92%, mas apostila, imagem e
            planilha não tinham nenhuma forma de virar "concluída". */}
        {onToggleCompleted && (
          <button
            onClick={() => onToggleCompleted(!completed)}
            aria-pressed={!!completed}
            title={completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
            className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors mr-1 shrink-0 ${
              completed
                ? 'bg-accent-success text-white'
                : 'bg-white/10 hover:bg-white/15 text-white/80'
            }`}
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
              completed ? 'bg-white/25 border-white' : 'border-white/50'
            }`}>
              {completed && <Check className="w-3 h-3" strokeWidth={3} />}
            </span>
            <span className="hidden sm:inline">{completed ? 'Concluída' : 'Marcar concluída'}</span>
          </button>
        )}
        {(lesson.type === 'video' || lesson.type === 'audio') && src && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                title="Velocidade de reprodução"
                className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/15 flex items-center gap-1.5 text-white text-xs font-semibold transition-colors mr-1"
              >
                <Gauge className="w-4 h-4" /> {playbackRate}x
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-36 bg-[#161616] border-white/10 p-1.5">
              {PLAYBACK_RATES.map(rate => (
                <button
                  key={rate}
                  onClick={() => changePlaybackRate(rate)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    rate === playbackRate ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
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
        ) : isTsVideo && !mpegtsLib ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : lesson.type === 'video' ? (
          <video
            ref={videoRef}
            {...(useMpegts ? {} : { src })}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            autoPlay
            className="max-w-full max-h-full rounded-lg bg-black"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={useMpegts ? undefined : handleMediaError}
            onContextMenu={e => e.preventDefault()}
          />
        ) : lesson.type === 'pdf' ? (
          <PdfViewer url={src} title={lesson.title} lessonId={lesson.id} />
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
