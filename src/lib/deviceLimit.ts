// Último limite de telas conhecido da conta, guardado enquanto a pessoa está
// logada para poder ser LIDO depois que a sessão morre.
//
// Por que existe: o aviso de sessão encerrada (KickedOutModal) aparece
// justamente quando não há mais sessão — então ele não pode perguntar ao
// servidor quantas telas o plano dá. Sem esse valor, o texto ficava com o
// número escrito à mão ("2 dispositivos"), e quem paga o Vitalício Pro (6
// telas) lia que seu limite era 2.
//
// `null` = ilimitado (admin). `undefined`/ausente = ainda não sabemos, e aí a
// mensagem sai sem citar número nenhum — melhor não dizer do que mentir.
const CHAVE = 'om_device_limit';

export function lembrarLimiteDeTelas(limite: number | null | undefined): void {
  try {
    if (limite === undefined) return;
    localStorage.setItem(CHAVE, limite === null ? 'ilimitado' : String(limite));
  } catch {
    /* modo privado/armazenamento cheio: seguir sem lembrar é aceitável */
  }
}

export function limiteDeTelasLembrado(): number | null | undefined {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto === null) return undefined;
    if (bruto === 'ilimitado') return null;
    const n = parseInt(bruto, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}
