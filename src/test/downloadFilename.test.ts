import { describe, expect, it } from 'vitest';
import { downloadFilenameFor } from '@/lib/utils';

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
