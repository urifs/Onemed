import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c85.json';

/* ============================================================
   C85 — A EDIÇÃO ÚNICA
   Sistema visual: revista impressa. Papel creme, tinta preta,
   fios vermelhos finos, tipografia serifada, viradas de página
   horizontais com sombra de papel. Nada de cards, nada de
   legenda inferior, nada do encerramento padrão.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C85_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

/* paleta de impressão */
const PAPER = '#f4efe6';
const PAPER_DEEP = '#ece5d8';
const INK = '#1a1713';
const INK_SOFT = '#4a443c';
const RULE = '#c2382e';

const SERIF = "Georgia, 'Times New Roman', 'Playfair Display', serif";
const CAPS: React.CSSProperties = {
  fontFamily: SERIF, textTransform: 'uppercase', letterSpacing: '0.32em', fontSize: 26, color: INK_SOFT,
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const smooth = (p: number) => p * p * (3 - 2 * p);

/* batidas (segundos absolutos, já com DELAY) */
const B = {
  capa: DELAY + 0,
  sumario: DELAY + 7.6,
  e_estrategia: DELAY + 9.1, e_14142: DELAY + 10.4, e_medcurso: DELAY + 13.9,
  e_medcof: DELAY + 17.4, e_medcel: DELAY + 19.1, e_sanarflix: DELAY + 21.0,
  e_medgrupo: DELAY + 22.9, e_rodape530: DELAY + 27.4,
  materia: DELAY + 32.0,
  m_31612: DELAY + 35.8, m_comentadas: DELAY + 38.0, m_banco: DELAY + 40.4,
  colunas: DELAY + 43.4,
  c_incor: DELAY + 45.0, c_cardio: DELAY + 47.8,
  servico: DELAY + 50.5,
  s_resumo: DELAY + 54.6, s_flash: DELAY + 56.0, s_crono: DELAY + 58.2,
  medicos: DELAY + 61.6,
  contracapa: DELAY + 64.9,
};

/* ---------- mobiliário de página ---------- */
const Hairline: React.FC<{ color?: string; style?: React.CSSProperties }> = ({ color = INK, style }) => (
  <div style={{ height: 2, background: color, opacity: 0.9, ...style }} />
);

const PageChrome: React.FC<{ secao: string; pagina: string }> = ({ secao, pagina }) => (
  <>
    <div style={{ position: 'absolute', top: 64, left: 84, right: 84 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ ...CAPS, fontSize: 22 }}>OneMed — Edição Única</span>
        <span style={{ ...CAPS, fontSize: 22, letterSpacing: '0.18em' }}>{pagina}</span>
      </div>
      <Hairline />
    </div>
    <div style={{ position: 'absolute', bottom: 64, left: 84, right: 84 }}>
      <Hairline style={{ marginBottom: 14 }} />
      <span style={{ ...CAPS, fontSize: 20 }}>{secao}</span>
    </div>
  </>
);

/* textura de papel: fibra vertical bem sutil + leve vinheta de prensa */
const PaperGrain: React.FC = () => (
  <>
    <AbsoluteFill style={{
      backgroundImage: 'repeating-linear-gradient(90deg, rgba(26,23,19,0.016) 0 2px, transparent 2px 7px)',
      pointerEvents: 'none',
    }} />
    <AbsoluteFill style={{
      background: 'radial-gradient(140% 110% at 50% 42%, transparent 62%, rgba(26,23,19,0.10) 100%)',
      pointerEvents: 'none',
    }} />
  </>
);

/* aparição de item impresso: sobe 12px + revela, como tinta assentando */
const printIn = (t: number, at: number, dur = 0.55): React.CSSProperties => {
  const p = outExpo(win(t, at, at + dur));
  return { opacity: p, transform: `translateY(${(1 - p) * 12}px)` };
};

/* ---------- PÁGINA 1: CAPA ---------- */
const Capa: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: PAPER, padding: '96px 84px' }}>
    <div style={printIn(t, B.capa + 0.15)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ ...CAPS, fontSize: 24 }}>Nº 1 — e único</span>
        <span style={{ ...CAPS, fontSize: 24 }}>2026</span>
      </div>
      <Hairline style={{ margin: '18px 0 0' }} />
    </div>

    <div style={{ marginTop: 84, ...printIn(t, B.capa + 0.35) }}>
      <div style={{ fontFamily: SERIF, fontSize: 132, lineHeight: 0.98, color: INK, letterSpacing: '-0.015em' }}>
        One<span style={{ color: RULE }}>Med</span>
      </div>
      <div style={{ ...CAPS, marginTop: 26, fontSize: 30, letterSpacing: '0.42em' }}>Revista de medicina</div>
    </div>

    {/* manchete da capa acompanha a narração */}
    <div style={{ marginTop: 230 }}>
      <div style={{ ...printIn(t, DELAY + 0.1) }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 46, color: INK_SOFT }}>
          Isto não é um anúncio.
        </div>
      </div>
      <div style={{ ...printIn(t, DELAY + 2.5), marginTop: 34 }}>
        <div style={{ fontFamily: SERIF, fontSize: 108, lineHeight: 1.04, color: INK }}>
          É uma <span style={{ borderBottom: `6px solid ${RULE}` }}>edição.</span>
        </div>
      </div>
      <div style={{ ...printIn(t, DELAY + 4.4), marginTop: 44, maxWidth: 760 }}>
        <div style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.35, color: INK_SOFT }}>
          E ela só precisou ser publicada <em>uma vez</em> — porque não sai de linha e não perde a validade.
        </div>
      </div>
    </div>

    {/* rodapé de capa: onde iria o preço, vai o teste */}
    <div style={{ position: 'absolute', left: 84, right: 84, bottom: 88, ...printIn(t, DELAY + 5.6) }}>
      <Hairline style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ ...CAPS, fontSize: 24 }}>Exemplar de avaliação</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          {/* código de barras cenográfico */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 54 }}>
            {[5, 2, 7, 3, 2, 6, 2, 4, 7, 2, 5, 3, 6, 2, 4].map((wd, i) => (
              <div key={i} style={{ width: wd, height: i % 3 === 0 ? 54 : 44, background: INK }} />
            ))}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 30, color: RULE, fontStyle: 'italic' }}>teste grátis</div>
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

/* ---------- PÁGINA 2: SUMÁRIO ---------- */
type Entrada = { at: number; titulo: string; nota: string; pg: string; forte?: boolean };
const ENTRADAS: Entrada[] = [
  { at: B.e_estrategia, titulo: 'Estratégia MED', nota: '14.142 aulas', pg: '12', forte: true },
  { at: B.e_medcurso, titulo: 'MEDCurso', nota: 'do início ao fim', pg: '48' },
  { at: B.e_medcof, titulo: 'Medcof', nota: 'intensivo e extensivo', pg: '96' },
  { at: B.e_medcel, titulo: 'MedCel', nota: 'preparatório completo', pg: '120' },
  { at: B.e_sanarflix, titulo: 'Sanarflix', nota: 'ciclo clínico', pg: '150' },
  { at: B.e_medgrupo, titulo: 'MedGrupo', nota: 'por estado e instituição', pg: '178' },
];

const Sumario: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: PAPER, padding: '150px 84px' }}>
    <PageChrome secao="Sumário da edição" pagina="p. 2" />
    <div style={{ marginTop: 60, ...printIn(t, B.sumario + 0.3) }}>
      <div style={{ fontFamily: SERIF, fontSize: 96, color: INK }}>Sumário</div>
      <div style={{ width: 130, height: 8, background: RULE, marginTop: 18 }} />
    </div>

    <div style={{ marginTop: 66 }}>
      {ENTRADAS.map((e, i) => (
        <div key={i} style={{ ...printIn(t, e.at), padding: '30px 0', borderBottom: `2px solid rgba(26,23,19,0.14)` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
            <span style={{ fontFamily: SERIF, fontSize: e.forte ? 58 : 50, color: INK, whiteSpace: 'nowrap' }}>
              {e.titulo}
            </span>
            <span style={{ flex: 1, borderBottom: `3px dotted rgba(26,23,19,0.35)`, transform: 'translateY(-10px)' }} />
            <span style={{ fontFamily: SERIF, fontSize: 40, color: RULE }}>{e.pg}</span>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 32, color: INK_SOFT, marginTop: 8 }}>
            {e.forte ? <span style={{ color: RULE }}>{e.nota}</span> : e.nota}
          </div>
        </div>
      ))}
    </div>

    <div style={{ marginTop: 58, ...printIn(t, B.e_rodape530) }}>
      <div style={{ background: INK, color: PAPER, padding: '30px 34px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ ...CAPS, color: PAPER, fontSize: 22 }}>ao todo, no mesmo índice</span>
        <span style={{ fontFamily: SERIF, fontSize: 56 }}>+530 cursos</span>
      </div>
    </div>
  </AbsoluteFill>
);

/* ---------- PÁGINA 3: MATÉRIA DE CAPA ---------- */
const Materia: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: PAPER, padding: '150px 84px' }}>
    <PageChrome secao="Matéria de capa" pagina="p. 12" />
    <div style={{ marginTop: 44, ...printIn(t, B.materia + 0.3) }}>
      <span style={{ ...CAPS, color: RULE, fontSize: 26 }}>Matéria de capa</span>
      <div style={{ fontFamily: SERIF, fontSize: 92, color: INK, marginTop: 20, lineHeight: 1.02 }}>
        As questões.
      </div>
    </div>

    {/* número gigante como pull-quote de impressão */}
    <div style={{ marginTop: 130, ...printIn(t, B.m_31612, 0.7) }}>
      <div style={{ fontFamily: SERIF, fontSize: 268, lineHeight: 0.94, color: INK, letterSpacing: '-0.02em' }}>
        31.612
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 26 }}>
        <div style={{ width: 66, height: 5, background: RULE }} />
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 42, color: INK_SOFT }}>
          comentadas, uma a uma
        </span>
      </div>
    </div>

    {/* box lateral de redação */}
    <div style={{ position: 'absolute', left: 84, right: 84, bottom: 240, maxWidth: 820, ...printIn(t, B.m_banco) }}>
      <div style={{ borderTop: `6px solid ${RULE}`, borderBottom: `2px solid ${INK}`, padding: '30px 4px 34px' }}>
        <span style={{ ...CAPS, fontSize: 22 }}>E ainda nesta edição</span>
        <div style={{ fontFamily: SERIF, fontSize: 54, color: INK, marginTop: 16, lineHeight: 1.15 }}>
          Banco de Questões MED: <span style={{ color: RULE }}>+56 mil</span> itens.
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

/* ---------- PÁGINA 4: COLUNAS ---------- */
const Colunas: React.FC<{ t: number }> = ({ t }) => {
  const col = (at: number, rotulo: string, autor: string, drop: string, texto: string) => (
    <div style={{ flex: 1, ...printIn(t, at) }}>
      <Hairline color={INK} />
      <div style={{ ...CAPS, fontSize: 22, margin: '18px 0 8px' }}>{rotulo}</div>
      <div style={{ fontFamily: SERIF, fontSize: 56, color: RULE, marginBottom: 26 }}>{autor}</div>
      <div style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.55, color: INK_SOFT, textAlign: 'justify' }}>
        <span style={{
          float: 'left', fontFamily: SERIF, fontSize: 122, lineHeight: 0.8, color: INK,
          paddingRight: 16, paddingTop: 8,
        }}>{drop}</span>
        {texto}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: PAPER, padding: '150px 84px' }}>
      <PageChrome secao="Colunas assinadas" pagina="p. 204" />
      <div style={{ marginTop: 52, ...printIn(t, B.colunas + 0.3) }}>
        <div style={{ fontFamily: SERIF, fontSize: 88, color: INK }}>Nas colunas</div>
        <div style={{ width: 130, height: 8, background: RULE, marginTop: 18 }} />
      </div>
      <div style={{ display: 'flex', gap: 56, marginTop: 130 }}>
        {col(B.c_incor, 'Eletrocardiograma', 'InCor',
          'O', ' traçado não mente — quem ensina a lê-lo é a referência nacional em cardiologia, linha a linha, derivação por derivação, do ritmo sinusal ao que não pode passar despercebido.')}
        {col(B.c_cardio, 'Cardiologia', 'Cardiopapers',
          'A', ' cardiologia que se pratica de verdade: da consulta à emergência, o curso que virou padrão de bolso entre residentes — agora dentro da mesma assinatura.')}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- PÁGINA 5: SEÇÃO DE SERVIÇO ---------- */
const Servico: React.FC<{ t: number }> = ({ t }) => {
  const nota = (at: number, num: string, titulo: string, sub: string) => (
    <div style={{ ...printIn(t, at), display: 'flex', gap: 30, padding: '34px 0', borderBottom: '2px solid rgba(26,23,19,0.14)' }}>
      <div style={{ fontFamily: SERIF, fontSize: 44, color: RULE, minWidth: 70 }}>{num}</div>
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 52, color: INK, lineHeight: 1.08 }}>{titulo}</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 32, color: INK_SOFT, marginTop: 10 }}>{sub}</div>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: PAPER, padding: '150px 84px' }}>
      <PageChrome secao="Seção de serviço" pagina="p. 236" />
      <div style={{ marginTop: 52, ...printIn(t, B.servico + 0.3) }}>
        <span style={{ ...CAPS, color: RULE, fontSize: 26 }}>Seção de serviço</span>
        <div style={{ fontFamily: SERIF, fontSize: 80, color: INK, marginTop: 18, lineHeight: 1.05 }}>
          A redação trabalha por você.
        </div>
      </div>
      <div style={{ marginTop: 56 }}>
        {nota(B.s_resumo, 'I.', 'Resumo em um clique', 'qualquer aula, qualquer apostila — condensada na hora')}
        {nota(B.s_flash, 'II.', 'Flashcards do seu próprio material', 'o que você estuda vira baralho de revisão')}
        {nota(B.s_crono, 'III.', 'Cronograma desenhado por IA', 'com mapa mental, semana a semana, até a sua prova')}
      </div>
      <div style={{ position: 'absolute', left: 84, right: 84, bottom: 250, ...printIn(t, B.medicos) }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, lineHeight: 1.22, color: INK }}>
          “<span style={{ color: RULE }}>+10.000 médicos</span> já assinam esta edição.”
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- PÁGINA 6: CONTRACAPA ---------- */
const Contracapa: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: INK, padding: '150px 84px' }}>
    <div style={{ position: 'absolute', top: 64, left: 84, right: 84 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ ...CAPS, color: 'rgba(244,239,230,0.65)', fontSize: 22 }}>OneMed — Edição Única</span>
        <span style={{ ...CAPS, color: 'rgba(244,239,230,0.65)', fontSize: 22, letterSpacing: '0.18em' }}>última página</span>
      </div>
      <Hairline color="rgba(244,239,230,0.4)" />
    </div>

    <div style={{ marginTop: 330, ...printIn(t, B.contracapa + 0.4) }}>
      <div style={{ fontFamily: SERIF, fontSize: 118, lineHeight: 1.04, color: PAPER }}>
        O teste<br />é <span style={{ fontStyle: 'italic', color: '#e8837b' }}>grátis.</span>
      </div>
    </div>

    <div style={{ marginTop: 110, ...printIn(t, B.contracapa + 1.6) }}>
      <div style={{ width: 130, height: 8, background: RULE }} />
      <div style={{ fontFamily: SERIF, fontSize: 62, color: PAPER, marginTop: 34, letterSpacing: '0.01em' }}>
        onemedcursos<span style={{ color: '#e8837b' }}>.com.br</span>
      </div>
      <div style={{ ...CAPS, color: 'rgba(244,239,230,0.7)', fontSize: 24, marginTop: 26 }}>
        Assine a edição única
      </div>
    </div>

    <div style={{ position: 'absolute', left: 84, right: 84, bottom: 76, ...printIn(t, B.contracapa + 2.2) }}>
      <Hairline color="rgba(244,239,230,0.4)" style={{ marginBottom: 18 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...CAPS, color: 'rgba(244,239,230,0.65)', fontSize: 20 }}>+530 cursos · +9.000 livros</span>
        <span style={{ ...CAPS, color: 'rgba(244,239,230,0.65)', fontSize: 20 }}>circulação: nacional</span>
      </div>
    </div>
  </AbsoluteFill>
);

/* ---------- montagem: virada de página com sombra de papel ---------- */
const PAGES: Array<{ at: number; Comp: React.FC<{ t: number }> }> = [
  { at: 0, Comp: Capa },
  { at: B.sumario, Comp: Sumario },
  { at: B.materia, Comp: Materia },
  { at: B.colunas, Comp: Colunas },
  { at: B.servico, Comp: Servico },
  { at: B.contracapa, Comp: Contracapa },
];
const TURN = 0.7;

export const C85_Revista: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  return (
    <AbsoluteFill style={{ background: PAPER_DEEP }}>
      {PAGES.map(({ at, Comp }, i) => {
        const next = PAGES[i + 1]?.at ?? Infinity;
        if (t < at - 0.05 || t > next + TURN + 0.1) return null;
        /* entrada: desliza da direita com sombra; saída: recua e escurece */
        const pIn = i === 0 ? 1 : outExpo(win(t, at, at + TURN));
        const pOut = next === Infinity ? 0 : smooth(win(t, next, next + TURN));
        return (
          <AbsoluteFill
            key={i}
            style={{
              transform: `translateX(${(1 - pIn) * 100 - pOut * 16}%)`,
              boxShadow: pIn < 1 ? '-60px 0 120px rgba(26,23,19,0.35)' : undefined,
            }}
          >
            <Comp t={t} />
            <PaperGrain />
            {/* página que sai escurece como papel na sombra do caderno de cima */}
            <AbsoluteFill style={{ background: INK, opacity: pOut * 0.28, pointerEvents: 'none' }} />
          </AbsoluteFill>
        );
      })}
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c85.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
