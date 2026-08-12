import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React from 'react';

// Regressão do incidente 2026-08-07: ao reverter o code-splitting do PdfViewer,
// o import de `Suspense` foi removido mas o JSX `<Suspense>…</Suspense>` em
// volta do PdfViewer ficou órfão — "ReferenceError: Suspense is not defined"
// derrubava a aula (tipo PDF) na área de membros. tsc pega esse tipo de erro,
// mas este teste é a rede de segurança em runtime: monta o LessonPlayer de
// VERDADE, resolve a URL (o branch do tipo só renderiza com `src`) e reprova
// qualquer ReferenceError ao renderizar QUALQUER tipo de aula.

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => new Promise(() => {}) }) }) }),
    functions: { invoke: () => new Promise(() => {}) },
    auth: { getSession: () => new Promise(() => {}) },
  },
}));
vi.mock('@/hooks/useLessonStream', () => ({
  useLessonStreamUrl: () => () => Promise.resolve('blob:teste'),
}));
vi.mock('@/hooks/useDownloadGate', () => ({
  useDownloadGate: () => ({
    upsellOpen: false, setUpsellOpen: () => {},
    ensureCanDownload: () => true, reason: null, plan: null,
  }),
}));
// Viewers pesados viram stubs (pdf.js/office/txt quebram no jsdom por motivo
// alheio ao bug). O que importa é o corpo do LessonPlayer e a AVALIAÇÃO do
// branch JSX de cada tipo — é ali que morava o <Suspense> órfão.
vi.mock('@/components/member/PdfViewer', () => ({ PdfViewer: () => null }));
vi.mock('@/components/member/OfficeViewer', () => ({ OfficeViewer: () => null }));
vi.mock('@/components/member/TxtViewer', () => ({ TxtViewer: () => null }));
vi.mock('@/components/member/DownloadUpsellModal', () => ({ DownloadUpsellModal: () => null }));
vi.mock('mpegts.js', () => ({ default: { isSupported: () => false, createPlayer: () => ({}) } }));

import { LessonPlayer } from '@/components/member/LessonPlayer';

// Captura erros de render (o crash do <Suspense> órfão acontecia no commit,
// dentro do act — sem boundary, viraria "unhandled" e o teste passaria falso).
class Boundary extends React.Component<
  { onError: (e: Error) => void; children: React.ReactNode },
  { dead: boolean }
> {
  state = { dead: false };
  static getDerivedStateFromError() { return { dead: true }; }
  componentDidCatch(e: Error) { this.props.onError(e); }
  render() { return this.state.dead ? null : this.props.children; }
}

const baseLesson = (type: string, extra: Record<string, unknown> = {}) => ({
  id: 'l1', course_id: 'c1', module_id: 'm1', title: 'Aula', type,
  drive_file_id: 'drv1', storage_path: null, mime_type: null,
  sort_order: 0, duration_seconds: null, created_at: '', updated_at: '',
  ...extra,
}) as never;

const TYPES = ['video', 'pdf', 'doc', 'sheet', 'txt', 'image', 'audio'];

describe('LessonPlayer — regressão de render por tipo (incidente Suspense 2026-08-07)', () => {
  beforeEach(() => {
    cleanup();
    // fetch é usado por sondarFalha (mídia) — sem stub, dispara cascata de
    // retries com setTimeout que prendem o `act`. Aqui rejeita na hora; o
    // unmount logo em seguida cancela qualquer timer agendado.
    vi.stubGlobal('fetch', () => Promise.reject(new Error('sem rede no teste')));
  });

  for (const type of TYPES) {
    it(`tipo "${type}" renderiza sem ReferenceError`, async () => {
      const erros: Error[] = [];
      const { unmount } = render(
        <Boundary onError={e => erros.push(e)}>
          <LessonPlayer
            lesson={baseLesson(type)}
            courseTitle="Curso"
            onClose={() => {}}
            onProgress={() => {}}
          />
        </Boundary>,
      );
      // Deixa o getUrl resolver e o setSrc re-renderizar — é ESSE re-render
      // que avalia o branch JSX do tipo (ex: PDF → <Suspense> órfão). Não uso
      // `act`: para vídeo/áudio ele fica preso esperando os efeitos de mídia
      // (play()/error do jsdom) assentarem, e aqui só quero observar um erro
      // de render. O aviso de "act" no console é inofensivo pro que se testa.
      await new Promise(r => setTimeout(r, 0));
      unmount();
      const referro = erros.find(
        e => e.name === 'ReferenceError' ||
          /is not defined|before initialization|Cannot access/i.test(e.message),
      );
      expect(referro?.message ?? 'nenhum', `ReferenceError no tipo ${type}`).toBe('nenhum');
    });
  }
});
