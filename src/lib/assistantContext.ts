// Ponte entre a aula aberta e o assistente flutuante.
//
// Guarda só ISTO — o id/título do que o aluno está vendo agora. O widget lê
// esse valor no momento em que o aluno ENVIA uma pergunta, e é aí que ele
// entra na requisição — nada é mandado para a IA só por abrir uma aula.
export interface OpenLessonRef {
  id: string;
  title: string;
  type: string;
  courseTitle: string;
}

let atual: OpenLessonRef | null = null;
const ouvintes = new Set<(l: OpenLessonRef | null) => void>();

export function setOpenLesson(lesson: OpenLessonRef | null) {
  atual = lesson;
  for (const fn of ouvintes) fn(atual);
}

export function getOpenLesson(): OpenLessonRef | null {
  return atual;
}

export function subscribeOpenLesson(fn: (l: OpenLessonRef | null) => void): () => void {
  ouvintes.add(fn);
  fn(atual);
  return () => { ouvintes.delete(fn); };
}

// ── Playlist aberta ─────────────────────────────────────────────────────────
// Mesma ponte, para o assistente saber em qual playlist o aluno está.
export interface OpenPlaylistRef {
  id: string;
  name: string;
}

let playlistAtual: OpenPlaylistRef | null = null;
const ouvintesPlaylist = new Set<(p: OpenPlaylistRef | null) => void>();

export function setOpenPlaylist(p: OpenPlaylistRef | null) {
  playlistAtual = p;
  for (const fn of ouvintesPlaylist) fn(playlistAtual);
}

export function getOpenPlaylist(): OpenPlaylistRef | null {
  return playlistAtual;
}

export function subscribeOpenPlaylist(fn: (p: OpenPlaylistRef | null) => void): () => void {
  ouvintesPlaylist.add(fn);
  fn(playlistAtual);
  return () => { ouvintesPlaylist.delete(fn); };
}
