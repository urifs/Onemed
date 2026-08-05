import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PhoneFrame } from './DeviceFrames';
import { HEAD, BODY, MONO } from './theme';
import { OLightBg, OLogo, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';

/* ============ imagens publicitárias 1080×1350 (4:5) — estáticas ============ */

const Head: React.FC<{ line1: React.ReactNode; line2?: React.ReactNode; size?: number; top?: number }> =
({ line1, line2, size = 74, top = 150 }) => (
  <div style={{ position: 'absolute', left: 56, right: 56, top, textAlign: 'center', zIndex: 5 }}>
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: O_INK, letterSpacing: -2.2, lineHeight: 1.14 }}>
      {line1}{line2 && <><br />{line2}</>}
    </div>
  </div>
);

const Footer: React.FC<{ chips?: string[] }> = ({ chips = ['+530 cursos', '+9.000 livros', 'IA de estudo'] }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 6 }}>
    <div style={{ display: 'flex', gap: 12 }}>
      {chips.map(c => (
        <div key={c} style={{
          background: WHITE, border: '1.5px solid rgba(22,24,29,0.12)', borderRadius: 999,
          padding: '10px 22px', fontFamily: HEAD, fontWeight: 700, fontSize: 21, color: O_INK,
          boxShadow: '0 8px 24px -10px rgba(22,24,29,0.18)',
        }}>{c}</div>
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <div style={{
        background: O_RED, borderRadius: 999, padding: '16px 42px',
        boxShadow: '0 16px 44px -12px rgba(224,45,45,0.55)',
        fontFamily: HEAD, fontWeight: 900, fontSize: 27, color: WHITE,
      }}>Teste grátis agora</div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: O_RED }}>onemedcursos.com.br</div>
    </div>
  </div>
);

const Brand: React.FC = () => (
  <div style={{ position: 'absolute', top: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 6 }}>
    <OLogo size={54} />
  </div>
);

const Tag: React.FC<{ x: number; y: number; text: string; red?: boolean; z?: number; size?: number }> =
({ x, y, text, red, z = 7, size = 23 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, zIndex: z,
    background: red ? O_RED : WHITE, border: red ? 'none' : '2px solid rgba(22,24,29,0.12)',
    borderRadius: 14, padding: '10px 18px',
    boxShadow: red ? '0 14px 38px -10px rgba(224,45,45,0.5)' : '0 12px 30px -10px rgba(22,24,29,0.22)',
    fontFamily: HEAD, fontWeight: 800, fontSize: size, color: red ? WHITE : O_INK, whiteSpace: 'nowrap',
  }}>{text}</div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <OLightBg />
    {children}
  </AbsoluteFill>
);

/* AD01 — MAPA MENTAL (tela real do cronograma) */
export const AD01: React.FC = () => (
  <Shell>
    <Brand />
    <Head line1={<>um ano de estudo.</>} line2={<span style={{ color: O_RED }}>numa tela.</span>} />
    <div style={{ position: 'absolute', left: '50%', top: 385, transform: 'translateX(-50%)' }}>
      <PhoneFrame src="rec/ol_plano.mp4" width={470} startFrom={310} statusDark />
    </div>
    <Tag x={62} y={470} text="🧠 mapa mental do plano inteiro" red />
    <Tag x={640} y={880} text="semanas · marcos · checklist" />
    <Footer chips={['objetivo', 'suas horas', 'data da prova']} />
  </Shell>
);

/* AD02 — MESA (flat-lay que vira app) */
export const AD02: React.FC = () => (
  <Shell>
    <Brand />
    <Head line1="sua mesa inteira" line2={<span style={{ color: O_RED }}>cabe aqui dentro.</span>} />
    {/* itens da mesa ao redor do celular */}
    {[
      { x: 70, y: 460, r: -9, w: 250, t: 'Apostila — Cardio' },
      { x: 740, y: 450, r: 7, w: 240, t: 'Apostila — Nefro' },
      { x: 60, y: 990, r: 6, w: 260, t: 'Caderno de resumos' },
      { x: 750, y: 1000, r: -7, w: 240, t: 'Provas antigas' },
    ].map((c, i) => (
      <div key={i} style={{
        position: 'absolute', left: c.x, top: c.y, width: c.w, height: 150,
        transform: `rotate(${c.r}deg)`, background: '#f3ede2', borderRadius: 14,
        boxShadow: '0 16px 40px -14px rgba(22,24,29,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: BODY, fontWeight: 700, fontSize: 21, color: '#6b665c',
      }}>{c.t}</div>
    ))}
    {[[350, 430], [690, 660], [330, 1090]].map(([x, y], i) => (
      <div key={i} style={{ position: 'absolute', left: x, top: y, width: 74, height: 74, background: '#f5df8f', borderRadius: 10, transform: `rotate(${i * 14 - 12}deg)`, boxShadow: '0 10px 26px -10px rgba(22,24,29,0.3)' }} />
    ))}
    <div style={{ position: 'absolute', left: '50%', top: 500, transform: 'translateX(-50%)' }}>
      <PhoneFrame src="rec/ol_dash.mp4" width={440} startFrom={30} statusDark />
    </div>
    <Footer chips={['apostilas → cursos', 'post-its → flashcards', 'caderno → resumos']} />
  </Shell>
);

/* AD03 — 3 TOQUES */
export const AD03: React.FC = () => (
  <Shell>
    <Brand />
    <Head line1={<>a regra dos <span style={{ color: O_RED }}>3 toques.</span></>} top={170} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', gap: 30 }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          width: 150, height: 150, borderRadius: 999, background: O_RED,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 24px 60px -16px rgba(224,45,45,0.5)',
          fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE,
        }}>{n}</div>
      ))}
    </div>
    <div style={{ position: 'absolute', left: 90, right: 90, top: 560 }}>
      {[
        ['🎬', 'qualquer aula, de +530 cursos'],
        ['📚', 'qualquer livro, de +9.000'],
        ['🧠', 'o mapa mental do seu plano'],
        ['📄', 'qualquer arquivo do acervo — a busca procura lá dentro'],
      ].map(([ic, tx], i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 20, background: WHITE,
          border: '1.5px solid rgba(22,24,29,0.1)', borderRadius: 18, padding: '20px 26px',
          marginBottom: 16, boxShadow: '0 12px 32px -14px rgba(22,24,29,0.18)',
          fontFamily: HEAD, fontWeight: 700, fontSize: 27, color: O_INK,
        }}>
          <span style={{ fontSize: 34 }}>{ic}</span>{tx}
        </div>
      ))}
      <div style={{ textAlign: 'center', marginTop: 26, fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: O_INK }}>
        nada fica a mais de <span style={{ color: O_RED }}>3 toques</span> de você.
      </div>
    </div>
    <Footer />
  </Shell>
);

/* AD04 — ACERVO (tela real) */
export const AD04: React.FC = () => (
  <Shell>
    <Brand />
    <Head line1={<>a biblioteca que</>} line2={<span style={{ color: O_RED }}>cresce todo dia.</span>} />
    <div style={{ position: 'absolute', left: '50%', top: 385, transform: 'translateX(-50%)' }}>
      <PhoneFrame src="rec/ol_acervo.mp4" width={470} startFrom={40} statusDark />
    </div>
    <Tag x={56} y={480} text="📤 +10.000 médicos alimentando" red />
    <Tag x={620} y={900} text="curtidas · comentários · views" />
    <Tag x={70} y={1010} text="🔎 a busca acha DENTRO dos materiais" />
    <Footer chips={['Acervo Público', 'materiais por categoria', 'de médico pra médico']} />
  </Shell>
);

/* AD05 — 168 HORAS */
export const AD05: React.FC = () => {
  const SEGS = [
    { label: 'plantão', h: 36, color: '#c9d2dd' },
    { label: 'faculdade', h: 30, color: '#d8cfc4' },
    { label: 'sono', h: 49, color: '#cfd8cf' },
    { label: 'deslocamento', h: 12, color: '#ddd1da' },
    { label: 'família', h: 25, color: '#d3cfe0' },
  ];
  const total = 168, H = 730;
  let acc = 0;
  const rows = SEGS.map(s => { const y = acc; acc += s.h; return { ...s, y }; });
  const usado = acc;
  return (
    <Shell>
      <Brand />
      <Head line1={<>sua semana tem <span style={{ color: O_RED }}>168h.</span></>} top={150} size={68} />
      <div style={{ position: 'absolute', left: 200, top: 320, width: 165, height: H, borderRadius: 20, background: '#eceff3', overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(22,24,29,0.08)' }}>
        {rows.map((s, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (s.y / total) * H, height: (s.h / total) * H, background: s.color }} />
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, top: (usado / total) * H, height: ((total - usado) / total) * H, background: O_RED }} />
      </div>
      <div style={{ position: 'absolute', left: 430, top: 350 }}>
        {rows.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: s.color }} />
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 27, color: O_INK }}>{s.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 22, color: O_MUT }}>{s.h}h</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: O_RED }} />
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 31, color: O_RED }}>estudo ≈16h</span>
        </div>
        <div style={{ marginTop: 30, fontFamily: HEAD, fontWeight: 800, fontSize: 31, color: O_INK, lineHeight: 1.3, maxWidth: 420 }}>
          fininha.<br /><span style={{ color: O_RED }}>e é ela que decide.</span>
        </div>
        <div style={{ marginTop: 24, fontFamily: BODY, fontSize: 24, color: O_MUT, maxWidth: 430, lineHeight: 1.45 }}>
          resumo em 1 clique, flashcards, questões comentadas e cronograma com mapa mental — pra fatia render o dobro.
        </div>
      </div>
      <Footer chips={['mais horas, não', 'horas que rendem']} />
    </Shell>
  );
};

/* AD06 — CURVA DO ESQUECIMENTO */
export const AD06: React.FC = () => {
  const W = 880, H = 420, X0 = 100;
  const pts: string[] = [];
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    let mem = 100 * Math.exp(-s * 6);
    if (s > 0.34) mem += 30 * Math.exp(-(s - 0.34) * 3.2);
    if (s > 0.62) mem += 32 * Math.exp(-(s - 0.62) * 2.4);
    if (s > 0.86) mem += 30 * Math.exp(-(s - 0.86) * 2.0);
    mem = Math.min(100, mem);
    pts.push(`${X0 + W * s},${70 + H * (1 - mem / 100)}`);
  }
  return (
    <Shell>
      <Brand />
      <Head line1={<>você vai <span style={{ color: O_RED }}>esquecer</span></>} line2="este anúncio." />
      <div style={{ position: 'absolute', left: 0, top: 420 }}>
        <svg width={1080} height={560}>
          {[0, 50, 100].map(g => (
            <line key={g} x1={X0} y1={70 + H * (1 - g / 100)} x2={X0 + W} y2={70 + H * (1 - g / 100)} stroke="rgba(22,24,29,0.08)" strokeWidth={1.5} />
          ))}
          <text x={X0} y={50} fontFamily={BODY} fontSize={22} fill={O_MUT}>sua memória</text>
          <polyline points={pts.join(' ')} fill="none" stroke={O_RED} strokeWidth={6} strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 5px 12px rgba(224,45,45,0.35))' }} />
        </svg>
        <Tag x={330} y={260} text="🃏 flashcards ↑" red size={22} />
        <Tag x={565} y={205} text="📋 questões ↑" red size={22} />
        <Tag x={770} y={150} text="🧠 cronograma ↑" red size={22} />
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 1020, textAlign: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: O_INK }}>
        o que você <span style={{ color: O_RED }}>revisar</span>... não.
      </div>
      <Footer chips={['revisão ativa', 'gerada do seu material']} />
    </Shell>
  );
};

/* AD07 — TABULEIRO */
export const AD07: React.FC = () => {
  const CELLS: Array<{ label: string; type?: 'trap' | 'prova' }> = [
    { label: 'sem 1' }, { label: 'sem 2' }, { label: 'sem 3' }, { label: 'só reler: −3', type: 'trap' },
    { label: 'sem 5' }, { label: 'sem 6' }, { label: 'perdeu a vez', type: 'trap' }, { label: 'sem 8' },
    { label: 'sem 9' }, { label: 'sem 10' }, { label: 'sem 11' }, { label: 'PROVA', type: 'prova' },
  ];
  return (
    <Shell>
      <Brand />
      <Head line1={<>sua prova é a</>} line2={<span style={{ color: O_RED }}>última casa.</span>} />
      <div style={{ position: 'absolute', left: 70, right: 70, top: 420, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {CELLS.map((c, i) => (
          <div key={i} style={{
            height: 150, borderRadius: 18,
            background: c.type === 'prova' ? O_RED : c.type === 'trap' ? '#fdeaea' : WHITE,
            border: c.type === 'trap' ? `2px solid ${O_RED}55` : '1.5px solid rgba(22,24,29,0.1)',
            boxShadow: c.type === 'prova' ? '0 20px 50px -14px rgba(224,45,45,0.5)' : '0 10px 28px -12px rgba(22,24,29,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            fontFamily: HEAD, fontWeight: c.type ? 900 : 700, fontSize: c.type === 'prova' ? 30 : 22,
            color: c.type === 'prova' ? WHITE : c.type === 'trap' ? O_RED : O_INK,
            padding: 8,
          }}>{c.label}</div>
        ))}
      </div>
      <Tag x={90} y={1000} text="🪜 escada do resumo" red />
      <Tag x={90} y={1052} text="🤸 trampolim dos flashcards" red />
      <Tag x={90} y={1104} text="🌉 ponte do cronograma + mapa mental" red />
      <div style={{ position: 'absolute', right: 90, top: 1035, fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: O_INK, textAlign: 'right', lineHeight: 1.35 }}>
        a prova não muda de lugar.<br /><span style={{ color: O_RED }}>o caminho, sim.</span>
      </div>
      <Footer chips={['+10.000 jogando junto']} />
    </Shell>
  );
};

/* AD08 — SPEEDRUN (tela real de questões) */
export const AD08: React.FC = () => (
  <Shell>
    <Brand />
    <Head line1={<>6 ferramentas.</>} line2={<span style={{ color: O_RED }}>60 segundos.</span>} />
    <div style={{ position: 'absolute', left: '50%', top: 460, transform: 'translateX(-50%)' }}>
      <PhoneFrame src="rec/ol_quest.mp4" width={470} startFrom={200} statusDark />
    </div>
    <div style={{
      position: 'absolute', right: 60, top: 420, zIndex: 7,
      background: O_INK, borderRadius: 16, padding: '12px 24px',
      boxShadow: '0 14px 40px -10px rgba(22,24,29,0.4)',
      fontFamily: MONO, fontWeight: 700, fontSize: 34, color: WHITE,
    }}>0:42.10</div>
    <div style={{ position: 'absolute', left: 56, top: 500, zIndex: 7, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {['busca 0:06', 'resumo 0:12', 'flashcards 0:18', 'questões 0:25', 'assistente 0:31', 'cronograma 0:39'].map((s, i) => (
        <div key={i} style={{
          background: WHITE, border: `2px solid ${i === 3 ? O_RED : 'rgba(22,24,29,0.1)'}`,
          borderRadius: 999, padding: '8px 18px', fontFamily: MONO, fontWeight: 700,
          fontSize: 20, color: i === 3 ? O_RED : O_INK,
          boxShadow: '0 8px 24px -10px rgba(22,24,29,0.2)',
        }}>{`${i + 1}. ${s}`}</div>
      ))}
    </div>
    <Footer chips={['e ainda sobra tempo']} />
  </Shell>
);

/* AD09 — NÚMEROS */
export const AD09: React.FC = () => (
  <Shell>
    <Brand />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 210, color: O_INK, letterSpacing: -8, lineHeight: 1 }}>
        530<span style={{ color: O_RED }}>+</span>
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 38, color: O_MUT, marginTop: 4 }}>cursos completos</div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 210, color: O_INK, letterSpacing: -8, lineHeight: 1, marginTop: 70 }}>
        9.000<span style={{ color: O_RED }}>+</span>
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 38, color: O_MUT, marginTop: 4 }}>livros médicos</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 74 }}>
        <div style={{
          background: O_RED, borderRadius: 999, padding: '18px 46px',
          boxShadow: '0 18px 50px -12px rgba(224,45,45,0.5)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE,
        }}>
          num lugar só · com IA de estudo
        </div>
      </div>
    </div>
    <Footer chips={['+10.000 médicos', 'atualizações sem custo']} />
  </Shell>
);

/* AD10 — ASSISTENTE (tela real do chat) */
export const AD10: React.FC = () => (
  <Shell>
    <Brand />
    <Head line1={<>a IA que <span style={{ color: O_RED }}>lê</span> o que</>} line2="você está estudando." size={66} />
    <div style={{ position: 'absolute', left: '50%', top: 385, transform: 'translateX(-50%)' }}>
      <PhoneFrame src="rec/ol_assist.mp4" width={470} startFrom={300} statusDark />
    </div>
    <Tag x={56} y={470} text="💬 perguntou, respondeu" red />
    <Tag x={620} y={920} text="sobre a AULA aberta na tela" />
    <Footer chips={['assistente 24h', 'flashcards e resumos por IA']} />
  </Shell>
);
