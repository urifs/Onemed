import { TileLayer } from 'react-leaflet';

// Camadas de fundo dos mapas do painel (Usuários e Segurança). Ficam AQUI e em
// nenhum outro lugar — antes cada mapa tinha a própria cópia da URL, e trocar
// de provedor exigia lembrar dos dois.
//
// ⚠️ Por que não é mais a CARTO: em 08/2026 ela passou a exigir chave e carimba
// "API KEY REQUIRED" DENTRO da imagem do tile, respondendo HTTP 200 normalmente.
// Nenhum código detecta isso — o mapa só fica sujo na tela. Ao avaliar um
// provedor, confira o PIXEL do tile, não o status da resposta.
//
// Esri Canvas: sem chave, temas claro e escuro nativos, zoom 0–23 (não precisa
// de maxNativeZoom). A base NÃO traz nomes de cidade/país: os rótulos são uma
// segunda camada, desenhada por cima da base. As duas ficam no tilePane do
// Leaflet, então continuam ABAIXO dos marcadores — nome de cidade nunca cobre
// um ponto de usuário.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

export const MAP_TILES = {
  dark: {
    base: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
  light: {
    base: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
} as const;

export const MAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; ' +
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * ⚠️ A ordem da URL do Esri é `{z}/{y}/{x}` (linha antes da coluna), o inverso
 * do `{z}/{x}/{y}` da maioria dos provedores. Trocar os dois entrega o pedaço
 * errado do mundo em cada quadrado, sem erro nenhum no console.
 */
export function MapBaseLayers({ light }: { light: boolean }) {
  const tiles = light ? MAP_TILES.light : MAP_TILES.dark;
  return (
    <>
      <TileLayer
        url={tiles.base}
        attribution={MAP_ATTRIBUTION}
        // Escurece a base no tema escuro (.map-tiles-dark em src/index.css) — o
        // Esri é grafite, e o painel é quase preto. Os rótulos NÃO levam a
        // classe: filtrados junto, os nomes de cidade sumiriam.
        className={light ? undefined : 'map-tiles-dark'}
      />
      <TileLayer url={tiles.labels} />
    </>
  );
}
