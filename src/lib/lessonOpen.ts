import { supabase } from '@/integrations/supabase/client';

/**
 * Abre a aula ou arquivo numa aba nova, no visualizador do próprio navegador.
 *
 * A aba é aberta ANTES de pedir o link — dentro do clique, quando o navegador
 * ainda considera a ação "iniciada pelo usuário". Se esperasse a resposta do
 * `member-lesson-token` para só então chamar `window.open`, o clique já não
 * seria recente e o bloqueador de pop-up mataria a aba (é o mesmo motivo pelo
 * qual o download usa iframe em vez de `window.open`).
 *
 * `opener` é zerado logo em seguida: sem isso a página aberta poderia navegar
 * a aba de origem por `window.opener.location`. Não dá pra usar a opção
 * `noopener` do `window.open` aqui porque com ela o retorno vem nulo, e é
 * justamente a referência da aba que precisamos guardar.
 */
export async function openLessonInNewTab(lesson: { id: string; title: string }): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  if (tab) {
    tab.opener = null;
    // Sem isto a aba fica em branco enquanto o link é gerado, o que parece
    // travamento numa conexão lenta.
    tab.document.write(
      `<!doctype html><meta charset="utf-8"><title>${lesson.title.replace(/[<>&]/g, '')}</title>`
      + '<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;'
      + 'font-family:system-ui,sans-serif;background:#0b0b0d;color:#a1a1aa">Abrindo…</body>',
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke('member-lesson-token', {
      body: { lessonId: lesson.id },
    });
    if (error || !data?.url) throw new Error(data?.error || 'Não foi possível gerar o link do arquivo');

    if (!tab) {
      throw new Error('Seu navegador bloqueou a nova aba. Libere os pop-ups deste site e tente de novo.');
    }
    // `replace` para a página em branco não virar uma entrada no histórico —
    // senão o "voltar" da aba nova cai num about:blank.
    tab.location.replace(data.url);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
