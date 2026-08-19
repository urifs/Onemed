import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Check, Eraser, Highlighter, Loader2, Pen, RotateCcw, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  HIGHLIGHT_COLORS, HIGHLIGHT_WIDTH, PEN_COLORS, PEN_WIDTH,
  drawStroke, eraseAt, redrawPage, simplifyStroke,
  type AnnotationStroke, type AnnotationTool,
} from '@/lib/annotations';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type Mode = AnnotationTool | 'erase' | null;

/** Espera antes de gravar, para não fazer uma escrita por traço. */
const AUTOSAVE_MS = 1200;

// Mobile Chrome (and most mobile browsers) have no built-in PDF plugin for
// <iframe>/<embed> — they just offer a "download and open elsewhere" chip,
// which is what students were hitting. Rendering with pdf.js onto canvases
// gives a real in-page viewer that works the same on every browser.
//
// Sobre a camada de anotação: as apostilas das editoras vêm do Drive com a
// permissão de anotar desligada dentro do próprio arquivo (AES-256 + senha de
// proprietário, P=2580), então nenhum leitor de PDF de terceiro deixa grifar.
// Aqui o aluno desenha num canvas por cima; os traços são dados dele, guardados
// em `lesson_annotations`. O PDF original não é alterado em momento nenhum.
export function PdfViewer({ url, lessonId }: { url: string; title?: string; lessonId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const canAnnotate = !!lessonId && !!user;
  const [mode, setMode] = useState<Mode>(null);
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0]);
  const [highlightColor, setHighlightColor] = useState<string>(HIGHLIGHT_COLORS[0]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [strokeCount, setStrokeCount] = useState(0);

  // O desenho acontece fora do ciclo do React (pointermove dispara dezenas de
  // vezes por segundo); o estado que o handler precisa ler mora em ref.
  const strokesRef = useRef<AnnotationStroke[]>([]);
  const overlaysRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const modeRef = useRef<Mode>(null);
  const penColorRef = useRef(penColor);
  const highlightColorRef = useRef(highlightColor);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { penColorRef.current = penColor; }, [penColor]);
  useEffect(() => { highlightColorRef.current = highlightColor; }, [highlightColor]);

  const avisouFalhaDeSave = useRef(false);
  const persist = useCallback(async () => {
    if (!lessonId || !user) return;
    setSaveState('saving');
    const { error: err } = await supabase.from('lesson_annotations').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      strokes: strokesRef.current,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: 'user_id,lesson_id' });
    if (err) {
      // Continua pendente: o próximo traço (ou o flush ao fechar) tenta de
      // novo. E avisa UMA vez por sequência de falhas — perder grifos em
      // silêncio era pior que o toast.
      dirtyRef.current = true;
      setSaveState('idle');
      if (!avisouFalhaDeSave.current) {
        avisouFalhaDeSave.current = true;
        toast.error('Não foi possível salvar suas anotações agora. Elas continuam na tela e serão salvas na próxima tentativa.');
      }
      return;
    }
    avisouFalhaDeSave.current = false;
    dirtyRef.current = false;
    setSaveState('saved');
    setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 2000);
  }, [lessonId, user]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setStrokeCount(strokesRef.current.length);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, AUTOSAVE_MS);
  }, [persist]);

  // Grava o que estiver pendente ao fechar a aula ou sair da página — senão o
  // último traço antes de fechar se perderia.
  useEffect(() => {
    const flush = () => { if (dirtyRef.current) persist(); };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flush();
    };
  }, [persist]);

  // Zoom por CSS, sem re-renderizar o PDF: as páginas já são pintadas em alta
  // resolução (devicePixelRatio) e escaladas por estilo — diminuir a largura
  // exibida mantém a nitidez e mostra mais área de uma vez. As anotações não
  // desalinham: os traços são normalizados (0..1) e o ponteiro é lido contra
  // o rect NA TELA, que encolhe junto.
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  const applyZoom = useCallback((z: number) => {
    zoomRef.current = z;
    const container = containerRef.current;
    if (!container) return;
    for (const wrapper of Array.from(container.children) as HTMLElement[]) {
      const baseW = Number(wrapper.dataset.baseW || 0);
      const baseH = Number(wrapper.dataset.baseH || 0);
      if (!baseW || !baseH) continue;
      const w = Math.round(baseW * z);
      const h = Math.round(baseH * z);
      wrapper.style.width = `${w}px`;
      wrapper.style.height = `${h}px`;
      for (const canvas of Array.from(wrapper.querySelectorAll('canvas')) as HTMLElement[]) {
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
    }
  }, []);

  const changeZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.min(1.5, Math.max(0.5, Math.round((prev + delta) * 10) / 10));
      applyZoom(next);
      return next;
    });
  };

  const redrawAll = useCallback(() => {
    for (const [page, canvas] of overlaysRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) redrawPage(ctx, strokesRef.current, page, canvas.width, canvas.height);
    }
  }, []);

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    redrawAll();
    scheduleSave();
  };

  const clearAll = () => {
    if (strokesRef.current.length === 0) return;
    if (!window.confirm('Apagar todas as suas anotações deste arquivo?')) return;
    strokesRef.current = [];
    redrawAll();
    scheduleSave();
  };

  // ─── carrega anotações salvas ────────────────────────────────────────────
  useEffect(() => {
    if (!lessonId || !user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('lesson_annotations')
        .select('strokes')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      const loaded = (data as { strokes?: unknown } | null)?.strokes;
      strokesRef.current = Array.isArray(loaded) ? (loaded as AnnotationStroke[]) : [];
      setStrokeCount(strokesRef.current.length);
      redrawAll();
    })();
    return () => { alive = false; };
  }, [lessonId, user, redrawAll]);

  // ─── renderiza o PDF ─────────────────────────────────────────────────────
  const RETRY_DELAYS_MS = [2000, 3000, 5000, 8000, 13000];

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    overlaysRef.current.clear();
    setLoading(true);
    setError(null);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    function attachDrawing(overlay: HTMLCanvasElement, pageNum: number) {
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      let current: AnnotationStroke | null = null;

      const pointOf = (e: PointerEvent): [number, number] => {
        const r = overlay.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
      };

      const eraseFrom = (x: number, y: number) => {
        const aspect = overlay.height / overlay.width;
        const next = eraseAt(strokesRef.current, pageNum, x, y, aspect);
        if (next !== strokesRef.current) {
          strokesRef.current = next;
          redrawPage(ctx, strokesRef.current, pageNum, overlay.width, overlay.height);
          scheduleSave();
        }
      };

      overlay.addEventListener('pointerdown', (e: PointerEvent) => {
        const m = modeRef.current;
        if (!m) return;
        overlay.setPointerCapture(e.pointerId);
        const [x, y] = pointOf(e);

        if (m === 'erase') { eraseFrom(x, y); return; }

        current = {
          page: pageNum,
          tool: m,
          color: m === 'pen' ? penColorRef.current : highlightColorRef.current,
          width: m === 'pen' ? PEN_WIDTH : HIGHLIGHT_WIDTH,
          points: [[x, y]],
        };
      });

      overlay.addEventListener('pointermove', (e: PointerEvent) => {
        const m = modeRef.current;
        if (!m) return;
        const [x, y] = pointOf(e);

        if (m === 'erase') {
          if (e.buttons === 0) return;
          eraseFrom(x, y);
          return;
        }

        if (!current) return;
        current.points.push([x, y]);
        // Repinta a página e por cima o traço em andamento: mantém o desenho
        // fluido sem acumular resíduo do frame anterior.
        redrawPage(ctx, strokesRef.current, pageNum, overlay.width, overlay.height);
        drawStroke(ctx, current, overlay.width, overlay.height);
      });

      const finish = () => {
        if (!current) return;
        strokesRef.current = [...strokesRef.current, simplifyStroke(current)];
        current = null;
        redrawPage(ctx, strokesRef.current, pageNum, overlay.width, overlay.height);
        scheduleSave();
      };
      overlay.addEventListener('pointerup', finish);
      overlay.addEventListener('pointercancel', finish);
    }

    // Guardado fora da IIFE pra poder destruir no cleanup: o pdf.js mantém
    // recursos do worker (páginas/fontes) vivos até destroy(). Trocar de aula
    // sem isto vazava um documento + páginas renderizadas a cada troca.
    let pdfDoc: any = null;
    let observer: IntersectionObserver | null = null;

    // Uma página renderizada em devicePixelRatio custa dezenas de MB de canvas
    // — pintar TODAS de uma vez estourava a memória do celular nas apostilas
    // grandes (centenas de páginas) e derrubava a aba. Aqui cada página nasce
    // como um placeholder do tamanho exato (o scroll não pula) e só ganha
    // pixels quando se aproxima da tela; ao se afastar, os pixels são
    // devolvidos (backing store zerado). As anotações moram em `strokesRef` e
    // são repintadas na volta — nada se perde ao liberar a página.
    type PageState = {
      pageNum: number;
      // Resolvido SOB DEMANDA: manter um proxy de página do pdf.js para cada
      // página (com a lista de operadores que ele guarda dentro) mantinha o
      // teto de memória proporcional ao total de páginas — exatamente o que
      // esta virtualização existe para evitar numa apostila de centenas.
      page: any | null;
      viewport: any;
      canvas: HTMLCanvasElement;
      overlay: HTMLCanvasElement | null;
      rendered: boolean;
      rendering: boolean;
    };
    const pageStates = new Map<number, PageState>();

    const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 3);
    // Largura de referência do visualizador. Declarada aqui, ACIMA de
    // renderPage, porque a função a usa para recalcular o viewport da página
    // que está materializando (regra do projeto: nada de referência a algo
    // declarado abaixo).
    const larguraBase = container.clientWidth || 800;

    async function renderPage(st: PageState) {
      if (st.rendered || st.rendering || cancelled) return;
      st.rendering = true;
      try {
        const ctx = st.canvas.getContext('2d');
        if (!ctx) return;
        if (!st.page) st.page = await pdfDoc.getPage(st.pageNum);
        if (cancelled) return;
        // Viewport da página REAL (o do setup é o da primeira, usado só para
        // reservar espaço): páginas em paisagem renderizam na proporção certa.
        st.viewport = st.page.getViewport({ scale: larguraBase / st.page.getViewport({ scale: 1 }).width });
        st.canvas.width = Math.floor(st.viewport.width * outputScale);
        st.canvas.height = Math.floor(st.viewport.height * outputScale);
        await st.page.render({
          canvasContext: ctx,
          viewport: st.viewport,
          canvas: st.canvas,
          transform: [outputScale, 0, 0, outputScale, 0, 0],
        }).promise;
        if (cancelled) return;
        if (st.overlay) {
          st.overlay.width = st.canvas.width;
          st.overlay.height = st.canvas.height;
          const octx = st.overlay.getContext('2d');
          if (octx) redrawPage(octx, strokesRef.current, st.pageNum, st.overlay.width, st.overlay.height);
        }
        st.rendered = true;
        if (st.pageNum === 1) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error(`Failed to render PDF page ${st.pageNum}`, err);
          // A 1ª página falhando não pode prender o spinner pra sempre.
          if (st.pageNum === 1) setLoading(false);
        }
      } finally {
        st.rendering = false;
      }
    }

    function releasePage(st: PageState) {
      if (!st.rendered || st.rendering) return;
      // width=0 devolve o backing store — o wrapper mantém o tamanho, então o
      // layout e a posição do scroll não mexem.
      st.canvas.width = 0;
      st.canvas.height = 0;
      if (st.overlay) { st.overlay.width = 0; st.overlay.height = 0; }
      // cleanup() libera a lista de operadores que o pdf.js guarda na página;
      // sem soltar o proxy, o canvas voltava mas a página seguia ocupando.
      try { st.page?.cleanup?.(); } catch { /* já liberada */ }
      st.page = null;
      st.rendered = false;
    }

    (async () => {
      let pdf;
      for (let attempt = 0; ; attempt++) {
        try {
          pdf = await pdfjsLib.getDocument({ url }).promise;
          pdfDoc = pdf;
          break;
        } catch (err) {
          if (cancelled) return;
          if (attempt >= RETRY_DELAYS_MS.length) {
            console.error('Failed to load PDF after retries', err);
            setError('Não foi possível abrir este arquivo. Tente novamente em instantes.');
            setLoading(false);
            return;
          }
          await sleep(RETRY_DELAYS_MS[attempt]);
          if (cancelled) return;
        }
      }

      try {
        // Renderiza quando a página entra na janela de ~2 telas; libera ao
        // sair dela. root = o elemento que de fato rola (o pai overflow-auto).
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            const st = pageStates.get(Number((entry.target as HTMLElement).dataset.page));
            if (!st) continue;
            if (entry.isIntersecting) void renderPage(st);
            else releasePage(st);
          }
        }, { root: container.parentElement, rootMargin: '1800px 0px' });

        // A PRIMEIRA página dá a proporção usada para reservar o espaço de
        // todas: buscar as N páginas aqui só para medir era justamente o que
        // segurava um proxy do pdf.js por página na memória. Páginas de tamanho
        // diferente (raro em apostila) se ajustam ao renderizar de verdade.
        const primeira = await pdf.getPage(1);
        const escalaPadrao = larguraBase / primeira.getViewport({ scale: 1 }).width;
        const viewportPadrao = primeira.getViewport({ scale: escalaPadrao });

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = pageNum === 1 ? primeira : null;
          const viewport = viewportPadrao;

          // Wrapper posicionado: o canvas do PDF embaixo e o de anotação em
          // cima, exatamente do mesmo tamanho.
          const wrapper = document.createElement('div');
          wrapper.className = 'relative mb-3 shadow-lg rounded overflow-hidden bg-white/5';
          wrapper.dataset.baseW = String(viewport.width);
          wrapper.dataset.baseH = String(viewport.height);
          wrapper.dataset.page = String(pageNum);
          const z = zoomRef.current;
          wrapper.style.width = `${Math.round(viewport.width * z)}px`;
          wrapper.style.height = `${Math.round(viewport.height * z)}px`;
          container.appendChild(wrapper);

          // Canvas SEM backing store (0×0) até o observer mandar renderizar.
          const canvas = document.createElement('canvas');
          canvas.width = 0;
          canvas.height = 0;
          canvas.style.width = `${Math.round(viewport.width * z)}px`;
          canvas.style.height = `${Math.round(viewport.height * z)}px`;
          wrapper.appendChild(canvas);

          let overlay: HTMLCanvasElement | null = null;
          if (canAnnotate) {
            overlay = document.createElement('canvas');
            overlay.width = 0;
            overlay.height = 0;
            overlay.style.width = canvas.style.width;
            overlay.style.height = canvas.style.height;
            overlay.className = 'absolute inset-0';
            // Sem ferramenta ativa o overlay é transparente a cliques: o aluno
            // rola e seleciona texto como antes. Só ao escolher caneta ou
            // marca-texto ele passa a capturar o ponteiro. (modeRef, não
            // 'none' fixo: a página pode materializar com a caneta já ativa.)
            overlay.style.pointerEvents = modeRef.current ? 'auto' : 'none';
            overlay.style.touchAction = 'none';
            wrapper.appendChild(overlay);
            overlaysRef.current.set(pageNum, overlay);
            attachDrawing(overlay, pageNum);
          }

          pageStates.set(pageNum, { pageNum, page, viewport, canvas, overlay, rendered: false, rendering: false });
          observer.observe(wrapper);
        }
      } catch (err) {
        console.error('Failed to render PDF', err);
        if (!cancelled) {
          setError('Não foi possível abrir este arquivo.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      // Libera worker/páginas do pdf.js (guardado com try: destroy pode
      // rejeitar se o load ainda estava em curso).
      try { pdfDoc?.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, canAnnotate]);

  // Liga/desliga a captura de ponteiro conforme a ferramenta escolhida.
  useEffect(() => {
    for (const overlay of overlaysRef.current.values()) {
      overlay.style.pointerEvents = mode ? 'auto' : 'none';
      overlay.style.cursor = mode === 'erase' ? 'cell' : mode ? 'crosshair' : 'default';
    }
  }, [mode]);

  const colors = mode === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS;
  const activeColor = mode === 'highlight' ? highlightColor : penColor;
  const setActiveColor = mode === 'highlight' ? setHighlightColor : setPenColor;

  return (
    <div className="w-full h-full flex flex-col bg-[#525659] rounded-lg overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-2.5 py-2 bg-black/40 border-b border-white/10">
          {/* zoom: diminuir mostra mais área da página de uma vez */}
          <ToolButton onClick={() => changeZoom(-0.1)} label="Diminuir zoom" disabled={zoom <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </ToolButton>
          <button
            onClick={() => { setZoom(1); applyZoom(1); }}
            title="Restaurar zoom"
            className="text-[11px] tabular-nums text-white/70 hover:text-white w-10 text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolButton onClick={() => changeZoom(0.1)} label="Aumentar zoom" disabled={zoom >= 1.5}>
            <ZoomIn className="w-4 h-4" />
          </ToolButton>

          {canAnnotate && (<>
          <span className="w-px h-5 bg-white/15 mx-1" />
          <ToolButton active={mode === 'pen'} onClick={() => setMode(m => (m === 'pen' ? null : 'pen'))} label="Caneta">
            <Pen className="w-4 h-4" />
          </ToolButton>
          <ToolButton active={mode === 'highlight'} onClick={() => setMode(m => (m === 'highlight' ? null : 'highlight'))} label="Marca-texto">
            <Highlighter className="w-4 h-4" />
          </ToolButton>
          <ToolButton active={mode === 'erase'} onClick={() => setMode(m => (m === 'erase' ? null : 'erase'))} label="Borracha">
            <Eraser className="w-4 h-4" />
          </ToolButton>

          {(mode === 'pen' || mode === 'highlight') && (
            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/15">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  aria-label={`Cor ${c}`}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    activeColor === c ? 'border-white scale-110' : 'border-white/30'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {saveState === 'saving' && (
              <span className="text-[11px] text-white/60 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> salvando
              </span>
            )}
            {saveState === 'saved' && (
              <span className="text-[11px] text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> salvo
              </span>
            )}
            <ToolButton onClick={undo} label="Desfazer" disabled={strokeCount === 0}>
              <RotateCcw className="w-4 h-4" />
            </ToolButton>
            <ToolButton onClick={clearAll} label="Apagar tudo" disabled={strokeCount === 0}>
              <Trash2 className="w-4 h-4" />
            </ToolButton>
          </div>
          </>)}
        </div>

      <div className="flex-1 overflow-auto" onContextMenu={e => e.preventDefault()}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <p className="text-white/80 text-sm">{error}</p>
          </div>
        )}
        <div ref={containerRef} className="flex flex-col items-center p-3" />
      </div>
    </div>
  );
}

function ToolButton({
  children, onClick, active, label, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
        active ? 'bg-primary text-primary-foreground'
          : disabled ? 'text-white/25'
            : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
