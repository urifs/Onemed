import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PhoneFrame, LaptopFrame, TabletFrame } from './DeviceFrames';
import { HEAD, BODY, MONO } from './theme';
import { OLightBg, O_RED, WHITE } from './olight';

/* ===== 10 imagens de AQUISIÇÃO (público novo) — stories 1080×1920, mockups com telas reais ===== */

const INK_L = '#16181d', MUT_L = '#6b7280';
const INK_D = '#f2f4f8', MUT_D = '#98a1b0';

const DarkBg: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#0a0b0e' }}>
    <div style={{
      position: 'absolute', width: 1200, height: 1200, borderRadius: 999,
      background: 'radial-gradient(circle, rgba(224,45,45,0.18), transparent 62%)',
      top: -320, right: -320,
    }} />
    <div style={{
      position: 'absolute', width: 1000, height: 1000, borderRadius: 999,
      background: 'radial-gradient(circle, rgba(224,45,45,0.10), transparent 62%)',
      bottom: -280, left: -260,
    }} />
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.5,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1.4px, transparent 1.4px)',
      backgroundSize: '46px 46px',
    }} />
  </div>
);

const Logo: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ position: 'absolute', top: 90, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
    <div style={{
      width: 54, height: 54, borderRadius: 15,
      background: `linear-gradient(135deg, ${O_RED}, #b91c1c)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 12px 30px -8px rgba(224,45,45,0.5)',
    }}>
      <svg width={31} height={31} viewBox="0 0 24 24" fill="none">
        <path d="M6 3v5a4 4 0 0 0 8 0V3" stroke={WHITE} strokeWidth={2.1} strokeLinecap="round" />
        <path d="M10 14v2.5a4.5 4.5 0 0 0 9 0V13" stroke={WHITE} strokeWidth={2.1} strokeLinecap="round" />
        <circle cx={19} cy={10.5} r={2.2} stroke={WHITE} strokeWidth={2.1} />
      </svg>
    </div>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, letterSpacing: -1 }}>
      <span style={{ color: dark ? WHITE : INK_L }}>One</span><span style={{ color: O_RED }}>Med</span>
    </span>
  </div>
);

const Head2: React.FC<{ l1: React.ReactNode; l2?: React.ReactNode; sub?: string; dark?: boolean; size?: number; top?: number }> =
({ l1, l2, sub, dark, size = 76, top = 220 }) => (
  <div style={{ position: 'absolute', left: 60, right: 60, top, textAlign: 'center', zIndex: 8 }}>
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: dark ? INK_D : INK_L, letterSpacing: -2.5, lineHeight: 1.14 }}>
      {l1}{l2 && <><br />{l2}</>}
    </div>
    {sub && <div style={{ fontFamily: BODY, fontSize: 29, color: dark ? MUT_D : MUT_L, marginTop: 18, lineHeight: 1.4 }}>{sub}</div>}
  </div>
);

const Chips: React.FC<{ items: string[]; dark?: boolean; bottom?: number }> = ({ items, dark, bottom = 330 }) => (
  <div style={{ position: 'absolute', left: 40, right: 40, bottom, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', zIndex: 9 }}>
    {items.map(c => (
      <div key={c} style={{
        background: dark ? '#14161c' : WHITE,
        border: `1.5px solid ${dark ? 'rgba(255,255,255,0.13)' : 'rgba(22,24,29,0.12)'}`,
        borderRadius: 999, padding: '13px 26px',
        boxShadow: dark ? '0 10px 30px -12px rgba(0,0,0,0.6)' : '0 10px 28px -12px rgba(22,24,29,0.2)',
        fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: dark ? INK_D : INK_L,
      }}>{c}</div>
    ))}
  </div>
);

const Cta: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 9 }}>
    <div style={{
      background: O_RED, borderRadius: 999, padding: '22px 62px',
      boxShadow: '0 20px 55px -14px rgba(224,45,45,0.6)',
      fontFamily: HEAD, fontWeight: 900, fontSize: 33, color: WHITE,
    }}>Teste grátis agora</div>
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: O_RED }}>onemedcursos.com.br</div>
  </div>
);

/* selo flutuante */
const Selo: React.FC<{ x: number; y: number; text: string; dark?: boolean; rot?: number }> = ({ x, y, text, dark, rot = 0 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, zIndex: 9, transform: `rotate(${rot}deg)`,
    background: dark ? '#14161c' : WHITE, border: `2px solid ${O_RED}`,
    borderRadius: 16, padding: '12px 20px',
    boxShadow: '0 14px 38px -12px rgba(224,45,45,0.4)',
    fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: O_RED, whiteSpace: 'nowrap',
  }}>{text}</div>
);

/* PR01 — trio de dispositivos (escuro) */
export const PR01: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <DarkBg />
    <Logo dark />
    <Head2 dark l1={<>todo o estudo de medicina.</>} l2={<span style={{ color: O_RED }}>num lugar só.</span>}
      sub="cursos, livros, questões e IA — na tela que você tiver por perto" />
    <div style={{ position: 'absolute', left: '50%', top: 640, transform: 'translateX(-50%)', zIndex: 4 }}>
      <LaptopFrame src="rec/d_dashboard.mp4" width={880} startFrom={120} />
    </div>
    <div style={{ position: 'absolute', left: 40, top: 800, zIndex: 6, transform: 'rotate(-6deg)' }}>
      <PhoneFrame src="rec/m_dashboard.mp4" width={300} startFrom={90} />
    </div>
    <div style={{ position: 'absolute', right: 36, top: 760, zIndex: 5, transform: 'rotate(6deg)' }}>
      <TabletFrame src="rec/n_annot_tab.mp4" width={380} startFrom={150} />
    </div>
    <Chips dark items={['+530 cursos', '+9.000 livros', 'IA de estudo', '+10.000 médicos']} />
    <Cta dark />
  </AbsoluteFill>
);

/* PR02 — notebook + celular: continuidade (escuro) */
export const PR02: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <DarkBg />
    <Logo dark />
    <Head2 dark l1={<>começa no notebook.</>} l2={<span style={{ color: O_RED }}>continua no plantão.</span>}
      sub="a mesma aula, o mesmo progresso — em qualquer tela" />
    <div style={{ position: 'absolute', left: '50%', top: 620, transform: 'translateX(-50%)', zIndex: 4 }}>
      <LaptopFrame src="rec/d_course_player.mp4" width={920} startFrom={160} />
    </div>
    <div style={{ position: 'absolute', right: 70, top: 900, zIndex: 6, transform: 'rotate(7deg)' }}>
      <PhoneFrame src="rec/m_player.mp4" width={330} startFrom={130} />
    </div>
    <Selo x={90} y={1310} text="▶ continue de onde parou" dark />
    <Chips dark items={['assista onde quiser', 'progresso salvo']} bottom={310} />
    <Cta dark />
  </AbsoluteFill>
);

/* PR03 — IA que estuda com você (claro) */
export const PR03: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <OLightBg />
    <Logo />
    <Head2 l1={<>a IA que estuda</>} l2={<span style={{ color: O_RED }}>com você.</span>}
      sub="ela lê a aula aberta na sua tela — e responde na hora" />
    <div style={{ position: 'absolute', left: '50%', top: 610, transform: 'translateX(-50%)', zIndex: 4 }}>
      <PhoneFrame src="rec/ol_assist.mp4" width={520} startFrom={300} statusDark />
    </div>
    <Selo x={64} y={780} text="📝 resumo em 1 clique" />
    <Selo x={620} y={1010} text="🃏 flashcards do material" rot={2} />
    <Selo x={80} y={1240} text="📋 questões comentadas" rot={-2} />
    <Cta />
  </AbsoluteFill>
);

/* PR04 — cronograma em 3 respostas (claro) */
export const PR04: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <OLightBg />
    <Logo />
    <Head2 l1={<>seu ano de estudo,</>} l2={<span style={{ color: O_RED }}>planejado em 3 respostas.</span>}
      sub="objetivo · horas por semana · data da prova — a IA faz o resto" size={68} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 540, display: 'flex', justifyContent: 'center', gap: 14, zIndex: 8 }}>
      {['🎯 objetivo', '⏰ suas horas', '📅 sua prova'].map(c => (
        <div key={c} style={{
          background: WHITE, border: `2px solid ${O_RED}`, borderRadius: 999, padding: '12px 24px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: O_RED,
          boxShadow: '0 12px 32px -12px rgba(224,45,45,0.35)',
        }}>{c}</div>
      ))}
    </div>
    <div style={{ position: 'absolute', left: '50%', top: 660, transform: 'translateX(-50%)', zIndex: 4 }}>
      <PhoneFrame src="rec/ol_plano.mp4" width={520} startFrom={310} statusDark />
    </div>
    <Selo x={70} y={900} text="🧠 mapa mental navegável" />
    <Selo x={640} y={1180} text="✅ checklist semanal" rot={2} />
    <Cta />
  </AbsoluteFill>
);

/* PR05 — biblioteca colaborativa (claro) */
export const PR05: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <OLightBg />
    <Logo />
    <Head2 l1={<>uma biblioteca que</>} l2={<span style={{ color: O_RED }}>cresce todo dia.</span>}
      sub="+10.000 médicos e estudantes compartilhando material — e a busca acha até arquivo dentro das pastas" size={70} />
    <div style={{ position: 'absolute', left: '50%', top: 660, transform: 'translateX(-50%)', zIndex: 4 }}>
      <PhoneFrame src="rec/ol_acervo.mp4" width={520} startFrom={40} statusDark />
    </div>
    <Selo x={64} y={860} text="📤 Acervo Público" />
    <Selo x={660} y={1120} text="🔎 busca profunda" rot={2} />
    <Chips items={['materiais por categoria', 'de médico pra médico']} bottom={310} />
    <Cta />
  </AbsoluteFill>
);

/* PR06 — busca unificada (escuro) */
export const PR06: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <DarkBg />
    <Logo dark />
    <Head2 dark l1={<>pare de <span style={{ color: O_RED }}>garimpar</span> material.</>}
      sub="digita o tema uma vez — aula, livro e questão aparecem juntos" />
    <div style={{ position: 'absolute', left: '50%', top: 680, transform: 'translateX(-50%)', zIndex: 4 }}>
      <LaptopFrame src="rec/d_search.mp4" width={960} startFrom={180} />
    </div>
    <Selo x={90} y={1230} text="🔎 um tema, tudo junto" dark />
    <Selo x={620} y={620} text="⚡ sem 10 abas abertas" dark rot={2} />
    <Chips dark items={['+530 cursos', '+9.000 livros', 'busca unificada']} bottom={320} />
    <Cta dark />
  </AbsoluteFill>
);

/* PR07 — estudo ativo, dois celulares (claro) */
export const PR07: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <OLightBg />
    <Logo />
    <Head2 l1={<>estudo ativo,</>} l2={<span style={{ color: O_RED }}>sem montar nada.</span>}
      sub="a IA transforma a aula em flashcards e questões comentadas" />
    <div style={{ position: 'absolute', left: 100, top: 660, transform: 'rotate(-5deg)', zIndex: 4 }}>
      <PhoneFrame src="rec/ol_flash.mp4" width={430} startFrom={200} statusDark />
    </div>
    <div style={{ position: 'absolute', right: 100, top: 720, transform: 'rotate(5deg)', zIndex: 5 }}>
      <PhoneFrame src="rec/ol_quest.mp4" width={430} startFrom={200} statusDark />
    </div>
    <Selo x={90} y={600} text="🃏 flashcards" />
    <Selo x={700} y={660} text="📋 questões" rot={3} />
    <Cta />
  </AbsoluteFill>
);

/* PR08 — plantão (escuro) */
export const PR08: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <DarkBg />
    <Logo dark />
    <Head2 dark l1={<>o intervalo do plantão</>} l2={<span style={{ color: O_RED }}>virou revisão.</span>}
      sub="10 minutos no corredor rendem — flashcards e questões na palma da mão" />
    <div style={{ position: 'absolute', left: '50%', top: 640, transform: 'translateX(-50%) rotate(-2deg)', zIndex: 4 }}>
      <PhoneFrame src="rec/m_course.mp4" width={500} startFrom={100} />
    </div>
    <Selo x={80} y={800} text="⏱ cabe em 10 min" dark />
    <Selo x={650} y={1080} text="📶 na palma da mão" dark rot={2} />
    <Chips dark items={['revisão rápida', 'no seu ritmo', 'qualquer horário']} bottom={320} />
    <Cta dark />
  </AbsoluteFill>
);

/* PR09 — anotação no tablet (escuro) */
export const PR09: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <DarkBg />
    <Logo dark />
    <Head2 dark l1={<>anote <span style={{ color: O_RED }}>em cima</span> da apostila.</>}
      sub="caneta, marca-texto e borracha — direto na plataforma, salvo na sua conta" />
    <div style={{ position: 'absolute', left: '50%', top: 640, transform: 'translateX(-50%) rotate(-2deg)', zIndex: 4 }}>
      <TabletFrame src="rec/n_annot_tab.mp4" width={700} startFrom={430} />
    </div>
    <Selo x={80} y={780} text="🖊 grife como no papel" dark />
    <Selo x={640} y={1150} text="☁ salvo na sua conta" dark rot={2} />
    <Chips dark items={['no tablet ou no PC', 'suas anotações te esperam']} bottom={320} />
    <Cta dark />
  </AbsoluteFill>
);

/* PR10 — prova social + comunidade (escuro) */
export const PR10: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <DarkBg />
    <Logo dark />
    <Head2 dark l1={<>+10.000 médicos</>} l2={<span style={{ color: O_RED }}>já estudam assim.</span>}
      sub="comunidade ativa, material compartilhado e atualizações sem custo" />
    <div style={{ position: 'absolute', left: '50%', top: 630, transform: 'translateX(-50%)', zIndex: 4 }}>
      <PhoneFrame src="rec/m_community.mp4" width={500} startFrom={100} />
    </div>
    <div style={{ position: 'absolute', left: 30, top: 900, zIndex: 3, transform: 'rotate(-7deg)', opacity: 0.9 }}>
      <PhoneFrame src="rec/m_dashboard.mp4" width={280} startFrom={90} />
    </div>
    <div style={{ position: 'absolute', right: 30, top: 880, zIndex: 3, transform: 'rotate(7deg)', opacity: 0.9 }}>
      <PhoneFrame src="rec/m_search.mp4" width={280} startFrom={110} />
    </div>
    <Chips dark items={['comunidade ativa', 'dúvidas respondidas', 'atualizações sem custo']} bottom={320} />
    <Cta dark />
  </AbsoluteFill>
);

export const PROMOS: Array<[string, React.FC]> = [
  ['PR01-Trio', PR01], ['PR02-Continuidade', PR02], ['PR03-IA', PR03], ['PR04-Cronograma', PR04],
  ['PR05-Biblioteca', PR05], ['PR06-Busca', PR06], ['PR07-Ativo', PR07], ['PR08-Plantao', PR08],
  ['PR09-Anotacao', PR09], ['PR10-Comunidade', PR10],
];
