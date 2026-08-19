import { describe, it, expect } from 'vitest';
import { courseYear, isCourseDoAnoDaVitrine, ANO_DA_VITRINE } from '@/lib/utils';

// A vitrine da área de membros (banner rotativo) só anuncia a turma do ano, e
// o ano só existe no TÍTULO do curso — não há coluna para ele. Se esta leitura
// errar, ou o banner esvazia ou volta a anunciar turma velha.
describe('ano do curso a partir do título', () => {
  it('lê o ano dos títulos reais da biblioteca', () => {
    expect(courseYear('MEDCURSO 2026')).toBe(2026);
    expect(courseYear('Extensivo Medcof 2025')).toBe(2025);
    expect(courseYear('MED 2026')).toBe(2026);
    expect(courseYear('Anatomia [MuscleFLIX]')).toBeNull();
  });

  it('com dois anos no título, vale a turma mais nova', () => {
    expect(courseYear('Extensivo 2025/2026')).toBe(2026);
    expect(courseYear('Revalida 2026 - material 2024')).toBe(2026);
  });

  it('não confunde número solto com ano', () => {
    // Casos que existem na biblioteca: "R3", "+5mil", "2º Edição", "TEPs".
    expect(courseYear('Cirurgia R3')).toBeNull();
    expect(courseYear('Livros +5mil')).toBeNull();
    expect(courseYear('Clínica 2º Edição')).toBeNull();
    // 3 dígitos ou 5 dígitos não são ano.
    expect(courseYear('Sala 202')).toBeNull();
    expect(courseYear('Questões 20261')).toBeNull();
  });

  it('título vazio ou nulo não quebra', () => {
    expect(courseYear(null)).toBeNull();
    expect(courseYear(undefined)).toBeNull();
    expect(courseYear('')).toBeNull();
  });

  it('só a turma do ano da vitrine entra no banner', () => {
    expect(isCourseDoAnoDaVitrine(`Medcel ${ANO_DA_VITRINE}`)).toBe(true);
    expect(isCourseDoAnoDaVitrine('Medcel 2025')).toBe(false);
    expect(isCourseDoAnoDaVitrine('Medcel')).toBe(false);
  });
});
