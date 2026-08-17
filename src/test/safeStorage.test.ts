import { describe, it, expect } from 'vitest';
import { createSafeStorage } from '@/lib/safeStorage';

// Simula um localStorage real cujo setItem pode passar a falhar no meio da
// sessão — o que acontece num aparelho com o armazenamento cheio (WebKit/iOS
// recusa escritas novas com QuotaExceededError, mas leituras e remoções
// continuam funcionando). Foi exatamente esse cenário que gerou o loop de
// refresh de token em produção (17/08): escrita caía na memória, leitura
// voltava do localStorage — o supabase-js relia o token ANTIGO e refazia o
// refresh ~8x/segundo até o rate limit derrubar a sessão.
function fakeLocalStorage() {
  const data = new Map<string, string>();
  const ls = {
    failWrites: false,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (ls.failWrites) throw new DOMException('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => { data.delete(k); },
    _raw: data,
  };
  return ls;
}

describe('createSafeStorage', () => {
  it('funciona como localStorage quando tudo vai bem', () => {
    const ls = fakeLocalStorage();
    const s = createSafeStorage(ls);
    s.setItem('token', 'v1');
    expect(s.getItem('token')).toBe('v1');
    expect(ls._raw.get('token')).toBe('v1');
    s.removeItem('token');
    expect(s.getItem('token')).toBeNull();
  });

  it('LÊ O QUE ESCREVEU mesmo quando o setItem passa a falhar no meio (a regra que evita o loop de refresh)', () => {
    const ls = fakeLocalStorage();
    const s = createSafeStorage(ls);
    // sessão gravada normalmente…
    s.setItem('sb-auth-token', 'token-antigo');
    // …e então o disco enche: toda escrita passa a ser recusada
    ls.failWrites = true;
    s.setItem('sb-auth-token', 'token-rotacionado');
    // a leitura DEVE devolver o valor novo — nunca o antigo do localStorage
    expect(s.getItem('sb-auth-token')).toBe('token-rotacionado');
    // e o token morto não pode sobrar no localStorage para um reload ressuscitar
    expect(ls._raw.get('sb-auth-token')).toBeUndefined();
  });

  it('volta a usar o localStorage quando as escritas voltam a funcionar', () => {
    const ls = fakeLocalStorage();
    const s = createSafeStorage(ls);
    ls.failWrites = true;
    s.setItem('k', 'na-memoria');
    expect(s.getItem('k')).toBe('na-memoria');
    ls.failWrites = false;
    s.setItem('k', 'de-volta-ao-disco');
    expect(s.getItem('k')).toBe('de-volta-ao-disco');
    expect(ls._raw.get('k')).toBe('de-volta-ao-disco');
  });

  it('removeItem apaga das duas camadas', () => {
    const ls = fakeLocalStorage();
    const s = createSafeStorage(ls);
    ls.failWrites = true;
    s.setItem('k', 'v');
    ls.failWrites = false;
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });

  it('sem localStorage nenhum (probe falha), vive só de memória sem quebrar', () => {
    const ls = fakeLocalStorage();
    ls.failWrites = true; // o probe de inicialização falha
    const s = createSafeStorage(ls);
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });
});
