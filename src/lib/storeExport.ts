/**
 * Exportação da Loja para Excel (.xlsx).
 *
 * Uma planilha por finalidade, não uma tabela gigante: Resumo (o que foi
 * exportado e quanto entrou), Pedidos (a lista completa), Compradores (uma
 * linha por pessoa) e uma aba por curso. É o formato que se abre e já dá para
 * usar — filtro ligado, cabeçalho congelado, valor em moeda e data como DATA
 * de verdade, não texto.
 *
 * O `exceljs` entra por import DINÂMICO: são ~900 kB que só fazem sentido no
 * clique de exportar. Sem isso, todo admin que abre a Loja baixaria a
 * biblioteca inteira para talvez nunca exportar nada.
 */

export interface OrderRow {
  id: string;
  product_id: string | null;
  product_name: string;
  email: string;
  buyer_name: string | null;
  whatsapp: string | null;
  buyer_plan: string | null;
  price_paid: number;
  status: string;
  payment_id: string | null;
  external_reference: string;
  created_at: string;
  paid_at: string | null;
}

export interface ExportOptions {
  /** Rótulo do período aplicado, para constar no Resumo. */
  periodoLabel: string;
  /** Rótulo dos cursos escolhidos. */
  cursosLabel: string;
  /** Rótulo dos status escolhidos. */
  statusLabel: string;
  /** Qual data foi usada no filtro de período. */
  baseDataLabel: string;
  umaAbaPorCurso: boolean;
  abaDeCompradores: boolean;
  /** Tradução de plano → rótulo (vem de plans.ts, para não duplicar a tabela). */
  planLabel: (plan: string | null) => string;
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  rejected: 'Recusado',
  refunded: 'Reembolsado',
  charged_back: 'Estornado',
};

export const rotuloStatus = (s: string) => STATUS_LABEL[s] || s;

/**
 * Excel não guarda fuso horário: uma célula de data é um número que a planilha
 * mostra como está. Gravar o instante UTC faria uma compra das 21h em São Paulo
 * aparecer no dia seguinte. Aqui o horário de São Paulo é construído e rotulado
 * como se fosse UTC — assim o número bate com o que o painel mostra, e o
 * horário de verão histórico sai certo porque quem calcula o deslocamento é o
 * próprio `Intl`, no instante correto.
 */
export function dataSP(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // 'sv-SE' dá exatamente "YYYY-MM-DD HH:mm:ss".
  const local = d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const parsed = new Date(local.replace(' ', 'T') + 'Z');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const soData = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
const soHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false }) : '';

const MOEDA = 'R$ #,##0.00';
const DATA_HORA = 'dd/mm/yyyy hh:mm:ss';

/** Nome de aba do Excel: máximo 31 caracteres, sem : \ / ? * [ ] e único. */
export function nomeDeAba(bruto: string, usados: Set<string>): string {
  let base = (bruto || 'Curso').replace(/[:\\/?*[\]]/g, '-').trim().slice(0, 31) || 'Curso';
  let nome = base;
  let n = 2;
  while (usados.has(nome.toLowerCase())) {
    const sufixo = ` (${n++})`;
    nome = base.slice(0, 31 - sufixo.length) + sufixo;
  }
  usados.add(nome.toLowerCase());
  return nome;
}

const COLUNAS_PEDIDO = [
  { header: 'Curso / Produto', key: 'produto', width: 34 },
  { header: 'E-mail', key: 'email', width: 34 },
  { header: 'Nome', key: 'nome', width: 26 },
  { header: 'WhatsApp', key: 'whatsapp', width: 18 },
  { header: 'Plano na plataforma', key: 'plano', width: 20 },
  { header: 'Valor pago', key: 'valor', width: 14, numFmt: MOEDA },
  { header: 'Status', key: 'status', width: 13 },
  { header: 'Compra (data e hora)', key: 'compraDt', width: 21, numFmt: DATA_HORA },
  { header: 'Data da compra', key: 'compraData', width: 14 },
  { header: 'Hora da compra', key: 'compraHora', width: 14 },
  { header: 'Pagamento (data e hora)', key: 'pagoDt', width: 23, numFmt: DATA_HORA },
  { header: 'Data do pagamento', key: 'pagoData', width: 17 },
  { header: 'Hora do pagamento', key: 'pagoHora', width: 17 },
  { header: 'Nº da transação', key: 'transacao', width: 20 },
  { header: 'Referência externa', key: 'referencia', width: 42 },
  { header: 'ID do pedido', key: 'pedido', width: 38 },
];

function linhaDePedido(o: OrderRow, planLabel: ExportOptions['planLabel']) {
  return {
    produto: o.product_name,
    email: o.email,
    nome: o.buyer_name || '',
    // Sem apóstrofo o Excel trata "+55119..." como fórmula e mostra erro.
    whatsapp: o.whatsapp ? String(o.whatsapp) : '',
    plano: planLabel(o.buyer_plan),
    valor: Number(o.price_paid) || 0,
    status: rotuloStatus(o.status),
    compraDt: dataSP(o.created_at),
    compraData: soData(o.created_at),
    compraHora: soHora(o.created_at),
    pagoDt: dataSP(o.paid_at),
    pagoData: soData(o.paid_at),
    pagoHora: soHora(o.paid_at),
    transacao: o.payment_id || '',
    referencia: o.external_reference || '',
    pedido: o.id,
  };
}

/** Cabeçalho em negrito sobre fundo escuro, congelado e com filtro ligado. */
function vestirTabela(ws: any, colunas: typeof COLUNAS_PEDIDO) {
  ws.columns = colunas.map(c => ({ header: c.header, key: c.key, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F1D1D' } };
  head.alignment = { vertical: 'middle' };
  head.height = 20;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  colunas.forEach((c, i) => { if (c.numFmt) ws.getColumn(i + 1).numFmt = c.numFmt; });
}

function abaDePedidos(wb: any, nome: string, pedidos: OrderRow[], planLabel: ExportOptions['planLabel']) {
  const ws = wb.addWorksheet(nome);
  vestirTabela(ws, COLUNAS_PEDIDO);
  pedidos.forEach(o => ws.addRow(linhaDePedido(o, planLabel)));
  // Linha de total no fim, só do que foi efetivamente pago.
  const aprovados = pedidos.filter(p => p.status === 'approved');
  const total = aprovados.reduce((s, p) => s + (Number(p.price_paid) || 0), 0);
  const linha = ws.addRow({ produto: `TOTAL APROVADO (${aprovados.length} de ${pedidos.length})`, valor: total });
  linha.font = { bold: true };
  linha.getCell('valor').numFmt = MOEDA;
  return ws;
}

/**
 * Monta a planilha e devolve os bytes. Separado do download de propósito: é o
 * que permite gerar o arquivo num teste, reabrir e conferir célula a célula,
 * sem navegador no meio.
 */
export async function montarPlanilhaDaLoja(pedidos: OrderRow[], opts: ExportOptions): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OneMed';
  wb.created = new Date();

  // ── Resumo ────────────────────────────────────────────────────────────────
  const resumo = wb.addWorksheet('Resumo');
  resumo.columns = [
    { width: 34 }, { width: 21 }, { width: 15 }, { width: 17 }, { width: 17 },
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 21 }, { width: 21 },
  ];

  const titulo = resumo.addRow(['OneMed — Loja · Exportação']);
  titulo.font = { bold: true, size: 16 };
  resumo.addRow([]);
  const agora = new Date();
  ([
    ['Gerado em', agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })],
    ['Período', opts.periodoLabel],
    ['Data usada no filtro', opts.baseDataLabel],
    ['Cursos', opts.cursosLabel],
    ['Status incluídos', opts.statusLabel],
    ['Fuso das datas', 'America/Sao_Paulo'],
  ] as [string, string][]).forEach(([k, v]) => {
    const r = resumo.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  });

  const aprovados = pedidos.filter(p => p.status === 'approved');
  const receita = aprovados.reduce((s, p) => s + (Number(p.price_paid) || 0), 0);
  const compradores = new Set(pedidos.map(p => p.email.toLowerCase()));
  const compradoresPagantes = new Set(aprovados.map(p => p.email.toLowerCase()));

  resumo.addRow([]);
  const hTotais = resumo.addRow(['Totais']);
  hTotais.font = { bold: true, size: 13 };
  ([
    ['Pedidos exportados', pedidos.length],
    ['Aprovados', aprovados.length],
    ['Pendentes', pedidos.filter(p => p.status === 'pending').length],
    ['Cancelados / recusados', pedidos.filter(p => ['cancelled', 'rejected'].includes(p.status)).length],
    ['Estornados / reembolsados', pedidos.filter(p => ['refunded', 'charged_back'].includes(p.status)).length],
    ['Compradores distintos (todos os status)', compradores.size],
    ['Compradores distintos (aprovados)', compradoresPagantes.size],
  ] as [string, number][]).forEach(([k, v]) => {
    const r = resumo.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  });
  const rReceita = resumo.addRow(['Receita aprovada', receita]);
  rReceita.getCell(1).font = { bold: true };
  rReceita.getCell(2).numFmt = MOEDA;
  const rTicket = resumo.addRow(['Ticket médio (aprovados)', aprovados.length ? receita / aprovados.length : 0]);
  rTicket.getCell(1).font = { bold: true };
  rTicket.getCell(2).numFmt = MOEDA;

  // ── Resumo por curso ──────────────────────────────────────────────────────
  // Agrupa por product_id, com o NOME como chave alternativa: o pedido guarda
  // `product_name` no momento da compra, então um curso removido da loja
  // continua aparecendo aqui (com o histórico intacto) em vez de sumir.
  const porCurso = new Map<string, { nome: string; itens: OrderRow[] }>();
  for (const o of pedidos) {
    const chave = o.product_id || `nome:${o.product_name}`;
    if (!porCurso.has(chave)) porCurso.set(chave, { nome: o.product_name, itens: [] });
    porCurso.get(chave)!.itens.push(o);
  }
  const cursosOrdenados = [...porCurso.values()].sort((a, b) => {
    const ra = a.itens.filter(i => i.status === 'approved').reduce((s, i) => s + (Number(i.price_paid) || 0), 0);
    const rb = b.itens.filter(i => i.status === 'approved').reduce((s, i) => s + (Number(i.price_paid) || 0), 0);
    return rb - ra;
  });

  resumo.addRow([]);
  const hCursos = resumo.addRow(['Por curso']);
  hCursos.font = { bold: true, size: 13 };
  // "Compradores pagantes" é PESSOA distinta com pagamento aprovado; "Pedidos"
  // é linha. Os dois rótulos são explícitos de propósito: um número chamado só
  // "Pedidos" ao lado do nome do curso se lê como "compradores" e infla a
  // leitura — a loja tem mais checkout abandonado do que venda concluída.
  const cabCursos = resumo.addRow([
    'Curso / Produto', 'Compradores pagantes', 'Pedidos (total)', 'Pedidos aprovados',
    'Pedidos pendentes', 'Pedidos cancelados',
    'Receita aprovada', 'Ticket médio', 'Primeira venda', 'Última venda',
  ]);
  cabCursos.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabCursos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F1D1D' } };

  for (const c of cursosOrdenados) {
    const ap = c.itens.filter(i => i.status === 'approved');
    const rec = ap.reduce((s, i) => s + (Number(i.price_paid) || 0), 0);
    // "Venda" é o instante do PAGAMENTO quando ele existe; senão, o da compra.
    const instantes = ap.map(i => new Date(i.paid_at || i.created_at).getTime()).filter(n => !Number.isNaN(n));
    const primeira = instantes.length ? new Date(Math.min(...instantes)).toISOString() : null;
    const ultima = instantes.length ? new Date(Math.max(...instantes)).toISOString() : null;
    const r = resumo.addRow([
      c.nome,
      new Set(ap.map(i => i.email.toLowerCase())).size,
      c.itens.length,
      ap.length,
      c.itens.filter(i => i.status === 'pending').length,
      c.itens.filter(i => ['cancelled', 'rejected'].includes(i.status)).length,
      rec,
      ap.length ? rec / ap.length : 0,
      dataSP(primeira),
      dataSP(ultima),
    ]);
    r.getCell(7).numFmt = MOEDA;
    r.getCell(8).numFmt = MOEDA;
    r.getCell(9).numFmt = DATA_HORA;
    r.getCell(10).numFmt = DATA_HORA;
  }

  // ── Todos os pedidos ──────────────────────────────────────────────────────
  abaDePedidos(wb, 'Pedidos', pedidos, opts.planLabel);

  // ── Compradores (uma linha por pessoa) ────────────────────────────────────
  if (opts.abaDeCompradores) {
    const ws = wb.addWorksheet('Compradores');
    const colunas = [
      { header: 'E-mail', key: 'email', width: 34 },
      { header: 'Nome', key: 'nome', width: 26 },
      { header: 'WhatsApp', key: 'whatsapp', width: 18 },
      { header: 'Plano na plataforma', key: 'plano', width: 20 },
      { header: 'Pedidos', key: 'pedidos', width: 10 },
      { header: 'Aprovados', key: 'aprovados', width: 11 },
      { header: 'Total pago', key: 'total', width: 14, numFmt: MOEDA },
      { header: 'Primeira compra', key: 'primeira', width: 21, numFmt: DATA_HORA },
      { header: 'Última compra', key: 'ultima', width: 21, numFmt: DATA_HORA },
      { header: 'Cursos comprados', key: 'cursos', width: 60 },
    ];
    vestirTabela(ws, colunas as typeof COLUNAS_PEDIDO);

    const porEmail = new Map<string, OrderRow[]>();
    for (const o of pedidos) {
      const k = o.email.toLowerCase();
      if (!porEmail.has(k)) porEmail.set(k, []);
      porEmail.get(k)!.push(o);
    }
    const linhas = [...porEmail.entries()].map(([email, itens]) => {
      const ap = itens.filter(i => i.status === 'approved');
      // "Compra" aqui é a compra CONCLUÍDA: só aprovados, e no instante do
      // PAGAMENTO quando ele existe — mesmo critério de "Primeira/Última
      // venda" do quadro por curso. Sobre todos os pedidos, um checkout
      // aberto e nunca pago virava a "última compra" da pessoa, e quem só
      // tem pendente ganhava data de compra sem ter comprado nada.
      const instantes = ap.map(i => new Date(i.paid_at || i.created_at).getTime()).filter(n => !Number.isNaN(n));
      return {
        email,
        nome: itens.find(i => i.buyer_name)?.buyer_name || '',
        whatsapp: itens.find(i => i.whatsapp)?.whatsapp || '',
        plano: opts.planLabel(itens.find(i => i.buyer_plan)?.buyer_plan ?? null),
        pedidos: itens.length,
        aprovados: ap.length,
        total: ap.reduce((s, i) => s + (Number(i.price_paid) || 0), 0),
        primeira: instantes.length ? dataSP(new Date(Math.min(...instantes)).toISOString()) : null,
        ultima: instantes.length ? dataSP(new Date(Math.max(...instantes)).toISOString()) : null,
        cursos: [...new Set(ap.map(i => i.product_name))].join(' · '),
      };
    }).sort((a, b) => b.total - a.total);
    linhas.forEach(l => ws.addRow(l));
  }

  // ── Uma aba por curso ─────────────────────────────────────────────────────
  if (opts.umaAbaPorCurso) {
    const usados = new Set(['resumo', 'pedidos', 'compradores']);
    for (const c of cursosOrdenados) {
      abaDePedidos(wb, nomeDeAba(c.nome, usados), c.itens, opts.planLabel);
    }
  }

  return await wb.xlsx.writeBuffer() as ArrayBuffer;
}

export async function exportStoreToExcel(pedidos: OrderRow[], opts: ExportOptions): Promise<void> {
  const buffer = await montarPlanilhaDaLoja(pedidos, opts);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onemed-loja-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  // Revogar na hora corta o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
