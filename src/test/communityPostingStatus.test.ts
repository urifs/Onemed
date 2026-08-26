import { describe, it, expect } from 'vitest';
import { postingBlockedMessage } from '@/lib/communityPosting';

// A mensagem do bloqueio é o que o aluno lê quando o servidor recusa o post —
// precisa distinguir pausa global de restrição individual, e restrição com
// prazo de restrição permanente.
describe('postingBlockedMessage', () => {
  it('liberado (ou status ainda não carregado) → sem mensagem', () => {
    expect(postingBlockedMessage(undefined)).toBeNull();
    expect(postingBlockedMessage({ allowed: true })).toBeNull();
  });

  it('pausa global → avisa que é temporário e da equipe', () => {
    const m = postingBlockedMessage({ allowed: false, reason: 'paused' })!;
    expect(m).toContain('temporariamente pausada');
    expect(m).toContain('equipe');
  });

  it('restrição com prazo → mostra até quando', () => {
    const m = postingBlockedMessage({ allowed: false, reason: 'restricted', until: '2026-08-27T12:00:00Z' })!;
    expect(m).toContain('suspensa até');
  });

  it('restrição permanente (until null) → sem data, aponta o suporte', () => {
    const m = postingBlockedMessage({ allowed: false, reason: 'restricted', until: null })!;
    expect(m).toContain('suspensa');
    expect(m).not.toContain('até ');
    expect(m).toContain('suporte');
  });
});
