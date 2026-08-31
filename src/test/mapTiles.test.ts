import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { MAP_TILES } from '@/components/admin/MapBaseLayers';

// A CARTO passou a exigir chave e carimba "API KEY REQUIRED" DENTRO do tile,
// respondendo HTTP 200 — ou seja, o mapa quebra na TELA sem quebrar em lugar
// nenhum do código. Estes testes são o que sobra de defesa.
describe('tiles do mapa do painel', () => {
  it('usa a ordem do Esri ({z}/{y}/{x}), não a da maioria dos provedores', () => {
    // Trocar y por x entrega o pedaço errado do mundo em cada quadrado, calado.
    for (const tema of Object.values(MAP_TILES)) {
      expect(tema.base).toMatch(/\{z\}\/\{y\}\/\{x\}$/);
      expect(tema.labels).toMatch(/\{z\}\/\{y\}\/\{x\}$/);
    }
  });

  it('tem base E rótulos nos dois temas — a base do Esri não traz nomes', () => {
    expect(MAP_TILES.dark.base).toContain('World_Dark_Gray_Base');
    expect(MAP_TILES.dark.labels).toContain('World_Dark_Gray_Reference');
    expect(MAP_TILES.light.base).toContain('World_Light_Gray_Base');
    expect(MAP_TILES.light.labels).toContain('World_Light_Gray_Reference');
  });

  it('nenhum arquivo do src volta a apontar para a CARTO', () => {
    const culpados: string[] = [];
    const varre = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) varre(caminho);
        else if (/\.(ts|tsx)$/.test(nome) && !nome.endsWith('mapTiles.test.ts')) {
          const txt = readFileSync(caminho, 'utf8');
          // O comentário do MapBaseLayers cita "CARTO" para explicar a saída;
          // o que não pode voltar é a URL dos tiles.
          if (txt.includes('cartocdn.com')) culpados.push(caminho);
        }
      }
    };
    varre(join(process.cwd(), 'src'));
    expect(culpados).toEqual([]);
  });
});
