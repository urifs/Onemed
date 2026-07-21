import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Mobile Chrome (and most mobile browsers) have no built-in PDF plugin for
// <iframe>/<embed> — they just offer a "download and open elsewhere" chip,
// which is what students were hitting. Rendering with pdf.js onto canvases
// gives a real in-page viewer that works the same on every browser.
export function PdfViewer({ url }: { url: string; title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mesmo motivo do retry em LessonPlayer.tsx: a permissão "qualquer um com
  // o link" recém-concedida no Drive não propaga instantaneamente pra todos
  // os pontos de rede do Google, então a primeira tentativa de buscar o PDF
  // a partir do navegador do aluno pode falhar mesmo com a Edge Function já
  // tendo confirmado acesso do lado dela. Tenta de novo com backoff antes de
  // desistir.
  const RETRY_DELAYS_MS = [2000, 3000, 5000, 8000, 13000];

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    setLoading(true);
    setError(null);

    function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    (async () => {
      let pdf;
      for (let attempt = 0; ; attempt++) {
        try {
          pdf = await pdfjsLib.getDocument({ url }).promise;
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
        const containerWidth = container.clientWidth || 800;
        // Canvas backing-store resolution defaults to 1 pixel per CSS pixel —
        // on a phone with devicePixelRatio 2-3x, a page fit to the container
        // width in "regular" pixels gets stretched across 2-3x as many
        // physical pixels, which is exactly the blur reported. Render at
        // devicePixelRatio (floored at 1.5 so even standard displays stay
        // crisp) and let CSS scale it back down to the same display size.
        const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 3);
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.className = 'shadow-lg mb-3 rounded';
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const ctx = canvas.getContext('2d');
          if (!ctx || cancelled) return;
          container.appendChild(canvas);
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
            transform: [outputScale, 0, 0, outputScale, 0, 0],
          }).promise;
          if (pageNum === 1 && !cancelled) setLoading(false);
        }
      } catch (err) {
        console.error('Failed to render PDF', err);
        if (!cancelled) {
          setError('Não foi possível abrir este arquivo.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  return (
    <div
      className="w-full h-full overflow-auto bg-[#525659] rounded-lg"
      onContextMenu={e => e.preventDefault()}
    >
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
  );
}
