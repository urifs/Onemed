import { describe, it, expect } from 'vitest';
import { dataSP, nomeDeAba, rotuloStatus, montarPlanilhaDaLoja, type OrderRow } from '@/lib/storeExport';

const pedido = (over: Partial<OrderRow>): OrderRow => ({
  id: 'id-1',
  product_id: 'p1',
  product_name: 'MedReview 2026',
  email: 'aluno@exemplo.com',
  buyer_name: 'Aluno Teste',
  whatsapp: '5511999990000',
  buyer_plan: 'lifetime',
  price_paid: 49,
  status: 'approved',
  payment_id: '123456',
  external_reference: 'onemed_store_abc',
  created_at: '2026-08-19T18:30:00.000Z',
  paid_at: '2026-08-19T18:35:00.000Z',
  ...over,
});

describe('dataSP', () => {
  it('grava a hora de São Paulo, não a UTC', () => {
    // 19/08/2026 02:30 UTC = 18/08 23:30 em São Paulo (UTC-3).
    // Gravar o instante UTC faria a compra aparecer no dia SEGUINTE.
    const d = dataSP('2026-08-19T02:30:00.000Z')!;
    expect(d.toISOString()).toBe('2026-08-18T23:30:00.000Z');
  });

  it('devolve null para data ausente ou inválida', () => {
    expect(dataSP(null)).toBeNull();
    expect(dataSP('')).toBeNull();
    expect(dataSP('não é data')).toBeNull();
  });
});

describe('nomeDeAba', () => {
  it('corta em 31 caracteres — limite do Excel', () => {
    const nome = nomeDeAba('Um curso com um nome absurdamente longo que não cabe', new Set());
    expect(nome.length).toBeLessThanOrEqual(31);
  });

  it('remove os caracteres que o Excel proíbe em nome de aba', () => {
    expect(nomeDeAba('Extensivo: 2026/2027 [novo]', new Set())).not.toMatch(/[:\\/?*[\]]/);
  });

  it('desambigua nomes repetidos sem estourar o limite', () => {
    const usados = new Set<string>();
    const a = nomeDeAba('Curso X', usados);
    const b = nomeDeAba('Curso X', usados);
    const c = nomeDeAba('Curso X', usados);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(Math.max(a.length, b.length, c.length)).toBeLessThanOrEqual(31);
  });
});

describe('rotuloStatus', () => {
  it('traduz os status conhecidos e devolve o cru no desconhecido', () => {
    expect(rotuloStatus('approved')).toBe('Aprovado');
    expect(rotuloStatus('charged_back')).toBe('Estornado');
    expect(rotuloStatus('inventado')).toBe('inventado');
  });
});

describe('montarPlanilhaDaLoja', () => {
  const opts = {
    periodoLabel: 'Tudo',
    cursosLabel: 'Todos',
    statusLabel: 'Todos',
    baseDataLabel: 'Data da compra',
    umaAbaPorCurso: true,
    abaDeCompradores: true,
    planLabel: (p: string | null) => p || 'Sem plano',
  };

  it('gera um arquivo com as abas esperadas, uma por curso', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const buffer = await montarPlanilhaDaLoja([
      pedido({ id: 'a' }),
      pedido({ id: 'b', product_id: 'p2', product_name: 'SUPER COMBO', price_paid: 247.99 }),
      pedido({ id: 'c', status: 'pending', paid_at: null, price_paid: 49 }),
    ], opts);

    const lido = new ExcelJS.Workbook();
    await lido.xlsx.load(buffer);
    const abas = lido.worksheets.map(w => w.name);
    expect(abas).toContain('Resumo');
    expect(abas).toContain('Pedidos');
    expect(abas).toContain('Compradores');
    expect(abas).toContain('MedReview 2026');
    expect(abas).toContain('SUPER COMBO');

    // Pedidos: 3 linhas + cabeçalho + linha de total.
    // Depois de gravar e reabrir, a coluna só é acessível por ÍNDICE: a `key`
    // do exceljs vive em memória, não dentro do arquivo .xlsx.
    const pedidosWs = lido.getWorksheet('Pedidos')!;
    expect(pedidosWs.rowCount).toBe(5);
    // Só o que foi APROVADO entra no total: 49 + 247,99 (o pendente fica fora).
    expect(Number(pedidosWs.getRow(5).getCell(6).value)).toBeCloseTo(296.99, 2);
  });

  it('não cria abas por curso quando a opção está desligada', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const buffer = await montarPlanilhaDaLoja([pedido({})], {
      ...opts, umaAbaPorCurso: false, abaDeCompradores: false,
    });
    const lido = new ExcelJS.Workbook();
    await lido.xlsx.load(buffer);
    expect(lido.worksheets.map(w => w.name)).toEqual(['Resumo', 'Pedidos']);
  });

  it('agrupa o comprador por e-mail somando só os aprovados', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const buffer = await montarPlanilhaDaLoja([
      pedido({ id: 'a', price_paid: 49 }),
      pedido({ id: 'b', price_paid: 100, product_name: 'Outro' }),
      pedido({ id: 'c', price_paid: 999, status: 'cancelled' }),
    ], opts);
    const lido = new ExcelJS.Workbook();
    await lido.xlsx.load(buffer);
    const ws = lido.getWorksheet('Compradores')!;
    expect(ws.rowCount).toBe(2); // cabeçalho + 1 pessoa
    // E-mail | Nome | WhatsApp | Plano | Pedidos | Aprovados | Total pago | …
    expect(ws.getRow(2).getCell(5).value).toBe(3);
    expect(ws.getRow(2).getCell(6).value).toBe(2);
    expect(Number(ws.getRow(2).getCell(7).value)).toBeCloseTo(149, 2);
  });

  it('no Resumo, "compradores pagantes" conta PESSOA e não pedido', async () => {
    const ExcelJS = (await import('exceljs')).default;
    // Mesma pessoa comprando o mesmo curso 3x + um pendente de outra pessoa:
    // 1 pagante, 4 pedidos, 3 aprovados.
    const buffer = await montarPlanilhaDaLoja([
      pedido({ id: 'a', price_paid: 10 }),
      pedido({ id: 'b', price_paid: 10 }),
      pedido({ id: 'c', price_paid: 10 }),
      pedido({ id: 'd', email: 'outro@exemplo.com', status: 'pending', paid_at: null }),
    ], opts);
    const lido = new ExcelJS.Workbook();
    await lido.xlsx.load(buffer);
    const ws = lido.getWorksheet('Resumo')!;
    // Acha a linha do curso pelo nome, sem depender do número da linha.
    let linha = 0;
    ws.eachRow((row, n) => { if (row.getCell(1).value === 'MedReview 2026') linha = n; });
    expect(linha).toBeGreaterThan(0);
    const r = ws.getRow(linha);
    expect(r.getCell(2).value).toBe(1); // compradores pagantes (pessoas)
    expect(r.getCell(3).value).toBe(4); // pedidos (total)
    expect(r.getCell(4).value).toBe(3); // pedidos aprovados
    expect(r.getCell(5).value).toBe(1); // pendentes
  });
});
