import { describe, it, expect, beforeEach } from 'vitest';
import { lembrarLimiteDeTelas, limiteDeTelasLembrado } from '@/lib/deviceLimit';

// O aviso de sessão encerrada lê esse valor DEPOIS que a sessão morreu, então
// o que estiver guardado é a única fonte do número mostrado ao aluno. Errar
// aqui é o bug que fez um Vitalício Pro (6 telas) ler "2 dispositivos".
describe('memória do limite de telas', () => {
  beforeEach(() => localStorage.clear());

  it('sem nada guardado devolve undefined (mensagem sai sem número)', () => {
    expect(limiteDeTelasLembrado()).toBeUndefined();
  });

  it('guarda e devolve o limite do plano', () => {
    lembrarLimiteDeTelas(6);
    expect(limiteDeTelasLembrado()).toBe(6);
  });

  it('admin (ilimitado) volta como null, nunca como número', () => {
    lembrarLimiteDeTelas(null);
    expect(limiteDeTelasLembrado()).toBeNull();
  });

  it('undefined não sobrescreve o que já era conhecido', () => {
    lembrarLimiteDeTelas(4);
    lembrarLimiteDeTelas(undefined);
    expect(limiteDeTelasLembrado()).toBe(4);
  });

  it('valor corrompido no armazenamento não vira número inválido', () => {
    localStorage.setItem('om_device_limit', 'abc');
    expect(limiteDeTelasLembrado()).toBeUndefined();
    localStorage.setItem('om_device_limit', '0');
    expect(limiteDeTelasLembrado()).toBeUndefined();
  });

  it('acompanha a mudança de plano (upgrade 2 -> 6)', () => {
    lembrarLimiteDeTelas(2);
    lembrarLimiteDeTelas(6);
    expect(limiteDeTelasLembrado()).toBe(6);
  });
});
