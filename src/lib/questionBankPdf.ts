// Exporta um banco de questões para PDF com a identidade da OneMed: fundo
// branco, detalhes no vermelho da marca, logo e site no cabeçalho, questões
// numeradas e, ao final, o gabarito comentado (só o porquê da CORRETA).
//
// jsPDF entra por import dinâmico: o pacote só é baixado quando alguém
// exporta de fato — quem nunca usa não paga o peso no carregamento do app.

import type { BankQuestion } from '@/components/member/QuestionBankViewer';

const VERMELHO: [number, number, number] = [225, 29, 46];
const PRETO: [number, number, number] = [24, 24, 27];
const CINZA: [number, number, number] = [113, 113, 122];

const DIFF_LABEL: Record<string, string> = {
  basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

export async function exportQuestionBankPdf(bank: {
  title: string;
  difficulty: string;
  questions: BankQuestion[];
}): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGEM = 18;
  const LARGURA = PAGE_W - MARGEM * 2;
  let y = 0;

  // O ícone da plataforma (mesmo do PWA). Se não carregar, o wordmark segura
  // o cabeçalho sozinho — nunca falhar a exportação por causa do logo.
  let logo: string | null = null;
  try {
    const res = await fetch('/icons/admin-icon-192.png');
    if (res.ok) {
      const blob = await res.blob();
      logo = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
    }
  } catch { /* segue sem o ícone */ }

  const rodape = () => {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setDrawColor(...VERMELHO);
      doc.setLineWidth(0.4);
      doc.line(MARGEM, PAGE_H - 14, PAGE_W - MARGEM, PAGE_H - 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...VERMELHO);
      doc.text('onemedcursos.com.br', MARGEM, PAGE_H - 9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CINZA);
      doc.text(`Página ${p} de ${total}`, PAGE_W - MARGEM, PAGE_H - 9, { align: 'right' });
    }
  };

  const novaPagina = () => {
    doc.addPage();
    y = MARGEM;
  };

  const garanteEspaco = (altura: number) => {
    if (y + altura > PAGE_H - 20) novaPagina();
  };

  // ── cabeçalho da primeira página ────────────────────────────────────────
  doc.setFillColor(...VERMELHO);
  doc.rect(0, 0, PAGE_W, 3, 'F');
  y = 14;
  if (logo) {
    doc.addImage(logo, 'PNG', MARGEM, y, 12, 12);
  }
  const xTexto = logo ? MARGEM + 16 : MARGEM;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...VERMELHO);
  doc.text('OneMed', xTexto, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text('onemedcursos.com.br', xTexto, y + 11.5);
  y += 20;

  doc.setDrawColor(...VERMELHO);
  doc.setLineWidth(0.6);
  doc.line(MARGEM, y, PAGE_W - MARGEM, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRETO);
  const tituloLinhas = doc.splitTextToSize(`Banco de Questões — ${bank.title}`, LARGURA);
  doc.text(tituloLinhas, MARGEM, y);
  y += tituloLinhas.length * 6 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...CINZA);
  doc.text(
    `${bank.questions.length} questões · Nível ${DIFF_LABEL[bank.difficulty] || bank.difficulty} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    MARGEM, y,
  );
  y += 9;

  // ── questões ────────────────────────────────────────────────────────────
  bank.questions.forEach((q, qIdx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const enunciado = doc.splitTextToSize(q.front, LARGURA - 9);

    // Figura da questão (quando o banco veio de um PDF com imagens): entra
    // acima do enunciado, redimensionada pra caber. Falha no decode nunca
    // derruba a exportação — a questão sai só com o texto.
    let imgW = 0, imgH = 0;
    if (q.image) {
      try {
        const props = doc.getImageProperties(q.image);
        const ratio = props.height / props.width;
        imgW = Math.min(LARGURA - 9, 110);
        imgH = imgW * ratio;
        if (imgH > 80) { imgH = 80; imgW = imgH / ratio; }
      } catch { imgW = 0; imgH = 0; }
    }

    garanteEspaco(enunciado.length * 4.7 + (imgH ? imgH + 5 : 0) + 14);

    doc.setTextColor(...VERMELHO);
    doc.text(`${qIdx + 1}.`, MARGEM, y);
    if (q.image && imgH > 0) {
      try {
        doc.addImage(q.image, 'JPEG', MARGEM + 9, y - 3.5, imgW, imgH);
        y += imgH + 3;
      } catch { /* segue sem a figura */ }
    }
    doc.setTextColor(...PRETO);
    doc.text(enunciado, MARGEM + 9, y);
    y += enunciado.length * 4.7 + 2.5;

    (q.options || []).forEach((opt, oIdx) => {
      const letra = String.fromCharCode(65 + oIdx);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const linhas = doc.splitTextToSize(opt, LARGURA - 16);
      garanteEspaco(linhas.length * 4.4 + 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRETO);
      doc.text(`${letra})`, MARGEM + 6, y);
      doc.setFont('helvetica', 'normal');
      doc.text(linhas, MARGEM + 14, y);
      y += linhas.length * 4.4 + 1.6;
    });
    y += 5;
  });

  // ── gabarito comentado (página própria) ─────────────────────────────────
  novaPagina();
  doc.setFillColor(...VERMELHO);
  doc.rect(MARGEM, y, LARGURA, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GABARITO COMENTADO', MARGEM + 4, y + 6.2);
  y += 15;

  bank.questions.forEach((q, qIdx) => {
    const letra = String.fromCharCode(65 + (q.correct ?? 0));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const comentario = doc.splitTextToSize(q.back, LARGURA - 14);
    garanteEspaco(comentario.length * 4.4 + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...VERMELHO);
    doc.text(`${qIdx + 1}) ${letra}`, MARGEM, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...PRETO);
    doc.text(comentario, MARGEM + 14, y);
    y += comentario.length * 4.4 + 5;
  });

  rodape();

  const nome = bank.title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  doc.save(`${nome || 'banco-de-questoes'} - OneMed.pdf`);
}
