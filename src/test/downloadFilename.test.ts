import { describe, expect, it } from 'vitest';
import { downloadFilenameFor, downloadUrlFor } from '@/lib/utils';

// A regra é uma só: o arquivo baixado sai com a MESMA extensão que aparece na
// plataforma. Os casos abaixo são todos reais da biblioteca — os mimes vieram
// direto do que o Google Drive reporta para cada um.
describe('downloadFilenameFor', () => {
  it('preserva a extensão do Anki (.apkg) em vez de trocar por .bin', () => {
    expect(downloadFilenameFor({
      title: 'Imunização.apkg', type: 'other', mime_type: 'application/vnd.anki',
    })).toBe('Imunização.apkg');

    expect(downloadFilenameFor({
      title: 'Osler-Distúrbios Ácido-Base.apkg', type: 'other', mime_type: 'application/octetstream',
    })).toBe('Osler-Distúrbios Ácido-Base.apkg');
  });

  it('preserva .colpkg, que o Drive reporta com mimes diferentes entre si', () => {
    expect(downloadFilenameFor({
      title: 'Coleção cards questões estrategiamed_2.colpkg', type: 'other', mime_type: 'application/octetstream',
    })).toBe('Coleção cards questões estrategiamed_2.colpkg');

    expect(downloadFilenameFor({
      title: 'Coleção cards questões estrategiamed_1.colpkg', type: 'other', mime_type: 'application/x-zip',
    })).toBe('Coleção cards questões estrategiamed_1.colpkg');
  });

  it('não duplica a extensão de arquivos comuns', () => {
    expect(downloadFilenameFor({
      title: 'Apostila.pdf', type: 'pdf', mime_type: 'application/pdf',
    })).toBe('Apostila.pdf');

    expect(downloadFilenameFor({
      title: 'Aula 3.mp4', type: 'video', mime_type: 'video/mp4',
    })).toBe('Aula 3.mp4');
  });

  it('preserva extensões que nenhuma tabela nossa conheceria', () => {
    for (const [title, mime] of [
      ['Resumo.epub', 'application/epub+zip'],
      ['Material.cxt', 'application/octet-stream'],
      ['backup.anki2', 'application/octet-stream'],
      ['pacote.x32', 'application/octet-stream'],
      ['aula.ts', 'text/texmacs'],
    ] as const) {
      expect(downloadFilenameFor({ title, type: 'other', mime_type: mime })).toBe(title);
    }
  });

  it('deriva a extensão apenas quando o nome não tem nenhuma', () => {
    expect(downloadFilenameFor({
      title: 'Aula sem extensão', type: 'pdf', mime_type: 'application/pdf',
    })).toBe('Aula sem extensão.pdf');

    expect(downloadFilenameFor({
      title: 'Videoaula', type: 'video', mime_type: null,
    })).toBe('Videoaula.mp4');
  });

  it('trata número de capítulo no fim como parte do nome, não como extensão', () => {
    // `.2` não é extensão: baixar como "Aula 1.2" não abriria em nada.
    expect(downloadFilenameFor({
      title: 'Aula 1.2', type: 'video', mime_type: 'video/mp4',
    })).toBe('Aula 1.2.mp4');
  });

  it('remove caracteres proibidos em nome de arquivo sem perder a extensão', () => {
    expect(downloadFilenameFor({
      title: 'Questões: cardiologia/2024.pdf', type: 'pdf', mime_type: 'application/pdf',
    })).toBe('Questões cardiologia2024.pdf');
  });
});

describe('downloadUrlFor', () => {
  const WORKER = 'https://onemed-stream-lesson.onemed-stream.workers.dev/?id=abc&exp=1&sig=xyz&mime=video%2Fmp4';
  const STORAGE = 'https://jrrybiohwqabsdurqudc.supabase.co/storage/v1/object/sign/lesson-media/x.mp4?token=eyJ';

  it('usa `dl` no worker da Cloudflare', () => {
    const url = new URL(downloadUrlFor(WORKER, 'Aula 1.mp4'));
    expect(url.searchParams.get('dl')).toBe('Aula 1.mp4');
    // não pode atropelar a assinatura, senão o worker recusa o link
    expect(url.searchParams.get('sig')).toBe('xyz');
    expect(url.searchParams.get('id')).toBe('abc');
  });

  it('usa `download` no Storage do Supabase, que é o parâmetro que ele entende', () => {
    const url = new URL(downloadUrlFor(STORAGE, 'Aula 1.mp4'));
    expect(url.searchParams.get('download')).toBe('Aula 1.mp4');
    expect(url.searchParams.get('dl')).toBeNull();
    expect(url.searchParams.get('token')).toBe('eyJ');
  });

  it('preserva acentos e espaços dos títulos em português', () => {
    const url = new URL(downloadUrlFor(WORKER, 'Emergências Clínicas – Aula 3.pdf'));
    expect(url.searchParams.get('dl')).toBe('Emergências Clínicas – Aula 3.pdf');
  });

  it('devolve a URL original se ela não for parseável, em vez de quebrar', () => {
    expect(downloadUrlFor('não-é-url', 'a.pdf')).toBe('não-é-url');
  });
});

describe('aulas reconvertidas para MP4', () => {
  it('troca a extensão antiga por .mp4 quando o arquivo é nosso (storage_path)', () => {
    expect(downloadFilenameFor({
      title: 'NEF2 DISTÚRBIOS DO POTÁSSIO.MOV', type: 'video',
      mime_type: 'video/mp4', storage_path: 'abc.mp4',
    })).toBe('NEF2 DISTÚRBIOS DO POTÁSSIO.mp4');
  });

  it('vale para os outros containers convertidos', () => {
    for (const [nome, esperado] of [
      ['Aula.wmv', 'Aula.mp4'], ['Aula.mkv', 'Aula.mp4'],
      ['Aula.mpg', 'Aula.mp4'], ['Aula.avi', 'Aula.mp4'],
    ]) {
      expect(downloadFilenameFor({ title: nome, type: 'video', mime_type: 'video/mp4', storage_path: 'x.mp4' })).toBe(esperado);
    }
  });

  // Sem storage_path o arquivo é o original do Drive: o nome tem que ficar
  // como está, senão baixaria um .mkv de verdade chamado .mp4.
  it('NÃO mexe no nome quando o arquivo ainda é o original do Drive', () => {
    expect(downloadFilenameFor({
      title: 'Aula original.mkv', type: 'video', mime_type: 'video/mp4', storage_path: null,
    })).toBe('Aula original.mkv');
  });

  it('não mexe em quem já é .mp4', () => {
    expect(downloadFilenameFor({
      title: 'Aula 01.mp4', type: 'video', mime_type: 'video/mp4', storage_path: 'x.mp4',
    })).toBe('Aula 01.mp4');
  });
});
