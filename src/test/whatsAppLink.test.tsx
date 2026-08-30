import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

// O menu foi reescrito SEM Radix porque um DropdownMenu por linha de tabela
// (centenas via "Mostrar mais") deixava o clique no número com 15-20s de
// atraso. Estes testes travam o comportamento do menu leve: abre no clique,
// mostra Pessoal/Business, abre o link certo e fecha.
describe('WhatsAppLink', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('mostra o número e não monta menu fechado', () => {
    const { getByText, queryByRole } = render(<WhatsAppLink phone="5511999990000" />);
    expect(getByText('5511999990000')).toBeTruthy();
    expect(queryByRole('menu')).toBeNull();
  });

  it('clique abre o menu com Pessoal e Business', () => {
    const { getByText, getByRole } = render(<WhatsAppLink phone="5511999990000" />);
    fireEvent.click(getByText('5511999990000'));
    expect(getByRole('menu')).toBeTruthy();
    expect(getByText('WhatsApp Pessoal')).toBeTruthy();
    expect(getByText('WhatsApp Business')).toBeTruthy();
  });

  it('escolher uma opção abre o wa.me (não-Android) e fecha o menu', () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { getByText, queryByRole } = render(<WhatsAppLink phone="55 (11) 99999-0000" />);
    fireEvent.click(getByText('55 (11) 99999-0000'));
    fireEvent.click(getByText('WhatsApp Pessoal'));
    expect(abrir).toHaveBeenCalledWith('https://wa.me/5511999990000', '_blank', 'noopener,noreferrer');
    expect(queryByRole('menu')).toBeNull();
  });

  it('Escape fecha o menu', () => {
    const { getByText, queryByRole } = render(<WhatsAppLink phone="5511999990000" />);
    fireEvent.click(getByText('5511999990000'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('menu')).toBeNull();
  });
});
