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
