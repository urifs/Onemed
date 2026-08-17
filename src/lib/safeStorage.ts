// Storage do cliente Supabase que NUNCA lança exceção e NUNCA perde coerência.
//
// Por que existe (dois incidentes reais):
//
// 1. Alguns iPads (principalmente institucionais/MDM) vêm com Navegação
//    Privada ou "Bloquear Todos os Cookies" ligados, e o acesso cru ao
//    `localStorage` LANÇA na hora. Como o GoTrueClient lê o storage ao
//    inicializar a sessão, o throw acontecia fora de qualquer try/catch e o
//    app congelava no spinner inicial para sempre.
//
// 2. ⚠️ Coerência leitura/escrita é OBRIGATÓRIA. A primeira versão testava o
//    localStorage só na inicialização: se um setItem falhasse DEPOIS (quota
//    cheia, iPhone sem espaço em disco — o WebKit passa a recusar escritas), o
//    valor novo ia pra memória mas o getItem continuava lendo o VALOR ANTIGO
//    do localStorage. Com o token de sessão isso vira desastre: o supabase-js
//    grava o refresh token rotacionado "na memória", relê o antigo do
//    localStorage e refaz o refresh em loop (~8/segundo — o GoTrue tolera
//    reuso do token por 10s de graça, então cada volta "funciona") até o rate
//    limit do servidor derrubar a sessão. O aluno, sozinho num único aparelho,
//    via o modal de "conta em outros 2 dispositivos" a cada login. Visto em
//    produção em 17/08 (iPhone/Chrome, 32 rotações em ~5s, nas duas contas que
//    o cliente testou).
//
// Regra: quem tem o valor mais NOVO de uma chave é quem responde a leitura
// dela. A memória só guarda chaves cujo último setItem falhou no localStorage;
// quando a escrita volta a funcionar, o localStorage reassume.
export function createSafeStorage(
  ls: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
) {
  const memory = new Map<string, string>();
  let localStorageOk = !!ls;
  try {
    const testKey = '__onemed_storage_test__';
    ls?.setItem(testKey, '1');
    ls?.removeItem(testKey);
  } catch {
    localStorageOk = false;
  }

  return {
    getItem(key: string) {
      // A memória só tem a chave quando o último setItem dela FALHOU no
      // localStorage — nesse caso ela é a versão mais nova, sempre.
      if (memory.has(key)) return memory.get(key)!;
      try {
        return localStorageOk ? ls!.getItem(key) : null;
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string) {
      if (localStorageOk) {
        try {
          ls!.setItem(key, value);
          memory.delete(key);
          return;
        } catch {
          // Escrita recusada (quota/disco cheio). Remove a cópia VELHA do
          // localStorage — remoção não aloca espaço e costuma passar mesmo com
          // a quota estourada — senão um reload voltaria a ler o token morto.
          try { ls!.removeItem(key); } catch { /* fica a memória como verdade */ }
        }
      }
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
      try {
        if (localStorageOk) ls!.removeItem(key);
      } catch { /* já saiu da memória */ }
    },
  };
}
