import { describe, expect, it } from 'vitest';
import { eraseAt, simplifyStroke, type AnnotationStroke } from '@/lib/annotations';

const stroke = (over: Partial<AnnotationStroke> = {}): AnnotationStroke => ({
  page: 1, tool: 'pen', color: '#ef4444', width: 0.0035,
  points: [[0.5, 0.5], [0.52, 0.5]], ...over,
});

describe('eraseAt', () => {
  it('remove o traço quando a borracha passa por cima', () => {
    const out = eraseAt([stroke()], 1, 0.5, 0.5, 1.4);
    expect(out).toHaveLength(0);
  });

  it('mantém traço distante do ponto apagado', () => {
    const s = [stroke()];
    expect(eraseAt(s, 1, 0.1, 0.1, 1.4)).toBe(s); // mesma referência = nada mudou
  });

  it('não apaga traço de outra página', () => {
    const s = [stroke({ page: 2 })];
    expect(eraseAt(s, 1, 0.5, 0.5, 1.4)).toBe(s);
  });

  it('leva o aspecto da página em conta para a borracha não ficar oval', () => {
    // Mesma distância em unidades normalizadas, mas no eixo Y de uma página
    // alta (aspecto 1.4) a distância real é maior — deve sobreviver.
    const vertical = [stroke({ points: [[0.5, 0.5 + 0.015]] })];
    expect(eraseAt(vertical, 1, 0.5, 0.5, 1.4)).toBe(vertical);
    // O mesmo deslocamento no eixo X cai dentro do raio e é apagado.
    const horizontal = [stroke({ points: [[0.5 + 0.015, 0.5]] })];
    expect(eraseAt(horizontal, 1, 0.5, 0.5, 1.4)).toHaveLength(0);
  });
});

describe('simplifyStroke', () => {
  it('descarta pontos praticamente repetidos', () => {
    const dense = stroke({
      points: [[0, 0], [0.0001, 0], [0.0002, 0], [0.5, 0.5]],
    });
    expect(simplifyStroke(dense).points.length).toBeLessThan(dense.points.length);
  });

  it('preserva sempre o primeiro e o último ponto', () => {
    const s = stroke({ points: [[0, 0], [0.0001, 0], [1, 1]] });
    const out = simplifyStroke(s);
    expect(out.points[0]).toEqual([0, 0]);
    expect(out.points[out.points.length - 1]).toEqual([1, 1]);
  });

  it('não mexe em traço curto', () => {
    const s = stroke({ points: [[0, 0], [1, 1]] });
    expect(simplifyStroke(s)).toBe(s);
  });
});
