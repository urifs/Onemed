import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, RotateCcw } from 'lucide-react';

// Word/Excel (arquivo real ou Google Docs/Sheets nativo já exportado pro
// formato Office equivalente pelo Worker — ver cloudflare/stream-lesson) não
// tem motor de renderização nativo no navegador. O visualizador público da
// Microsoft busca a URL do lado do servidor deles e devolve um iframe
// renderizado — por isso a URL assinada (curta duração, sem exigir sessão)
// funciona bem aqui: qualquer um com o link consegue buscar, exatamente o
// que esse serviço precisa.
//
// O iframe é cross-origin: não dá pra ler se a Microsoft devolveu o documento
// ou uma página de erro. O que dá pra detectar é o serviço NÃO RESPONDER —
// sem este teto de espera, o aluno ficava olhando um spinner infinito sem
// nenhuma saída quando o visualizador caía.
const ESPERA_MAXIMA_MS = 25000;

export function OfficeViewer({ url, title }: { url: string; title?: string }) {
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [tick, setTick] = useState(0);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [loading, tick]);

  const tentarDeNovo = () => {
    setTimedOut(false);
    setLoading(true);
    setTick(t => t + 1);
  };

  if (timedOut) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#525659] rounded-lg px-6 text-center">
        <p className="text-white/80 text-sm max-w-sm">
          O visualizador de documentos não respondeu. Tente de novo — ou baixe o
          arquivo para abrir no seu computador.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={tentarDeNovo}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Tentar novamente
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Abrir em outra aba
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#525659]">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      )}
      <iframe
        key={tick}
        src={viewerUrl}
        title={title || 'Visualizador de documento'}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
