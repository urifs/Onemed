import React from 'react';
import { AbsoluteFill } from 'remotion';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_BG, M_GREEN, M_RED, WHITE } from './meduf';

/* ============================================================
   Kit MEDUF UI — a interface CLARA do app, recriada fielmente
   para demonstrar as ferramentas em uso: entrada de dados,
   consenso das 3 IAs (GPT · Claude · Gemini) e resultado com
   referências (PubMed · SUS/PCDT · RENAME).
   ============================================================ */

export const AZUL_SOFT = '#e8f0fe';
export const AMBAR = '#b45309';
export const AMBAR_BG = '#fef3c7';
export const VERM_BG = '#fee2e2';
export const VERDE_BG = '#d1fae5';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const outB = (p: number) => 1 - Math.pow(1 - p, 3);

export const surge = (t: number, at: number, dur = 0.45): React.CSSProperties => {
  const p = outB(win(t, at, at + dur));
  return { opacity: p, transform: `translateY(${(1 - p) * 16}px)` };
};

/* logo M */
export const MChip: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.29,
    background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.5, color: WHITE, flexShrink: 0,
  }}>M</div>
);

/* casca do app: fundo claro + barra superior branca */
export const AppShell: React.FC<{ ferramenta: string; children: React.ReactNode }> =
  ({ ferramenta, children }) => (
    <AbsoluteFill style={{ background: M_BG }}>
      <AbsoluteFill style={{
        backgroundImage: 'radial-gradient(rgba(21,96,232,0.05) 1.4px, transparent 1.4px)',
        backgroundSize: '40px 40px',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 130, background: WHITE,
        borderBottom: '1.5px solid rgba(14,27,51,0.08)', display: 'flex', alignItems: 'center',
        padding: '0 44px', gap: 20, boxShadow: '0 6px 24px rgba(14,27,51,0.05)', zIndex: 5,
      }}>
        <MChip size={64} />
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: M_NAVY }}>
          MEDUF <span style={{ color: M_BLUE }}>AI</span>
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: M_BLUE,
          background: AZUL_SOFT, borderRadius: 999, padding: '12px 26px',
        }}>{ferramenta}</span>
      </div>
      <div style={{ position: 'absolute', top: 130, left: 0, right: 0, bottom: 0 }}>
        {children}
      </div>
    </AbsoluteFill>
  );

/* cartão branco padrão do app */
export const Cartao: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> =
  ({ style, children }) => (
    <div style={{
      background: WHITE, borderRadius: 22, border: '1.5px solid rgba(14,27,51,0.08)',
      boxShadow: '0 16px 44px rgba(14,27,51,0.08)', padding: '32px 36px', ...style,
    }}>{children}</div>
  );

/* campo de texto com digitação e cursor */
export const CampoDigitando: React.FC<{
  t: number; at: number; dur: number; texto: string; rotulo: string;
}> = ({ t, at, dur, texto, rotulo }) => {
  const n = t < at ? 0 : Math.ceil(win(t, at, at + dur) * texto.length);
  return (
    <Cartao>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: M_MUT, marginBottom: 16, letterSpacing: '0.06em' }}>
        {rotulo}
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 36, color: M_NAVY, lineHeight: 1.5, minHeight: 110 }}>
        {texto.slice(0, n)}
        {n < texto.length && <span style={{ color: M_BLUE }}>▌</span>}
      </div>
    </Cartao>
  );
};

/* botão azul que é "clicado" */
export const BotaoAnalisar: React.FC<{ t: number; clickAt: number; children?: React.ReactNode }> =
  ({ t, clickAt, children = 'Analisar com 3 IAs' }) => {
    const press = t >= clickAt && t < clickAt + 0.22;
    return (
      <div style={{
        display: 'inline-block', background: M_BLUE, color: WHITE,
        fontFamily: HEAD, fontWeight: 800, fontSize: 34, borderRadius: 16,
        padding: '22px 44px', transform: press ? 'scale(0.95)' : 'scale(1)',
        boxShadow: press ? '0 6px 18px rgba(21,96,232,0.4)' : '0 16px 40px rgba(21,96,232,0.35)',
      }}>{children}</div>
    );
  };

/* o motor de consenso: GPT · Claude · Gemini convergindo */
export const Consenso: React.FC<{
  t: number; at: number; doneAts: [number, number, number]; consensoAt: number; escala?: number;
}> = ({ t, at, doneAts, consensoAt, escala = 1 }) => {
  if (t < at) return null;
  const nomes = ['GPT', 'Claude', 'Gemini'];
  const pCons = t < consensoAt ? 0 : outB(win(t, consensoAt, consensoAt + 0.4));
  return (
    <div style={{ transform: `scale(${escala})`, transformOrigin: 'left top' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        {nomes.map((nome, i) => {
          const done = t >= doneAts[i];
          const vis = outB(win(t, at + i * 0.15, at + i * 0.15 + 0.3));
          return (
            <div key={nome} style={{
              display: 'flex', alignItems: 'center', gap: 12, background: WHITE,
              border: `2px solid ${done ? M_GREEN : 'rgba(14,27,51,0.14)'}`,
              borderRadius: 999, padding: '14px 26px', opacity: vis,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                border: done ? 'none' : `3.5px solid ${M_BLUE}`,
                borderTopColor: done ? undefined : 'transparent',
                background: done ? M_GREEN : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: done ? 'none' : `rotate(${(t * 520) % 360}deg)`,
                color: WHITE, fontSize: 17, fontWeight: 900, fontFamily: HEAD,
              }}>{done ? '✓' : ''}</span>
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: M_NAVY }}>{nome}</span>
            </div>
          );
        })}
      </div>
      {pCons > 0 && (
        <div style={{
          marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 14,
          background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`, borderRadius: 999,
          padding: '16px 32px', opacity: pCons, transform: `translateY(${(1 - pCons) * 10}px)`,
          boxShadow: '0 16px 44px rgba(21,96,232,0.4)',
        }}>
          <span style={{ color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 30 }}>
            → consenso das 3 IAs
          </span>
        </div>
      )}
    </div>
  );
};

/* barra de hipótese ranqueada */
export const Rank: React.FC<{ t: number; at: number; rotulo: string; frac: number; tag: string }> =
  ({ t, at, rotulo, frac, tag }) => {
    if (t < at) return null;
    const p = outB(win(t, at, at + 0.6));
    return (
      <div style={{ marginBottom: 22, opacity: Math.min(1, p * 2) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: M_NAVY }}>{rotulo}</span>
          <span style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: M_BLUE,
            background: AZUL_SOFT, borderRadius: 999, padding: '6px 16px',
          }}>{tag}</span>
        </div>
        <div style={{ height: 16, borderRadius: 8, background: 'rgba(14,27,51,0.07)' }}>
          <div style={{
            height: '100%', width: `${frac * 100 * p}%`, borderRadius: 8,
            background: `linear-gradient(90deg, ${M_BLUE}, #6ea8ff)`,
          }} />
        </div>
      </div>
    );
  };

/* linha de resultado com marcador */
export const Linha: React.FC<{ t: number; at: number; cor?: string; children: React.ReactNode }> =
  ({ t, at, cor = M_GREEN, children }) => {
    if (t < at) return null;
    return (
      <div style={{
        display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16,
        ...surge(t, at, 0.35),
      }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: cor, marginTop: 14, flexShrink: 0 }} />
        <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 30, color: M_NAVY, lineHeight: 1.45 }}>
          {children}
        </span>
      </div>
    );
  };

/* etiquetas de referência científica */
export const Refs: React.FC<{ t: number; at: number; itens: string[] }> = ({ t, at, itens }) => {
  if (t < at) return null;
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', ...surge(t, at, 0.4) }}>
      {itens.map(s => (
        <span key={s} style={{
          fontFamily: MONO, fontSize: 24, color: '#0a3d99', background: AZUL_SOFT,
          border: '1.5px solid rgba(21,96,232,0.25)', borderRadius: 10, padding: '10px 18px',
        }}>{s}</span>
      ))}
    </div>
  );
};

/* alerta clínico */
export const Alerta: React.FC<{
  t: number; at: number; grave?: boolean; titulo: string; children: React.ReactNode;
}> = ({ t, at, grave, titulo, children }) => {
  if (t < at) return null;
  return (
    <div style={{
      background: grave ? VERM_BG : AMBAR_BG,
      border: `2.5px solid ${grave ? M_RED : AMBAR}`, borderRadius: 18,
      padding: '26px 30px', ...surge(t, at, 0.4),
    }}>
      <div style={{
        fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: grave ? M_RED : AMBAR, marginBottom: 10,
      }}>{titulo}</div>
      <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 28, color: M_NAVY, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
};

/* rodapé de segurança (sempre presente nas peças clínicas) */
export const Seguranca: React.FC<{ claro?: boolean }> = () => (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 26, textAlign: 'center',
    fontFamily: HEAD, fontSize: 23, color: 'rgba(14,27,51,0.45)',
  }}>
    apoio à decisão clínica — a decisão final é sempre do médico
  </div>
);

/* encerramento claro padrão */
export const FimClaro: React.FC<{ t: number; at: number; frase: string; sub?: string }> =
  ({ t, at, frase, sub }) => {
    const p = t < at ? 0 : outB(win(t, at, at + 0.6));
    if (p === 0) return null;
    return (
      <AbsoluteFill style={{
        background: M_BG, opacity: p, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 30, zIndex: 10,
      }}>
        <MChip size={140} />
        <div style={{
          fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: M_NAVY, textAlign: 'center',
          lineHeight: 1.25, maxWidth: 880,
        }}>{frase}</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: M_BLUE }}>
          meduf.com.br
        </div>
        {sub && (
          <div style={{ fontFamily: HEAD, fontSize: 30, color: M_MUT }}>{sub}</div>
        )}
        <Seguranca />
      </AbsoluteFill>
    );
  };

/* as 17 ferramentas reais, na ordem do site */
export const FERRAMENTAS = [
  'Diagnóstico Simples', 'Diagnóstico Detalhado', 'Guia Farmacológico',
  'Interação Medicamentosa', 'Guia Toxicológico', 'Cálculo de Doses',
  'Tratamentos Patológicos', 'Análise de Exames Laboratoriais', 'Análise de Radiografias',
  'TC, RM e Ultrassom', 'Análise de ECG', 'Sugestão de Exames',
  'Informação Medicamentosa', 'Análise de Prontuário', 'Consulta por Voz',
  'Chat Médico IA', 'Estruturação de Anamnese',
];

/* notebook renderizando a UI recriada (tela 1512×850 escalada) */
export const LaptopShell: React.FC<{ width: number; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ width, children, style }) => {
    const bezel = width * 0.018;
    const screenW = width - bezel * 2;
    const screenH = screenW * (850 / 1512);
    const deckH = width * 0.034;
    const scale = screenW / 1512;
    return (
      <div style={{ position: 'relative', width, ...style }}>
        <div style={{
          position: 'relative', width, height: screenH + bezel * 2,
          background: 'linear-gradient(160deg,#2c2e33,#101114)',
          borderRadius: width * 0.022,
          boxShadow: '0 46px 100px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <div style={{
            position: 'absolute', left: bezel, top: bezel, width: screenW, height: screenH,
            borderRadius: width * 0.012, overflow: 'hidden', background: M_BG,
          }}>
            <div style={{ width: 1512, height: 850, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative' }}>
              {children}
            </div>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(115deg, rgba(255,255,255,0.07) 0%, transparent 30%)',
            }} />
          </div>
          <div style={{
            position: 'absolute', top: bezel * 0.32, left: '50%', transform: 'translateX(-50%)',
            width: 6, height: 6, borderRadius: 3, background: '#0a0a0a',
          }} />
        </div>
        <div style={{
          width: width * 1.12, height: deckH, marginLeft: -width * 0.06,
          background: 'linear-gradient(180deg,#3a3d43,#17191d)',
          borderRadius: `0 0 ${width * 0.035}px ${width * 0.035}px`,
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
        }} />
      </div>
    );
  };

/* barra superior do app em paisagem (dentro do notebook) */
export const TelaApp: React.FC<{ ferramenta: string; extra?: React.ReactNode; children: React.ReactNode }> =
  ({ ferramenta, extra, children }) => (
    <div style={{ position: 'absolute', inset: 0, background: M_BG }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 96, background: WHITE,
        borderBottom: '1.5px solid rgba(14,27,51,0.08)', display: 'flex', alignItems: 'center',
        padding: '0 40px', gap: 18,
      }}>
        <MChip size={54} />
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: M_NAVY }}>
          MEDUF <span style={{ color: M_BLUE }}>AI</span>
        </span>
        <span style={{
          fontFamily: HEAD, fontWeight: 700, fontSize: 25, color: M_BLUE,
          background: AZUL_SOFT, borderRadius: 999, padding: '10px 24px', marginLeft: 20,
        }}>{ferramenta}</span>
        {extra && <div style={{ marginLeft: 'auto' }}>{extra}</div>}
      </div>
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, bottom: 0, padding: '34px 40px' }}>
        {children}
      </div>
    </div>
  );

/* cursor com cliques (path: [tempo, x, y]) */
export const Cursor: React.FC<{ t: number; path: Array<[number, number, number]>; clicks?: number[] }> =
  ({ t, path, clicks = [] }) => {
    if (t < path[0][0]) return null;
    let x = path[path.length - 1][1], y = path[path.length - 1][2];
    for (let i = 0; i < path.length - 1; i++) {
      const [t0, x0, y0] = path[i], [t1, x1, y1] = path[i + 1];
      if (t <= t1) {
        const p = outB(win(t, t0, t1));
        x = x0 + (x1 - x0) * p; y = y0 + (y1 - y0) * p;
        break;
      }
    }
    const clique = clicks.find(c => t >= c && t < c + 0.45);
    const pr = clique !== undefined ? win(t, clique, clique + 0.45) : 0;
    return (
      <div style={{ position: 'absolute', left: x, top: y, zIndex: 40, pointerEvents: 'none' }}>
        {clique !== undefined && (
          <div style={{
            position: 'absolute', left: -6, top: -6, width: 52, height: 52, borderRadius: 26,
            border: '3px solid rgba(21,96,232,0.7)', transform: `scale(${0.3 + pr * 1.2})`,
            opacity: 1 - pr,
          }} />
        )}
        <svg width={38} height={44} viewBox="0 0 24 28">
          <path d="M3,2 L3,22 L8.5,17.5 L12,26 L15.5,24.5 L12,16 L19,15.5 Z"
            fill="#0e1b33" stroke="#ffffff" strokeWidth={1.6} />
        </svg>
      </div>
    );
  };
