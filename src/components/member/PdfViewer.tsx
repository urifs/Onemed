import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Mobile Chrome (and most mobile browsers) have no built-in PDF plugin for
// <iframe>/<embed> — they just offer a "download and open elsewhere" chip,
// which is what students were hitting. Rendering with pdf.js onto canvases
// gives a real in-page viewer that works the same on every browser.
export function PdfViewer({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ url }).promise;
        const containerWidth = container.clientWidth || 800;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.className = 'w-full h-auto shadow-lg mb-3 rounded';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx || cancelled) return;
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
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
    <div className="w-full h-full overflow-auto bg-[#525659] rounded-lg">
      {loading && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
          <p className="text-white/80 text-sm">{error}</p>
          <a
            href={url}
            download={title}
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            Baixar arquivo
          </a>
        </div>
      )}
      <div ref={containerRef} className="flex flex-col items-center p-3" />
    </div>
  );
}
