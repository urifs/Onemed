import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const RETRY_DELAYS_MS = [1000, 2000, 3000];

export function TxtViewer({ url }: { url: string; title?: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);

    function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = await res.text();
          if (!cancelled) setText(body);
          return;
        } catch (err) {
          if (cancelled) return;
          if (attempt >= RETRY_DELAYS_MS.length) {
            console.error('Failed to load txt file', err);
            setError('Não foi possível abrir este arquivo.');
            return;
          }
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="w-full h-full overflow-auto bg-[#1e1e1e] rounded-lg p-5">
      {error ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-white/70 text-sm">{error}</p>
        </div>
      ) : text === null ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      ) : (
        <pre className="text-white/90 text-sm whitespace-pre-wrap break-words font-mono">{text}</pre>
      )}
    </div>
  );
}
