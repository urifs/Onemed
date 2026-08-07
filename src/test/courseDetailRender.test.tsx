import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Este teste existe por causa do incidente de 2026-08-07: um `useMemo` no
// CourseDetailPage referenciava `pendingProgress`/`flushPendingProgress`
// declarados ABAIXO dele, estourando TDZ ("can't access lexical declaration
// before initialization") já na 1ª renderização — e nem tsc nem build pegam
// isso. Renderizar o componente de verdade executa os useMemos no render e
// falha se o bug voltar.

// Mocks das dependências pesadas — o objetivo é só executar o corpo do
// componente (os hooks/useMemo), não testar comportamento.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => new Promise(() => {}) }) }) }),
    }),
    functions: { invoke: () => new Promise(() => {}) },
  },
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 't@t.com' } }) }));
vi.mock('@/hooks/useDownloadGate', () => ({ useDownloadGate: () => ({ upsellOpen: false, setUpsellOpen: () => {}, ensureCanDownload: () => true, reason: null, plan: null }) }));
vi.mock('@/hooks/useMemberStatus', () => ({ useMemberStatus: () => ({ plan: 'lifetime' }) }));
vi.mock('@/lib/lessonDownload', () => ({ downloadLesson: () => {} }));
vi.mock('@/lib/lessonOpen', () => ({ openLessonInNewTab: () => {} }));
vi.mock('@/lib/assistantContext', () => ({ setOpenLesson: () => {} }));
vi.mock('@/lib/courseCategories', () => ({ CATEGORY_ICON: {} }));

// Componentes filhos viram stubs pra não arrastar as próprias dependências.
// (stub inline em cada factory: vi.mock é içado pro topo, então não pode
// referenciar variável de escopo — foi o que quebrou a 1ª versão deste teste.)
vi.mock('@/components/member/MemberHeader', () => ({ MemberHeader: () => null }));
vi.mock('@/components/member/MemberSearchBar', () => ({ MemberSearchBar: () => null }));
vi.mock('@/components/member/CourseCover', () => ({ CourseCover: () => null }));
vi.mock('@/components/member/LessonPlayer', () => ({ LessonPlayer: () => null }));
vi.mock('@/components/member/CommunityTab', () => ({ CommunityTab: () => null }));
vi.mock('@/components/member/FlashcardGeneratorModal', () => ({ FlashcardGeneratorModal: () => null }));
vi.mock('@/components/member/FlashcardViewer', () => ({ FlashcardViewer: () => null }));
vi.mock('@/components/member/QuestionBankViewer', () => ({ QuestionBankViewer: () => null }));
vi.mock('@/components/member/DownloadUpsellModal', () => ({ DownloadUpsellModal: () => null }));
vi.mock('@/components/member/AiUpsellModal', () => ({ AiUpsellModal: () => null }));
vi.mock('@/components/member/CourseTree', () => ({ CourseTree: () => null }));

import CourseDetailPage from '@/pages/CourseDetailPage';

describe('CourseDetailPage — regressão do TDZ (incidente 2026-08-07)', () => {
  beforeEach(() => cleanup());

  it('renderiza sem estourar "before initialization" (TDZ dos hooks)', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/membros/curso/qualquer-slug']}>
          <CourseDetailPage />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
