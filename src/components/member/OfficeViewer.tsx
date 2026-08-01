import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// Word/Excel (arquivo real ou Google Docs/Sheets nativo já exportado pro
// formato Office equivalente pelo Worker — ver cloudflare/stream-lesson) não
// tem motor de renderização nativo no navegador. O visualizador público da
// Microsoft busca a URL do lado do servidor deles e devolve um iframe
// renderizado — por isso a URL assinada (curta duração, sem exigir sessão)
// funciona bem aqui: qualquer um com o link consegue buscar, exatamente o
// que esse serviço precisa.
export function OfficeViewer({ url }: { url: string; title?: string }) {
  const [loading, setLoading] = useState(true);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div className="w-full h-full relative bg-white rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#525659]">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      )}
      <iframe
        src={viewerUrl}
        title="Visualizador de documento"
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
