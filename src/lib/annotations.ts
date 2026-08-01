/**
 * Modelo das anotações que o aluno faz por cima do PDF.
 *
 * As apostilas das editoras vêm do Drive com a permissão de anotação
 * desligada no próprio arquivo (AES-256 + senha de proprietário, P=2580), e
 * todo leitor de PDF respeita isso. Então a anotação vive aqui: são dados do
 * aluno, guardados à parte, desenhados por cima na hora de exibir. O arquivo
 * original nunca é tocado.
 *
 * Os pontos são NORMALIZADOS (0..1 sobre a largura/altura da página), nunca em
 * pixels. É o que faz o traço cair sobre a mesma palavra no celular, no
 * desktop e em qualquer zoom — guardar pixel amarraria a anotação ao tamanho
 * de tela em que ela foi feita.
 */

export type AnnotationTool = 'pen' | 'highlight';

export interface AnnotationStroke {
  page: number;                 // 1-indexed, igual ao pdf.js
  tool: AnnotationTool;
  color: string;                // #rrggbb
  width: number;                // fração da largura da página (independe de tela)
  points: [number, number][];   // [[x, y], ...] em 0..1
}

export const PEN_COLORS = ['#ef4444', '#2563eb', '#16a34a', '#111827'] as const;
export const HIGHLIGHT_COLORS = ['#fde047', '#86efac', '#93c5fd', '#f9a8d4'] as const;

// Largura do traço como fração da largura da página. Marca-texto é ~8x mais
// grosso que a caneta, que é a proporção de uma caneta marca-texto real sobre
// uma esferográfica.
export const PEN_WIDTH = 0.0035;
export const HIGHLIGHT_WIDTH = 0.028;

/** Raio de captura da borracha, em fração da largura da página. */
const ERASER_RADIUS = 0.018;

/**
 * Desenha um traço no contexto 2D de uma página.
 * `w`/`h` são as dimensões em pixels da área de desenho daquela página.
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  w: number,
  h: number,
): void {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.width * w);

  if (stroke.tool === 'highlight') {
    // 'multiply' preserva o texto por baixo, como marca-texto de verdade.
    // Sem isso o grifo cobriria a palavra que o aluno quer justamente marcar.
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.45;
  }

  ctx.beginPath();
  const [x0, y0] = stroke.points[0];
  ctx.moveTo(x0 * w, y0 * h);

  if (stroke.points.length === 1) {
    // Toque único: um ponto, senão não marcaria nada na tela.
    ctx.lineTo(x0 * w + 0.01, y0 * h);
  } else {
    // Curva por pontos médios: sem isso o traço fica com quinas visíveis nos
    // eventos de ponteiro, que num desenho à mão livre parece serrilhado.
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const [px, py] = stroke.points[i];
      const [nx, ny] = stroke.points[i + 1];
      ctx.quadraticCurveTo(px * w, py * h, ((px + nx) / 2) * w, ((py + ny) / 2) * h);
    }
    const [lx, ly] = stroke.points[stroke.points.length - 1];
    ctx.lineTo(lx * w, ly * h);
  }

  ctx.stroke();
  ctx.restore();
}

/** Redesenha uma página inteira a partir da lista de traços. */
export function redrawPage(
  ctx: CanvasRenderingContext2D,
  strokes: AnnotationStroke[],
  page: number,
  w: number,
  h: number,
): void {
  ctx.clearRect(0, 0, w, h);
  for (const s of strokes) {
    if (s.page === page) drawStroke(ctx, s, w, h);
  }
}

/**
 * Remove os traços de uma página que passam perto do ponto apagado.
 * Devolve a lista nova (ou a mesma referência, se nada saiu — assim quem chama
 * consegue detectar "não mudou nada" sem comparar conteúdo).
 */
export function eraseAt(
  strokes: AnnotationStroke[],
  page: number,
  x: number,
  y: number,
  aspect: number,
): AnnotationStroke[] {
  const kept = strokes.filter(s => {
    if (s.page !== page) return true;
    return !s.points.some(([px, py]) => {
      const dx = px - x;
      // y é normalizado pela altura; multiplicar pelo aspecto traz os dois
      // eixos pra mesma escala, senão a borracha ficaria oval.
      const dy = (py - y) * aspect;
      return Math.hypot(dx, dy) <= ERASER_RADIUS;
    });
  });
  return kept.length === strokes.length ? strokes : kept;
}

/** Descarta pontos praticamente repetidos: menos dados, mesmo desenho. */
export function simplifyStroke(stroke: AnnotationStroke, minDistance = 0.002): AnnotationStroke {
  if (stroke.points.length <= 2) return stroke;
  const out: [number, number][] = [stroke.points[0]];
  for (let i = 1; i < stroke.points.length - 1; i++) {
    const [lx, ly] = out[out.length - 1];
    const [x, y] = stroke.points[i];
    if (Math.hypot(x - lx, y - ly) >= minDistance) out.push([x, y]);
  }
  out.push(stroke.points[stroke.points.length - 1]);
  return { ...stroke, points: out };
}
