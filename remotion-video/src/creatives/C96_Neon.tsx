import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c96.json';

/* ============================================================
   C96 — NEON
   Estilo: letreiros de neon acendendo na madrugada. Fundo de
   noite profunda, tubos de vidro coloridos, tremida de
   ignição, brilho que fica.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C96_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const NOITE = '#04060e';
const SANS = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/* tremida de ignição do neon: padrão fixo (nada de aleatório no render) */
const FLICKER = [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1];
const ignicao = (t: number, at: number, frame: number): number => {
  if (t < at) return 0;
  const dt = t - at;
  if (dt < 0.5) return FLICKER[frame % FLICKER.length] ? 1 : 0.25;
  return 1;
};

const neonStyle = (cor: string, lit: number, size: number): React.CSSProperties => ({
  fontFamily: SANS, fontWeight: 800, fontSize: size, letterSpacing: '0.06em',
  color: lit > 0.5 ? '#ffffff' : 'rgba(255,255,255,0.06)',
  textShadow: lit > 0.5
    ? `0 0 8px ${cor}, 0 0 24px ${cor}, 0 0 60px ${cor}, 0 0 110px ${cor}`
    : 'none',
  transition: 'none',
});

/* letreiro emoldurado: tubo de borda + texto */
const Letreiro: React.FC<{
  t: number; at: number; frame: number; cor: string; size?: number;
  children: React.ReactNode; sub?: string; rot?: number;
}> = ({ t, at, frame, cor, size = 84, children, sub, rot = 0 }) => {
  const lit = ignicao(t, at, frame);
  if (t < at) return null;
  return (
    <div style={{
      border: `4px solid ${lit > 0.5 ? cor : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 22, padding: '30px 46px', transform: `rotate(${rot}deg)`,
      boxShadow: lit > 0.5
        ? `0 0 22px ${cor}66, inset 0 0 26px ${cor}33`
        : 'none',
      background: 'rgba(6,10,20,0.55)',
      textAlign: 'center',
    }}>
      <div style={neonStyle(cor, lit, size)}>{children}</div>
      {sub && (
        <div style={{ ...neonStyle(cor, lit, Math.round(size * 0.44)), marginTop: 10, fontWeight: 600 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

export const C96_Neon: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const CIANO = '#39d0ff';
  const AMBAR = '#ffb020';
  const MAGENTA = '#ff4fd8';
  const VERMELHO = '#ff3b30';
  const VERDE = '#3bff8a';

  /* abertura em texto apagado */
  const pIntro = win(t, DELAY + 0.1, DELAY + 0.7);
  const introSai = t > DELAY + 5.9;

  const urlLit = ignicao(t, DELAY + 27.08, frame);

  return (
    <AbsoluteFill style={{ background: NOITE }}>
      {/* céu: gradiente + estrelas fixas */}
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, #03040a 0%, #071022 55%, #0a1428 100%)',
      }} />
      {[[120, 180], [340, 90], [620, 220], [880, 140], [990, 320], [200, 420], [760, 380], [450, 60]].map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.5)', opacity: 0.3 + 0.4 * ((frame + i * 7) % 60 > 30 ? 1 : 0.4),
        }} />
      ))}

      {/* abertura */}
      {!introSai && (
        <div style={{
          position: 'absolute', left: 90, top: 320, opacity: pIntro,
        }}>
          <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 62, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            a cidade apaga.
          </div>
          {t >= DELAY + 1.43 && (
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 74, color: '#fff', marginTop: 10 }}>
              você continua.
            </div>
          )}
          {t >= DELAY + 4.08 && (
            <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 42, color: 'rgba(255,255,255,0.6)', marginTop: 34, maxWidth: 860, lineHeight: 1.5 }}>
              e a essa hora, o que importa é <b style={{ color: '#fff' }}>onde</b> você estuda.
            </div>
          )}
        </div>
      )}

      {/* parede de letreiros */}
      {introSai && (
        <div style={{
          position: 'absolute', left: 70, right: 70, top: 150,
          display: 'flex', flexDirection: 'column', gap: 34, alignItems: 'center',
        }}>
          <Letreiro t={t} at={DELAY + 6.91} frame={frame} cor={VERMELHO} size={96} rot={-1.5}>
            +530 CURSOS
          </Letreiro>
          <Letreiro t={t} at={DELAY + 9.89} frame={frame} cor={CIANO} size={62} rot={1}
            sub={t >= DELAY + 12.53 ? 'MEDCOF' : undefined}>
            ESTRATÉGIA MED{t >= DELAY + 11.31 ? ' · MEDCURSO' : ''}
          </Letreiro>
          <Letreiro t={t} at={DELAY + 14.4} frame={frame} cor={AMBAR} size={78} rot={-1}
            sub="comentadas, uma a uma">
            31 MIL QUESTÕES
          </Letreiro>
          <Letreiro t={t} at={DELAY + 17.35} frame={frame} cor={MAGENTA} size={82} rot={1.2}>
            +9.000 LIVROS
          </Letreiro>
        </div>
      )}

      {/* faixa da madrugada: IA */}
      {t >= DELAY + 19.11 && (
        <div style={{
          position: 'absolute', left: 90, right: 90, bottom: 470,
          opacity: win(t, DELAY + 19.11, DELAY + 19.7),
        }}>
          <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 40, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            a noite é longa, mas você não estuda sozinho:
          </div>
          {t >= DELAY + 22.04 && (
            <div style={{ ...neonStyle(CIANO, 1, 34), marginTop: 16, fontWeight: 700 }}>
              IA: RESUMOS · FLASHCARDS · CRONOGRAMA
            </div>
          )}
        </div>
      )}

      {/* letreiro principal: o site */}
      {t >= DELAY + 26.66 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 170,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
        }}>
          <div style={{
            border: `5px solid ${urlLit > 0.5 ? VERMELHO : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 26, padding: '36px 52px',
            boxShadow: urlLit > 0.5 ? `0 0 30px ${VERMELHO}77, inset 0 0 34px ${VERMELHO}33` : 'none',
            background: 'rgba(8,6,10,0.6)',
          }}>
            <div style={neonStyle(VERMELHO, urlLit, 74)}>onemedcursos.com.br</div>
          </div>
          {t >= DELAY + 30.03 && (
            <div style={neonStyle(VERDE, ignicao(t, DELAY + 30.03, frame), 52)}>
              O TESTE É GRÁTIS
            </div>
          )}
        </div>
      )}

      {/* bruma do chão da cidade */}
      <AbsoluteFill style={{
        pointerEvents: 'none',
        background: 'radial-gradient(120% 60% at 50% 108%, rgba(20,40,70,0.5) 0%, transparent 60%)',
      }} />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c96.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
