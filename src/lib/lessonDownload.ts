import { supabase } from '@/integrations/supabase/client';
import { downloadFilenameFor, downloadUrlFor } from '@/lib/utils';

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
  const { data, error } = await supabase.functions.invoke('member-lesson-token', {
    body: { lessonId: lesson.id },
  });
  if (error || !data?.url) throw new Error(data?.error || 'Não foi possível gerar o link do arquivo');

  const url = downloadUrlFor(data.url, downloadFilenameFor(lesson));

  // `iframe` em vez de `<a download>` ou `window.open`: o atributo `download`
  // não vale entre origens diferentes, e `window.open` é bloqueado como popup
  // quando a chamada acima demora e o clique deixa de ser "recente" aos olhos
  // do navegador. Com Content-Disposition: attachment, o iframe não navega —
  // só dispara o download e some.
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = url;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120000);
}
