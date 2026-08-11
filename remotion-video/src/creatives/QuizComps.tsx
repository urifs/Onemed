import React from 'react';
import { Timing } from './Captions';
import { QuizVideo, QuizData, quizDuration, CenaMonitor, CenaFrasco, CenaAmbulancia, CenaBebe, CenaAusculta, CenaGestante } from './quiz';
import t73a from './timings/c73a.json'; import t73b from './timings/c73b.json';
import t74a from './timings/c74a.json'; import t74b from './timings/c74b.json';
import t75a from './timings/c75a.json'; import t75b from './timings/c75b.json';
import t76a from './timings/c76a.json'; import t76b from './timings/c76b.json';
import t77a from './timings/c77a.json'; import t77b from './timings/c77b.json';
import t78a from './timings/c78a.json'; import t78b from './timings/c78b.json';
import t79a from './timings/c79a.json'; import t79b from './timings/c79b.json';
import t80a from './timings/c80a.json'; import t80b from './timings/c80b.json';
import t81a from './timings/c81a.json'; import t81b from './timings/c81b.json';
import t82a from './timings/c82a.json'; import t82b from './timings/c82b.json';

const D = (d: Omit<QuizData, 'mp3a' | 'mp3b'> & { n: number }): QuizData => ({
  ...d, mp3a: `narration/c${d.n}a.mp3`, mp3b: `narration/c${d.n}b.mp3`,
});

export const QUIZZES: QuizData[] = [
  D({ n: 73, id: 'C73', contexto: 'PS PEDIÁTRICO · MADRUGADA',
    pergunta: 'Anafilaxia: qual é a primeira conduta?',
    alternativas: ['Anti-histamínico endovenoso', 'Adrenalina intramuscular', 'Corticoide endovenoso', 'Observação e monitorização'],
    corretaIdx: 1, timingA: t73a as Timing, timingB: t73b as Timing,
    revealSecB: 2.425, perguntaSecA: 7.75, altSecA: [10.458, 12.75, 14.808, 16.983], n31SecB: 14.975,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 200, Cena: ({ t }) => <CenaAusculta t={t} /> }),
  D({ n: 74, id: 'C74', contexto: 'PLANTÃO · FRASCO VAZIO',
    pergunta: 'Qual o antídoto da intoxicação por paracetamol?',
    alternativas: ['N-acetilcisteína', 'Flumazenil', 'Naloxona', 'Fomepizol'],
    corretaIdx: 0, timingA: t74a as Timing, timingB: t74b as Timing,
    revealSecB: 1.817, perguntaSecA: 6.642, altSecA: [9.175, 10.758, 11.833, 13.008], n31SecB: 12.258,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 120, Cena: ({ t }) => <CenaFrasco t={t} /> }),
  D({ n: 75, id: 'C75', contexto: 'AMBULÂNCIA · SUPRA EM D2, D3 E aVF',
    pergunta: 'IAM de parede inferior: qual artéria ocluída?',
    alternativas: ['Descendente anterior', 'Artéria circunflexa', 'Coronária direita', 'Tronco da coronária esquerda'],
    corretaIdx: 2, timingA: t75a as Timing, timingB: t75b as Timing,
    revealSecB: 2.425, perguntaSecA: 9.408, altSecA: [12.892, 14.808, 16.85, 18.833], n31SecB: 12.917,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 280, Cena: ({ t }) => <CenaAmbulancia t={t} /> }),
  D({ n: 76, id: 'C76', contexto: 'PROVA PRÁTICA · SEMIOLOGIA',
    pergunta: 'Ruflar diastólico em foco mitral indica…?',
    alternativas: ['Insuficiência mitral', 'Estenose mitral', 'Estenose aórtica', 'Insuficiência aórtica'],
    corretaIdx: 1, timingA: t76a as Timing, timingB: t76b as Timing,
    revealSecB: 1.817, perguntaSecA: 6.933, altSecA: [11.842, 13.325, 14.667, 16.133], n31SecB: 13.075,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 60, Cena: ({ t }) => <CenaAusculta t={t} /> }),
  D({ n: 77, id: 'C77', contexto: 'SALA VERMELHA · TRAUMA',
    pergunta: 'ATLS: qual a primeira prioridade?',
    alternativas: ['Via aérea + proteção cervical', 'Pupilas e Glasgow', 'Dois acessos calibrosos', 'Raio-X de tórax e pelve'],
    corretaIdx: 0, timingA: t77a as Timing, timingB: t77b as Timing,
    revealSecB: 2.425, perguntaSecA: 8.8, altSecA: [12.267, 14.717, 17.025, 19.692], n31SecB: 13.8,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 240, Cena: ({ t }) => <CenaAmbulancia t={t} /> }),
  D({ n: 78, id: 'C78', contexto: 'BERÇÁRIO · 12 HORAS DE VIDA',
    pergunta: 'Icterícia nas primeiras 24h de vida é…?',
    alternativas: ['Fisiológica, só observar', 'Icterícia do leite materno', 'Normal em bebê a termo', 'Sempre patológica: investigar'],
    corretaIdx: 3, timingA: t78a as Timing, timingB: t78b as Timing,
    revealSecB: 1.817, perguntaSecA: 6.325, altSecA: [9.725, 11.625, 13.458, 15.067], n31SecB: 13.625,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 160, Cena: ({ t }) => <CenaBebe t={t} /> }),
  D({ n: 79, id: 'C79', contexto: 'DIÁLISE PERDIDA · MONITOR',
    pergunta: 'Onda T apiculada ("em tenda") no ECG: qual distúrbio?',
    alternativas: ['Hipocalemia', 'Hipercalemia', 'Hipercalcemia', 'Hiponatremia'],
    corretaIdx: 1, timingA: t79a as Timing, timingB: t79b as Timing,
    revealSecB: 2.425, perguntaSecA: 9.617, altSecA: [12.892, 14.683, 16.483, 18.408], n31SecB: 14.233,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 300, Cena: ({ t }) => <CenaMonitor t={t} tApex /> }),
  D({ n: 80, id: 'C80', contexto: 'UTI · TCE GRAVE',
    pergunta: 'Quais os 3 sinais da tríade de Cushing?',
    alternativas: ['Hipotensão + taqui + febre', 'Hipertensão + taqui + sudorese', 'Hipertensão + bradi + resp. irregular', 'Hipotensão + bradi + miose'],
    corretaIdx: 2, timingA: t80a as Timing, timingB: t80b as Timing,
    revealSecB: 1.817, perguntaSecA: 6.758, altSecA: [9.575, 11.583, 13.825, 16.467], n31SecB: 13.875,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 90, Cena: ({ t }) => <CenaMonitor t={t} tApex /> }),
  D({ n: 81, id: 'C81', contexto: 'EMERGÊNCIA · GLICEMIA 480',
    pergunta: 'Cetoacidose diabética: primeira medida?',
    alternativas: ['Insulina IV imediata', 'Bicarbonato de sódio', 'Repor potássio de rotina', 'Soro fisiológico IV'],
    corretaIdx: 3, timingA: t81a as Timing, timingB: t81b as Timing,
    revealSecB: 2.425, perguntaSecA: 9.217, altSecA: [12.358, 14.733, 16.85, 19.1], n31SecB: 15.067,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 340, Cena: ({ t }) => <CenaMonitor t={t} /> }),
  D({ n: 82, id: 'C82', contexto: 'MATERNIDADE · 36 SEMANAS · 160×110',
    pergunta: 'Pré-eclâmpsia grave: droga de escolha p/ convulsão?',
    alternativas: ['Diazepam', 'Hidralazina', 'Sulfato de magnésio', 'Fenitoína'],
    corretaIdx: 2, timingA: t82a as Timing, timingB: t82b as Timing,
    revealSecB: 1.817, perguntaSecA: 7.192, altSecA: [10.467, 11.558, 12.742, 14.242], n31SecB: 11.95,
    takeSrc: 'rec/ol_quest.mp4', takeFrom: 30, Cena: ({ t }) => <CenaGestante t={t} /> }),
];

const mk = (i: number) => {
  const C: React.FC = () => <QuizVideo d={QUIZZES[i]} />;
  return { C, dur: quizDuration(QUIZZES[i]) };
};
const q73 = mk(0), q74 = mk(1), q75 = mk(2), q76 = mk(3), q77 = mk(4), q78 = mk(5), q79 = mk(6), q80 = mk(7), q81 = mk(8), q82 = mk(9);

export const C73_Quiz = q73.C; export const C73_DURATION = q73.dur;
export const C74_Quiz = q74.C; export const C74_DURATION = q74.dur;
export const C75_Quiz = q75.C; export const C75_DURATION = q75.dur;
export const C76_Quiz = q76.C; export const C76_DURATION = q76.dur;
export const C77_Quiz = q77.C; export const C77_DURATION = q77.dur;
export const C78_Quiz = q78.C; export const C78_DURATION = q78.dur;
export const C79_Quiz = q79.C; export const C79_DURATION = q79.dur;
export const C80_Quiz = q80.C; export const C80_DURATION = q80.dur;
export const C81_Quiz = q81.C; export const C81_DURATION = q81.dur;
export const C82_Quiz = q82.C; export const C82_DURATION = q82.dur;
