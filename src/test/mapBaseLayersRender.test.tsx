import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import { MapBaseLayers } from '@/components/admin/MapBaseLayers';

// O tom escuro do mapa depende de uma CLASSE CSS chegar até o container de
// tiles do Leaflet. Se o `className` parar de ser repassado (mudança de versão
// do react-leaflet, refactor), o mapa volta a ficar cinza-claro no painel
// escuro — e nada quebra, nenhum teste de tipo pega. Este pega.
describe('camadas de fundo do mapa', () => {
  afterEach(cleanup);

  const monta = (light: boolean) => render(
    <MapContainer center={[-14, -51]} zoom={3}>
      <MapBaseLayers light={light} />
    </MapContainer>,
  );

  it('no tema ESCURO marca a base com a classe que a escurece', () => {
    const { container } = monta(false);
    const base = container.querySelector('.map-tiles-dark');
    expect(base).not.toBeNull();
    // e é a camada de BASE, não a de rótulos (filtrar os nomes some com eles)
    expect(base?.querySelector('img')?.getAttribute('src') ?? '').toContain('Gray_Base');
  });

  it('no tema CLARO não escurece nada', () => {
    const { container } = monta(true);
    expect(container.querySelector('.map-tiles-dark')).toBeNull();
  });

  it('desenha as duas camadas: base e rótulos', () => {
    const { container } = monta(false);
    const urls = [...container.querySelectorAll('img')].map(i => i.getAttribute('src') ?? '');
    expect(urls.some(u => u.includes('World_Dark_Gray_Base'))).toBe(true);
    expect(urls.some(u => u.includes('World_Dark_Gray_Reference'))).toBe(true);
  });
});
