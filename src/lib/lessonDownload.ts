import { supabase } from '@/integrations/supabase/client';
import { downloadFilenameFor, downloadUrlFor, extractFunctionErrorMessage } from '@/lib/utils';

export type DownloadableLesson = {
  id: string;
  title: string;
  type: string;
  mime_type?: string | null;
};

/**
 * Baixa uma aula ou arquivo com o nome exato que aparece na plataforma.
 *
 * Usado tanto pelo ícone de download na lista (baixar sem abrir) quanto pelo
 * botão dentro do player — o comportamento tem que ser o mesmo nos dois.
 *
 * O link de streaming é de curta duração e só sai autenticado, por isso é
 * gerado na hora, a cada download, em vez de guardado.
 *
 * O download em si é uma navegação comum para a URL, não um `fetch` + blob:
 * assim o navegador escreve direto no disco e uma aula de 1,5 GB não precisa
 * caber na memória da aba. Quem define o nome do arquivo é o
 * `Content-Disposition` que a URL de download pede (ver `downloadUrlFor`).
 */
export async function downloadLesson(lesson: DownloadableLesson): Promise<void> {
  // `intent: 'download'` não é decoração: o servidor só assina a permissão de
  // salvar em disco quando o plano permite (aula em vídeo é exclusiva do
  // Vitalício Pro). Sem esse pedido explícito volta uma URL só de streaming, e
  // o Worker ignora o `dl` — o arquivo abre inline em vez de baixar.
  const { data, error } = await supabase.functions.invoke('member-lesson-token', {
    body: { lessonId: lesson.id, intent: 'download' },
  });
  if (error || !data?.url) {
    throw new Error(await extractFunctionErrorMessage(error, data?.error || 'Não foi possível gerar o link do arquivo'));
  }

  await startFileDownload(downloadUrlFor(data.url, downloadFilenameFor(lesson)));
}

/**
 * Dispara o download de uma URL já assinada, com uma checagem prévia de vida.
 *
 * `iframe` em vez de `<a download>` ou `window.open`: o atributo `download`
 * não vale entre origens diferentes, e `window.open` é bloqueado como popup
 * quando a geração do link demora e o clique deixa de ser "recente" aos olhos
 * do navegador. Com Content-Disposition: attachment, o iframe não navega —
 * só dispara o download e some.
 *
 * O problema do iframe é que ele ENGOLE qualquer erro: um 403 de link vencido
 * ou o 429 de limite diário apareciam como um clique que "não fez nada". A
 * sonda de 1 byte abaixo lê o status real antes — e o trecho baixado fica no
 * cache do worker, então o download de verdade não paga nada a mais. Falha de
 * REDE na sonda não bloqueia: o iframe ainda pode conseguir.
 */
export async function startFileDownload(url: string): Promise<void> {
  let recusa: string | null = null;
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    if (!res.ok && res.status !== 206) {
      recusa = (await res.text().catch(() => '')).slice(0, 300)
        || `O servidor recusou o download (erro ${res.status}). Tente novamente em instantes.`;
    }
  } catch { /* falha de rede/CORS na sonda: o iframe ainda pode conseguir */ }
  if (recusa) throw new Error(recusa);

  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = url;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120000);
}
