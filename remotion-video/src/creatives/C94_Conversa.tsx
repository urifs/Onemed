import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c94.json';

/* ============================================================
   C94 — CONVERSA
   Estilo: aplicativo de mensagens. Balões chegando com
   "digitando...", check duplo, prévia de link no final.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C94_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const WALL = '#0b141a';
const HEADER = '#1f2c33';
const IN_BG = '#202c33';
const OUT_BG = '#005c4b';
const TXT = '#e9edef';
const HORA = 'rgba(233,237,239,0.55)';
const VERDE = '#25d366';
const SANS = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const spring = (p: number) => 1 - Math.pow(1 - p, 3);

type Msg = { at: number; me?: boolean; text?: string; hora: string; link?: boolean };

const MSGS: Msg[] = [
  { at: DELAY + 0.1, hora: '22:41', text: 'como é que você dá conta de estudar tudo??' },
  { at: DELAY + 2.43, me: true, hora: '22:41', text: 'kkk essa é a mensagem que eu mais recebo' },
  { at: DELAY + 4.47, me: true, hora: '22:42', text: 'minha resposta é sempre a mesma: um link' },
  { at: DELAY + 7.05, me: true, hora: '22:42', text: 'lá dentro tem Estratégia MED, MEDCurso, Medcof... +530 cursos' },
  { at: DELAY + 12.42, hora: '22:43', text: 'e questões?' },
  { at: DELAY + 13.45, me: true, hora: '22:43', text: '31 mil comentadas, uma por uma' },
  { at: DELAY + 15.73, hora: '22:44', text: 'e quando você trava?' },
  { at: DELAY + 17.06, me: true, hora: '22:44', text: 'a IA resume, cria flashcards e monta o cronograma' },
  { at: DELAY + 21.16, hora: '22:45', text: 'e é complicado?' },
  { at: DELAY + 22.38, me: true, hora: '22:45', text: 'um login. só.' },
  { at: DELAY + 23.8, me: true, hora: '22:45', text: 'testa de graça e depois me conta', link: true },
];

const Bolha: React.FC<{ t: number; m: Msg }> = ({ t, m }) => {
  if (t < m.at) return null;
  const p = spring(win(t, m.at, m.at + 0.28));
  return (
    <div style={{
      alignSelf: m.me ? 'flex-end' : 'flex-start',
      maxWidth: 780,
      background: m.me ? OUT_BG : IN_BG,
      borderRadius: 18,
      padding: '20px 26px 14px',
      transform: `scale(${0.85 + 0.15 * p}) translateY(${(1 - p) * 14}px)`,
      transformOrigin: m.me ? 'right bottom' : 'left bottom',
      opacity: p,
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontFamily: SANS, fontSize: 40, lineHeight: 1.32, color: TXT }}>
        {m.text}
      </div>
      {m.link && (
        <div style={{
          marginTop: 16, borderRadius: 12, overflow: 'hidden', background: '#0f1b21',
          borderLeft: '6px solid #e02d2d',
        }}>
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontFamily: SANS, fontSize: 36, fontWeight: 700, color: TXT }}>
              OneMed — Teste Grátis
            </div>
            <div style={{ fontFamily: SANS, fontSize: 30, color: '#8fb3a8', marginTop: 6 }}>
              +530 cursos · questões · livros · IA
            </div>
            <div style={{ fontFamily: SANS, fontSize: 30, color: '#53bdeb', marginTop: 10 }}>
              onemedcursos.com.br
            </div>
          </div>
        </div>
      )}
      <div style={{
        fontFamily: SANS, fontSize: 24, color: HORA, textAlign: 'right', marginTop: 8,
        display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
      }}>
        {m.hora}
        {m.me && <span style={{ color: '#53bdeb', fontSize: 26 }}>✓✓</span>}
      </div>
    </div>
  );
};

/* "digitando..." antes de cada balão recebido */
const Digitando: React.FC<{ t: number }> = ({ t }) => {
  const prox = MSGS.find(m => !m.me && t >= m.at - 0.9 && t < m.at);
  if (!prox) return null;
  const f = Math.floor(t * 30);
  return (
    <div style={{
      alignSelf: 'flex-start', background: IN_BG, borderRadius: 18,
      padding: '22px 30px', display: 'flex', gap: 10,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: 7, background: HORA,
          opacity: (Math.floor(f / 8) % 3) === i ? 1 : 0.35,
        }} />
      ))}
    </div>
  );
};

export const C94_Conversa: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  return (
    <AbsoluteFill style={{ background: WALL }}>
      {/* padrão sutil do papel de parede */}
      <AbsoluteFill style={{
        backgroundImage: 'radial-gradient(rgba(233,237,239,0.035) 2px, transparent 2px)',
        backgroundSize: '46px 46px',
      }} />

      {/* cabeçalho */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 140, background: HEADER,
        display: 'flex', alignItems: 'center', padding: '0 34px', gap: 24, zIndex: 2,
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 40, color: HORA }}>←</div>
        <div style={{
          width: 84, height: 84, borderRadius: 42, background: '#6a7f8a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: SANS, fontSize: 36, fontWeight: 700, color: '#fff',
        }}>
          M
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 38, fontWeight: 600, color: TXT }}>
            Marina — R1 Clínica
          </div>
          <div style={{ fontFamily: SANS, fontSize: 28, color: VERDE }}>online</div>
        </div>
      </div>

      {/* conversa ancorada embaixo, como chat de verdade */}
      <div style={{
        position: 'absolute', left: 40, right: 40, top: 220, bottom: 60,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 22,
      }}>
        {MSGS.map((m, i) => <Bolha key={i} t={t} m={m} />)}
        <Digitando t={t} />
      </div>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c94.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
