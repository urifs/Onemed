import { useEffect, useRef, useState } from 'react';
import type Mpegts from 'mpegts.js';
import { X, ChevronLeft, ChevronRight, Loader2, ExternalLink, Download, Printer, Gauge, Check, SquareStack, ClipboardList } from 'lucide-react';
import { useLessonStreamUrl } from '@/hooks/useLessonStream';
import { PdfViewer } from './PdfViewer';
import { OfficeViewer } from './OfficeViewer';
import { TxtViewer } from './TxtViewer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { downloadLesson } from '@/lib/lessonDownload';
import { openLessonInNewTab } from '@/lib/lessonOpen';
import { DownloadUpsellModal } from './DownloadUpsellModal';
import { useDownloadGate } from '@/hooks/useDownloadGate';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Lesson = Database['public']['Tables']['lessons']['Row'];

const PLAYBACK_RATES = [1, 1.5, 2, 3];
const PLAYBACK_RATE_STORAGE_KEY = 'onemed_playback_rate';

// Baixar vale para QUALQUER aula ou arquivo, vídeo incluso — só imprimir é
// que continua restrito ao que se lê. (Antes vídeo/áudio ficavam de fora
// daqui e só saíam pelo seletor em massa do Vitalício Pro, que não existe
// mais: agora todo mundo baixa, um de cada vez.)
const PRINTABLE_TYPES = ['pdf', 'image', 'doc', 'sheet', 'txt'];

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
  onGenerateFlashcards?: () => void;
  onGenerateQuestions?: () => void;
}

export function LessonPlayer({
  lesson, courseTitle, initialWatchedSeconds, onClose, onProgress, onPrev, onNext, hasPrev, hasNext,
  completed, onToggleCompleted, onGenerateFlashcards, onGenerateQuestions,
}: LessonPlayerProps) {
  const getUrl = useLessonStreamUrl();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const lastReported = useRef(0);
  const mediaRetries = useRef(0);
  // Aula bloqueada pela cota diária do Drive: para de tentar de novo e
  // preserva a explicação até o aluno trocar de aula.
  const quotaBlocked = useRef(false);
  const [imgRetryCount, setImgRetryCount] = useState(0);
  // Quando a aula está sem franquia no armazenamento de origem, o player
  // nativo não consegue tocar — mas o player oficial do Google, embutido,
  // consegue: ele usa o pipeline de PRÉ-VISUALIZAÇÃO, que é outro caminho e
  // não gasta a franquia de download. É o mesmo player que abre ao clicar no
  // arquivo no Drive.
  const [usarEmbed, setUsarEmbed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const { upsellOpen, setUpsellOpen, ensureCanDownload, reason: downloadReason, plan: downloadPlan } = useDownloadGate();
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
    quotaBlocked.current = false;
    setUsarEmbed(false);
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
    // Uma vez identificada a cota, nenhuma tentativa pendente pode voltar e
    // sobrescrever a explicação com a mensagem genérica.
    if (quotaBlocked.current) return;

    // Sonda só no primeiro erro: se for a propagação de permissão do Drive
    // (o caso comum), a resposta não é 429 e as tentativas seguem normais.
    if (src && mediaRetries.current === 0) {
      void quotaMessage(src).then(msg => {
        if (!msg) return;
        quotaBlocked.current = true;
        // Só há para onde cair se o arquivo ainda estiver no Drive de
        // origem. Aula já migrada para o nosso armazenamento não tem
        // drive_file_id útil — nesse caso a mensagem continua sendo a
        // resposta certa.
        if (lesson.drive_file_id && !lesson.storage_path) setUsarEmbed(true);
        else setError(msg);
      });
    }

    if (mediaRetries.current >= RETRY_DELAYS_MS.length) {
      setError('Não foi possível carregar este arquivo. Tente novamente em instantes.');
      return;
    }
    const delay = RETRY_DELAYS_MS[mediaRetries.current];
    mediaRetries.current += 1;
    setTimeout(() => {
      if (quotaBlocked.current) return;
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

  // Imprimir só faz sentido para o que se lê; baixar vale para tudo,
  // vídeo e áudio inclusive.
  const canPrint = PRINTABLE_TYPES.includes(lesson.type);

  // Abrir em outra aba é leitura — mesmo conteúdo que já toca aqui — então
  // não passa pelo porteiro do download.
  const handleOpenExternal = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await openLessonInNewTab(lesson);
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível abrir este arquivo em outra aba.');
    } finally {
      setOpening(false);
    }
  };

  const handleDownload = async () => {
    if (!ensureCanDownload()) return;
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadLesson(lesson);
    } catch (err) {
      console.error('Failed to download file', err);
      toast.error('Não foi possível baixar este arquivo.');
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
        <div className="flex items-center gap-2 mr-1">
          {canPrint && src && (
            <button
              onClick={handlePrint}
              title="Imprimir"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          {/* Não depende de `src`: o link de download é gerado na hora, então
              dá pra baixar mesmo que o vídeo não esteja tocando. */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Baixar"
            aria-label="Baixar"
            className="w-9 h-9 rounded-full bg-white/10 disabled:opacity-40 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          {/* Abrir numa aba nova, no visualizador do navegador. Também não
              depende de `src`: o link é gerado no clique. */}
          <button
            onClick={handleOpenExternal}
            disabled={opening}
            title="Abrir em outra aba"
            aria-label="Abrir em outra aba"
            className="w-9 h-9 rounded-full bg-white/10 disabled:opacity-40 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          </button>
          {onGenerateFlashcards && (
            <button
              onClick={onGenerateFlashcards}
              title="Gerar flashcards desta aula"
              aria-label="Gerar flashcards desta aula"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <SquareStack className="w-4 h-4" />
            </button>
          )}
          {onGenerateQuestions && (
            <button
              onClick={onGenerateQuestions}
              title="Gerar banco de questões desta aula"
              aria-label="Gerar banco de questões desta aula"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
            </button>
          )}
        </div>
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
        {usarEmbed && lesson.drive_file_id ? (
          // `rm=minimal` tira a barra de ferramentas do Drive e deixa só o
          // vídeo. O arquivo já é compartilhado por link, então o embed abre
          // sem pedir login — não estamos afrouxando nada aqui.
          <iframe
            src={`https://drive.google.com/file/d/${lesson.drive_file_id}/preview?rm=minimal`}
            title={lesson.title}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="w-full h-full rounded-lg border-0 bg-black"
          />
        ) : error ? (
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

      <DownloadUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} reason={downloadReason} plan={downloadPlan} />
    </div>
  );
}
