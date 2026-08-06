import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { PhoneFrame } from './DeviceFrames';
import { HEAD, BODY, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_BG, M_LIGHT, M_RED, WHITE } from './meduf';

/* ===== MX01–MX10: 10 composições RADICALMENTE diferentes para MEDUF (feed 1080×1350) ===== */

const SERIF = "Georgia, 'Times New Roman', serif";

/* crop de tela real sem moldura de dispositivo */
const Screen: React.FC<{ src: string; startFrom: number; style?: React.CSSProperties; pos?: string }> =
({ src, startFrom, style, pos = 'center top' }) => (
  <div style={{ overflow: 'hidden', position: 'relative', ...style }}>
    <OffthreadVideo src={staticFile(`rec/${src}.mp4`)} muted startFrom={startFrom}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos }} />
  </div>
);

const MiniLogo: React.FC<{ light?: boolean; x?: number; y?: number }> = ({ light, x = 48, y = 44 }) => (
  <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 10, zIndex: 20 }}>
    <div style={{
      width: 40, height: 40, borderRadius: 11, background: M_BLUE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: HEAD, fontWeight: 900, fontSize: 21, color: WHITE,
    }}>M</div>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 25, letterSpacing: -0.5 }}>
      <span style={{ color: light ? WHITE : M_NAVY }}>MEDUF</span> <span style={{ color: light ? '#8ab2f8' : M_BLUE }}>AI</span>
    </span>
  </div>
);

/* MX01 — SPLIT EDITORIAL: navy à esquerda, tela sangrada à direita */
export const MX01: React.FC = () => (
  <AbsoluteFill style={{ background: M_NAVY, overflow: 'hidden' }}>
    <Screen src="mg_chat" startFrom={640} style={{ position: 'absolute', right: 0, top: 0, width: 470, height: 1350 }} />
    <div style={{ position: 'absolute', left: 0, top: 0, width: 640, height: 1350, background: M_NAVY, clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)' }} />
    <MiniLogo light />
    <div style={{ position: 'absolute', left: 48, top: 300, width: 500 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 88, color: WHITE, letterSpacing: -3, lineHeight: 1.04 }}>
        a<br />ferramenta<br />que você<br />abre<br /><span style={{ color: '#6ea8ff' }}>às pressas.</span>
      </div>
      <div style={{ fontFamily: BODY, fontSize: 27, color: '#9fb3d8', marginTop: 34, lineHeight: 1.45, maxWidth: 430 }}>
        17 recursos clínicos com IA, prontos no seu bolso.
      </div>
      <div style={{ marginTop: 60, fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: WHITE }}>
        Teste grátis — 30 min, sem cartão
      </div>
      <div style={{ marginTop: 10, fontFamily: MONO, fontWeight: 700, fontSize: 23, color: '#6ea8ff' }}>meduf.com.br</div>
    </div>
  </AbsoluteFill>
);

/* MX02 — A CONVERSA É A ARTE: bolhas gigantes, sem dispositivo */
export const MX02: React.FC = () => (
  <AbsoluteFill style={{ background: M_BG, overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.6,
      backgroundImage: 'radial-gradient(rgba(14,27,51,0.06) 1.4px, transparent 1.4px)', backgroundSize: '44px 44px',
    }} />
    <MiniLogo />
    <div style={{ position: 'absolute', left: 130, right: 70, top: 200 }}>
      <div style={{
        marginLeft: 'auto', maxWidth: 700, background: M_BLUE, color: WHITE,
        borderRadius: '34px 34px 8px 34px', padding: '38px 44px', transform: 'rotate(-0.6deg)',
        boxShadow: '0 24px 60px -18px rgba(21,96,232,0.5)',
        fontFamily: HEAD, fontWeight: 700, fontSize: 35, lineHeight: 1.35,
      }}>
        Paciente 45 anos, cefaleia súbita intensa com rigidez de nuca. Conduta inicial?
      </div>
    </div>
    <div style={{ position: 'absolute', left: 70, right: 130, top: 520 }}>
      <div style={{
        maxWidth: 780, background: WHITE, color: M_NAVY,
        borderRadius: '34px 34px 34px 8px', padding: '40px 46px', transform: 'rotate(0.5deg)',
        border: '1.5px solid rgba(14,27,51,0.1)',
        boxShadow: '0 24px 60px -20px rgba(14,27,51,0.25)',
        fontFamily: HEAD, fontWeight: 700, fontSize: 33, lineHeight: 1.42,
      }}>
        Suspeita de <span style={{ color: M_BLUE }}>hemorragia subaracnóidea</span>. As diretrizes indicam: TC de crânio sem contraste imediata; se negativa, punção lombar. Considerar controle pressórico e analgesia.
        <div style={{ marginTop: 22, fontFamily: BODY, fontWeight: 400, fontSize: 21, color: M_MUT }}>
          resposta gerada com IA — apoio à decisão. a conduta é sempre sua.
        </div>
      </div>
    </div>
    <div style={{
      position: 'absolute', left: 70, right: 70, bottom: 96, height: 96,
      background: WHITE, borderRadius: 999, border: `2.5px solid ${M_BLUE}`,
      display: 'flex', alignItems: 'center', padding: '0 20px 0 40px', justifyContent: 'space-between',
      boxShadow: '0 20px 50px -16px rgba(21,96,232,0.4)',
    }}>
      <span style={{ fontFamily: BODY, fontSize: 29, color: M_MUT }}>descreva o caso — teste 30 min grátis</span>
      <div style={{ width: 64, height: 64, borderRadius: 999, background: M_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none"><path d="M3 12l18-8-7 18-3-7-8-3z" fill={WHITE} /></svg>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 22, color: M_BLUE }}>
      meduf.com.br
    </div>
  </AbsoluteFill>
);

/* MX03 — RECEITUÁRIO carimbado */
export const MX03: React.FC = () => (
  <AbsoluteFill style={{ background: M_NAVY, overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', width: 1100, height: 1100, borderRadius: 999, top: -400, right: -400,
      background: 'radial-gradient(circle, rgba(21,96,232,0.25), transparent 62%)',
    }} />
    <MiniLogo light />
    <div style={{ position: 'absolute', right: 60, top: 52, fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE, zIndex: 20 }}>
      antes de assinar, <span style={{ color: '#6ea8ff' }}>cheque.</span>
    </div>
    <div style={{
      position: 'absolute', left: '50%', top: 170, width: 780, transform: 'translateX(-50%) rotate(-2.5deg)',
      background: '#fdfcf8', borderRadius: 8, padding: '54px 60px 46px',
      boxShadow: '0 60px 120px -30px rgba(0,0,0,0.6)',
    }}>
      <div style={{ borderBottom: '3px solid #16223a', paddingBottom: 18 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: '#16223a' }}>RECEITUÁRIO</div>
        <div style={{ fontFamily: SERIF, fontSize: 20, color: '#6b7280', marginTop: 4 }}>uso interno — via oral</div>
      </div>
      {[
        ['1.', 'Varfarina 5 mg', '1 comprimido, 1x ao dia'],
        ['2.', 'Amiodarona 200 mg', '1 comprimido, 1x ao dia'],
      ].map(([n, drug, pos], i) => (
        <div key={i} style={{ marginTop: 40 }}>
          <div style={{ fontFamily: SERIF, fontSize: 33, color: '#16223a' }}>
            <b>{n}</b> {drug} <span style={{ float: 'right', color: '#475569', fontSize: 26 }}>{pos}</span>
          </div>
          <div style={{ borderBottom: '1.5px dashed #b6bcc8', marginTop: 12 }} />
        </div>
      ))}
      <div style={{ height: 190, position: 'relative' }}>
        <div style={{
          position: 'absolute', right: 6, top: 44, transform: 'rotate(7deg)',
          border: `6px double ${M_RED}`, borderRadius: 10, padding: '16px 26px', opacity: 0.92,
          color: M_RED, fontFamily: HEAD, fontWeight: 900, fontSize: 34, letterSpacing: 1,
          background: 'rgba(224,36,36,0.05)',
        }}>
          INTERAÇÃO GRAVE<br /><span style={{ fontSize: 22, letterSpacing: 0.5 }}>RISCO DE SANGRAMENTO — REVISAR</span>
        </div>
      </div>
      <div style={{ borderTop: '1.5px solid #d4d8e0', paddingTop: 18, fontFamily: BODY, fontSize: 21, color: '#475569' }}>
        sinalizado em segundos pelo checador de interações da MEDUF
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, textAlign: 'center', zIndex: 20 }}>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 26, color: WHITE }}>Teste grátis — 30 min, sem cartão · </span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: '#6ea8ff' }}>meduf.com.br</span>
    </div>
  </AbsoluteFill>
);

/* MX04 — CARTAZ TIPOGRÁFICO */
export const MX04: React.FC = () => (
  <AbsoluteFill style={{ background: WHITE, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 26, background: M_BLUE }} />
    <div style={{ position: 'absolute', left: 90, top: 90 }}>
      {['ECG.', 'RAIO-X.', 'LAUDO.', 'DOSE.', 'INTERAÇÃO.'].map((l, i) => (
        <div key={i} style={{
          fontFamily: HEAD, fontWeight: 900, fontSize: 138, color: M_NAVY,
          letterSpacing: -5, lineHeight: 1.02,
          opacity: 1 - i * 0.13,
        }}>{l}</div>
      ))}
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 138, color: M_BLUE, letterSpacing: -5, lineHeight: 1.02, marginTop: 10 }}>
        TUDO.<br />COM IA.
      </div>
    </div>
    <div style={{ position: 'absolute', right: 64, top: 96, transform: 'rotate(90deg)', transformOrigin: 'right top', fontFamily: HEAD, fontWeight: 900, fontSize: 27, color: M_NAVY, letterSpacing: 3 }}>
      MEDUF AI
    </div>
    <div style={{ position: 'absolute', left: 90, right: 70, bottom: 66, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `3px solid ${M_NAVY}`, paddingTop: 24 }}>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 22, color: M_NAVY }}>17 ferramentas · apoio à sua decisão — a conduta é sua</span>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24, color: M_NAVY }}>teste 30 min grátis</span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: M_BLUE }}>meduf.com.br</span>
    </div>
  </AbsoluteFill>
);

/* MX05 — ANTES / DEPOIS */
export const MX05: React.FC = () => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 620, background: '#dfe3ea' }}>
      {[
        { x: 90, y: 150, r: -7, t: '6 sites' }, { x: 420, y: 110, r: 4, t: '4 logins' },
        { x: 700, y: 170, r: -3, t: '10 abas' }, { x: 240, y: 340, r: 5, t: 'grupo do zap' },
        { x: 620, y: 380, r: -6, t: 'PDF perdido' },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', left: c.x, top: c.y, transform: `rotate(${c.r}deg)`,
          background: WHITE, borderRadius: 14, padding: '20px 34px',
          boxShadow: '0 14px 34px -14px rgba(14,27,51,0.35)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: '#5b6575',
        }}>{c.t}</div>
      ))}
      <div style={{ position: 'absolute', left: 48, top: 44, fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: '#5b6575', letterSpacing: 2 }}>ANTES</div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 620, bottom: 0, background: `linear-gradient(160deg, ${M_BLUE}, #0c46b8)` }}>
      <div style={{ position: 'absolute', left: 48, top: 40, fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: WHITE, letterSpacing: 2 }}>DEPOIS</div>
      <Screen src="mf_tools" startFrom={230} style={{
        position: 'absolute', left: 96, top: 116, width: 400, height: 520,
        borderRadius: 26, boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)',
      }} />
      <div style={{ position: 'absolute', left: 560, top: 200, width: 450 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: WHITE, letterSpacing: -3, lineHeight: 1.05 }}>
          uma<br />tela.
        </div>
        <div style={{ fontFamily: BODY, fontSize: 27, color: 'rgba(255,255,255,0.85)', marginTop: 24, lineHeight: 1.45 }}>
          17 ferramentas clínicas com IA, no mesmo lugar.
        </div>
        <div style={{ marginTop: 44, background: WHITE, display: 'inline-block', borderRadius: 999, padding: '16px 34px', fontFamily: HEAD, fontWeight: 900, fontSize: 25, color: M_BLUE }}>
          Teste grátis — 30 min
        </div>
        <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 700, fontSize: 23, color: WHITE }}>meduf.com.br</div>
      </div>
    </div>
  </AbsoluteFill>
);

/* MX06 — ZOOM NA RESPOSTA (lupa tipográfica) */
export const MX06: React.FC = () => (
  <AbsoluteFill style={{ background: M_LIGHT, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: -40, top: 150, fontFamily: SERIF, fontSize: 560, color: 'rgba(21,96,232,0.10)', lineHeight: 1 }}>“</div>
    <MiniLogo />
    <div style={{ position: 'absolute', right: 60, top: 48, width: 420, textAlign: 'right', fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: M_NAVY, lineHeight: 1.3, zIndex: 20 }}>
      escrito pela IA <span style={{ color: M_BLUE }}>em segundos.</span><br />lido com a calma que o caso pede.
    </div>
    <div style={{
      position: 'absolute', left: 90, right: 90, top: 330,
      background: WHITE, borderRadius: 30, padding: '70px 74px', transform: 'rotate(-1deg)',
      boxShadow: '0 50px 110px -30px rgba(14,27,51,0.3)',
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 52, color: M_NAVY, lineHeight: 1.42 }}>
        “<span style={{ background: 'rgba(21,96,232,0.16)', boxShadow: `inset 0 -4px 0 ${M_BLUE}` }}>TC de crânio sem contraste é o exame inicial de escolha</span>; a sensibilidade do método cai após as primeiras horas do ictus — se negativa, prosseguir com punção lombar.”
      </div>
      <div style={{ marginTop: 40, fontFamily: BODY, fontSize: 23, color: M_MUT }}>
        exemplo de resposta do Assistente Clínico MEDUF — apoio à decisão
      </div>
    </div>
    <div style={{
      position: 'absolute', right: 130, top: 268, width: 210, height: 210, borderRadius: 999,
      border: `7px solid ${M_BLUE}`, zIndex: 15,
      boxShadow: '0 30px 70px -20px rgba(21,96,232,0.45), inset 0 0 0 3px rgba(255,255,255,0.6)',
    }}>
      <div style={{ position: 'absolute', right: -14, bottom: -74, width: 16, height: 100, background: M_BLUE, borderRadius: 8, transform: 'rotate(-38deg)' }} />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, textAlign: 'center' }}>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 26, color: M_NAVY }}>Teste grátis — 30 min, sem cartão · </span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: M_BLUE }}>meduf.com.br</span>
    </div>
  </AbsoluteFill>
);

/* MX07 — COLAGEM POLAROID */
export const MX07: React.FC = () => {
  const shots: Array<{ src: string; f: number; x: number; y: number; r: number; cap: string }> = [
    { src: 'mg_chat', f: 640, x: 40, y: 140, r: -7, cap: 'chat clínico' },
    { src: 'mg_ecg', f: 700, x: 600, y: 110, r: 5, cap: 'análise de ECG' },
    { src: 'mg_rx', f: 680, x: 90, y: 620, r: 4, cap: 'radiografia' },
    { src: 'mg_lab', f: 620, x: 640, y: 600, r: -5, cap: 'laudos e exames' },
    { src: 'mg_diag', f: 700, x: 350, y: 900, r: -2, cap: 'hipóteses diagnósticas' },
  ];
  return (
    <AbsoluteFill style={{ background: M_BG, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(rgba(14,27,51,0.07) 1.4px, transparent 1.4px)', backgroundSize: '44px 44px',
      }} />
      {shots.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: s.x, top: s.y, transform: `rotate(${s.r}deg)`,
          background: WHITE, padding: '14px 14px 0', borderRadius: 6,
          boxShadow: '0 30px 60px -20px rgba(14,27,51,0.35)',
        }}>
          <Screen src={s.src} startFrom={s.f} style={{ width: 340, height: 300, borderRadius: 4 }} />
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_NAVY, textAlign: 'center', padding: '12px 0 14px' }}>{s.cap}</div>
          <div style={{
            position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%) rotate(-3deg)',
            width: 130, height: 36, background: 'rgba(21,96,232,0.25)', borderRadius: 3,
          }} />
        </div>
      ))}
      <div style={{
        position: 'absolute', left: '50%', top: 512, transform: 'translateX(-50%) rotate(1.5deg)', zIndex: 10,
        background: M_NAVY, borderRadius: 20, padding: '34px 48px', textAlign: 'center',
        boxShadow: '0 40px 90px -24px rgba(14,27,51,0.6)',
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: WHITE, letterSpacing: -1.5 }}>
          escolha por onde <span style={{ color: '#6ea8ff' }}>começar.</span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: 24, color: '#9fb3d8', marginTop: 10 }}>
          17 ferramentas no teste grátis de 30 min — meduf.com.br
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* MX08 — DIÁRIO DE PLANTÃO (só narrativa) */
export const MX08: React.FC = () => (
  <AbsoluteFill style={{ background: M_NAVY, overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', width: 1000, height: 1000, borderRadius: 999, bottom: -420, left: -300,
      background: 'radial-gradient(circle, rgba(21,96,232,0.22), transparent 62%)',
    }} />
    <div style={{
      position: 'absolute', left: '50%', top: 120, transform: 'translateX(-50%) rotate(0.8deg)',
      width: 840, background: '#fbf9f3', borderRadius: 10, padding: '80px 76px 60px',
      boxShadow: '0 60px 130px -30px rgba(0,0,0,0.65)',
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 62px, rgba(21,96,232,0.16) 63px)',
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 40, color: '#1d2942', lineHeight: '63px' }}>
        3h. PS lotado. Um ECG na mão e aquela dúvida que não sai.
        Você abre o chat, cola o caso... e em segundos tem uma
        segunda leitura pra confrontar com a sua. Confere, decide,
        segue. O plantão continua — <i>você, um pouco menos sozinho.</i>
      </div>
      <div style={{ marginTop: 46, textAlign: 'right', fontFamily: SERIF, fontStyle: 'italic', fontSize: 28, color: '#5b6575' }}>
        — toda noite, em 27 estados.
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 58, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: M_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 23, color: WHITE }}>M</div>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE }}>MEDUF AI · Teste grátis — 30 min</span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: '#6ea8ff' }}>meduf.com.br</span>
    </div>
  </AbsoluteFill>
);

/* MX09 — FICHA TÉCNICA EDITORIAL: hairlines, numerais gigantes, small caps */
export const MX09: React.FC = () => {
  const LINE = 'rgba(14,27,51,0.16)';
  const cell = (n: string, l: string, accent?: boolean): React.ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 74, height: '100%' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 168, color: accent ? M_BLUE : M_NAVY, letterSpacing: -7, lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 25, color: M_MUT, letterSpacing: 4, marginTop: 14, textTransform: 'uppercase' }}>{l}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: WHITE, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 74, top: 66, right: 74, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1.5px solid ${LINE}`, paddingBottom: 26 }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, letterSpacing: -0.5 }}>MEDUF <span style={{ color: M_BLUE }}>AI</span></span>
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 21, color: M_MUT, letterSpacing: 4, textTransform: 'uppercase' }}>ficha técnica</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 160, bottom: 200 }}>
        <div style={{ position: 'absolute', left: 74, right: 74, top: '50%', borderTop: `1.5px solid ${LINE}` }} />
        <div style={{ position: 'absolute', top: 40, bottom: 40, left: '50%', borderLeft: `1.5px solid ${LINE}` }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '50%' }}>{cell('17', 'ferramentas clínicas')}</div>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: '50%', height: '50%' }}>{cell('3', 'IAs integradas')}</div>
        <div style={{ position: 'absolute', left: 0, top: '50%', width: '50%', height: '50%' }}>{cell('35M+', 'artigos no PubMed', true)}</div>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: '50%', height: '50%' }}>{cell('24/7', 'disponível')}</div>
      </div>
      <div style={{ position: 'absolute', left: 74, right: 74, bottom: 70, borderTop: `1.5px solid ${LINE}`, paddingTop: 26, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 23, color: M_NAVY }}>Teste grátis — 30 min, sem cartão</span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 23, color: M_BLUE }}>meduf.com.br</span>
      </div>
    </AbsoluteFill>
  );
};

/* MX10 — FAIXA DIAGONAL SANGRADA: só a tela, atravessando o quadro */
export const MX10: React.FC = () => (
  <AbsoluteFill style={{ background: M_NAVY, overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', width: 1300, height: 1300, borderRadius: 999, top: -400, left: -300,
      background: 'radial-gradient(circle, rgba(21,96,232,0.28), transparent 60%)',
    }} />
    <div style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%) rotate(-24deg)', zIndex: 4 }}>
      <div style={{ position: 'relative', boxShadow: '0 70px 140px -30px rgba(0,0,0,0.7)' }}>
        <Screen src="mg_ecg" startFrom={730} style={{ width: 1720, height: 480 }} pos="center 30%" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(14,27,51,0.85) 0%, transparent 18%, transparent 82%, rgba(14,27,51,0.85) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: -3, height: 6, background: M_BLUE }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -3, height: 6, background: M_BLUE }} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: 60, top: 100, zIndex: 8, fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: WHITE, letterSpacing: -3, lineHeight: 1.05 }}>
      respostas na
    </div>
    <div style={{ position: 'absolute', right: 60, bottom: 200, zIndex: 8, textAlign: 'right', fontFamily: HEAD, fontWeight: 900, fontSize: 96, letterSpacing: -3, lineHeight: 1.05 }}>
      <span style={{ color: '#6ea8ff' }}>velocidade</span><br /><span style={{ color: WHITE }}>da dúvida.</span>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, textAlign: 'center', zIndex: 9 }}>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE }}>MEDUF AI · Teste grátis — 30 min, sem cartão · </span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: '#6ea8ff' }}>meduf.com.br</span>
    </div>
  </AbsoluteFill>
);

export const MEDUF_X: Array<[string, React.FC]> = [
  ['MX01-Editorial', MX01], ['MX02-Conversa', MX02], ['MX03-Receituario', MX03], ['MX04-Cartaz', MX04],
  ['MX05-AntesDepois', MX05], ['MX06-Zoom', MX06], ['MX07-Colagem', MX07], ['MX08-Diario', MX08],
  ['MX09-Mosaico', MX09], ['MX10-Diagonal', MX10],
];
