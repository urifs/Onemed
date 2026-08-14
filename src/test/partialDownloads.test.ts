import { describe, it, expect } from 'vitest';

/**
 * Regra de importação para arquivo que carrega marca de download incompleto.
 *
 * A cópia de referência vive em `supabase/functions/member-sync-library`
 * (e espelhada nos dois scripts de varredura). Este teste existe porque a
 * classificação foi derivada de MEDIÇÃO na biblioteca real — os `.mp3.crdownload`
 * e os `.ts.part` tocam inteiros, os `.mp4.crdownload`/`.mp4.part` estavam sem
 * o átomo `moov` e não abriam em player nenhum. Cada caso abaixo é um arquivo
 * que existia de verdade em produção.
 */
const RE_PARCIAL = /\.(crdownload|crswap|part|partial|filepart|opdownload|aria2|!ut|download|temp|tmp)$/i;
const EXT_FLUXO = /\.(ts|mp3|mpeg|mpg|mp2|aac|m4a|flac|wav|mkv)$/i;
const MIME_FLUXO = /^(video\/mp2t|audio\/(mpeg|mp3|aac|flac|wav|x-wav))$/i;
const EXT_ASSET_WEB = /\.(js|css|json|map|woff2?|ttf|eot|svg|htm|html)$/i;

export function analisarParcial(nome: string, mime: string, size: number | null) {
  const marca = String(nome ?? '').match(RE_PARCIAL);
  if (!marca) return { pular: false, titulo: nome };
  const base = String(nome).slice(0, -marca[0].length).replace(/\(\d+\)$/, '');
  if (!/\.[a-z0-9]{1,5}$/i.test(base)) return { pular: false, titulo: nome };
  if (Number(size) === 0) return { pular: true, titulo: base };
  if (EXT_ASSET_WEB.test(base)) return { pular: true, titulo: base };
  if (!EXT_FLUXO.test(base) && !MIME_FLUXO.test(mime || '')) return { pular: true, titulo: base };
  return { pular: false, titulo: base };
}

describe('download incompleto: aproveita o que toca, descarta o que não abre', () => {
  it('MP4 truncado não entra — sem o moov do fim nenhum player abre', () => {
    // medway-extensivo, 1,89 GB: mdat declarava 3,36 GB.
    expect(analisarParcial(
      'EXT SP 2023 - CM - NEUROINTENSIVISMO ÉTICA MÉDICA-023.mp4.crdownload',
      'video/mp4', 1979711488,
    ).pular).toBe(true);
    // banco-de-questoes-estrategiamed, 59 MB, mesmo defeito.
    expect(analisarParcial('13. Aula.mp4.part', 'video/mp4', 62281319).pular).toBe(true);
  });

  it('MP3 cortado entra com o nome limpo — formato de fluxo toca até onde vai', () => {
    const r = analisarParcial('4_-_MOTOR.mp3.crdownload', 'audio/mpeg', 14158386);
    expect(r.pular).toBe(false);
    expect(r.titulo).toBe('4_-_MOTOR.mp3');
  });

  it('MPEG-TS cortado entra, pelo nome ou pelo mime do Drive', () => {
    const porNome = analisarParcial('Hotmart Club - Aula 1 - PARTE 1.ts.part', 'application/octet-stream', 1254800000);
    expect(porNome.pular).toBe(false);
    expect(porNome.titulo).toBe('Hotmart Club - Aula 1 - PARTE 1.ts');

    // O nome mente (.mp4) mas os bytes são MPEG-TS e o Drive reporta o mime certo.
    const porMime = analisarParcial('001 - aula.mp4.part', 'video/mp2t', 286700000);
    expect(porMime.pular).toBe(false);
    expect(porMime.titulo).toBe('001 - aula.mp4');
  });

  it('arquivo de 0 byte nunca entra', () => {
    expect(analisarParcial('Aula.mp4.part', 'video/mp4', 0).pular).toBe(true);
    expect(analisarParcial('Podcast.mp3.part', 'audio/mpeg', 0).pular).toBe(true);
  });

  it('asset de página salva nunca entra, mesmo com (n) no nome', () => {
    expect(analisarParcial('wrapper.eec2695ca7d0c3ef5a09.js.download', 'application/octet-stream', 1677721).pular).toBe(true);
    expect(analisarParcial('app.js(3).download', 'application/octet-stream', 5188).pular).toBe(true);
    expect(analisarParcial('mosaic.js.download', 'text/javascript', 167589).pular).toBe(true);
  });

  it('sufixo que faz parte do nome de verdade não é tratado como marca', () => {
    // Sem extensão por baixo: ".part" aqui é palavra, não marcador.
    const r = analisarParcial('Neuroanatomia.part', 'video/mp4', 500000000);
    expect(r.pular).toBe(false);
    expect(r.titulo).toBe('Neuroanatomia.part');
  });

  it('arquivo normal passa intocado', () => {
    for (const [nome, mime] of [
      ['Aula 01 - Cardiologia.mp4', 'video/mp4'],
      ['Resumo.pdf', 'application/pdf'],
      ['baralho.apkg', 'application/octet-stream'],
    ] as const) {
      const r = analisarParcial(nome, mime, 12345);
      expect(r.pular).toBe(false);
      expect(r.titulo).toBe(nome);
    }
  });
});
