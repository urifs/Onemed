import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MBDarkBg, MBHero, MBEndCard, MB_BLUE, MB_INK, MB_MUT, MB_CARD, MB_LINE, WHITE } from './mbdark';
import timing from './timings/mb03.json';

/* ============================================================
   MB03 — PROCURANDO
   O cronômetro corre enquanto o material não aparece: grupo,
   link caído, direct, PDF de 2019, pasta que não abre. Depois,
   uma busca só — e o acervo responde.
   ============================================================ */

const T = timing as Timing;
const DELAY = 0.7;
export const MB03_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  senta: DELAY + 1.7,
  grupo: DELAY + 3.8,
  rola: DELAY + 5.3,
  link: DELAY + 7.3,
  caiu: DELAY + 8.3,
  direct: DELAY + 9.5,
  espera: DELAY + 10.8,
  pdf: DELAY + 11.6,
  grupo2: DELAY + 14.5,
  pasta: DELAY + 16.1,
  vinte8: DELAY + 17.9,
  nada: DELAY + 20.5,
  agora: DELAY + 21.6,
  busca: DELAY + 23.6,
  cardio: DELAY + 24.6,
  tudo: DELAY + 25.8,
  r1: DELAY + 27.1,
  r2: DELAY + 29.0,
  r3: DELAY + 30.8,
  r4: DELAY + 31.6,
  hero: DELAY + 33.4,
  end: DELAY + 36.7,
};

const SC = {
  hook: [0, B.grupo - 0.3] as Range,
  caos: [B.grupo - 0.3, B.agora + 0.5] as Range,
  busca: [B.agora + 0.3, B.hero - 0.3] as Range,
  hero: [B.hero - 0.3, B.end + 1.0] as Range,
};

/* cronômetro: sobe até 28:00 no caos, e reinicia em 4 s na busca */
const relogio = (t: number) => {
  if (t < B.agora) {
    const p = clamp01((t - B.senta) / (B.nada + 0.6 - B.senta));
    const seg = Math.round(easeInOut(p) * 28 * 60);
    return `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
  }
  const p = clamp01((t - B.busca) / 0.9);
  return `00:${String(Math.round(p * 4)).padStart(2, '0')}`;
};

const Cartao: React.FC<{
  t: number; at: number; x: number; y: number; rot: number;
  titulo: string; nota: string; erro?: boolean; largura?: number;
}> = ({ t, at, x, y, rot, titulo, nota, erro, largura = 430 }) => {
  const o = interpolate(t, [at, at + 0.28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cai = (1 - o) * 26;
  return (
    <div style={{
      position: 'absolute', left: x, top: y + cai, width: largura, opacity: o,
      transform: `rotate(${rot}deg)`,
      background: MB_CARD, border: `2px solid ${MB_LINE}`, borderRadius: 14,
      padding: '16px 20px', boxShadow: '0 16px 40px -14px rgba(0,0,0,0.75)',
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 25, color: MB_MUT }}>{titulo}</div>
      <div style={{
        marginTop: 8, display: 'inline-block', borderRadius: 999,
        padding: '5px 14px', fontFamily: MONO, fontWeight: 700, fontSize: 19,
        background: erro ? 'rgba(224,82,82,0.14)' : 'rgba(255,255,255,0.06)',
        color: erro ? '#e08a8a' : MB_MUT,
        border: `1.5px solid ${erro ? 'rgba(224,82,82,0.4)' : MB_LINE}`,
      }}>{nota}</div>
    </div>
  );
};

const Resultado: React.FC<{ t: number; at: number; y: number; titulo: string; nota: string }> =
  ({ t, at, y, titulo, nota }) => {
    const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <div style={{
        position: 'absolute', left: 90, right: 90, top: y, opacity: o,
        transform: `translateX(${(1 - o) * -18}px)`,
        background: MB_CARD, border: `2px solid ${MB_BLUE}55`, borderRadius: 16,
        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18,
        boxShadow: '0 18px 44px -16px rgba(59,130,246,0.4)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 999, background: MB_BLUE,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: MB_INK }}>{titulo}</div>
          <div style={{ fontFamily: BODY, fontSize: 23, color: MB_MUT, marginTop: 4 }}>{nota}</div>
        </div>
      </div>
    );
  };

const Busca: React.FC<{ t: number; at: number; texto: string; azul?: boolean; top: number }> =
  ({ t, at, texto, azul, top }) => {
    const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const n = Math.round(clamp01((t - at - 0.25) / 0.7) * texto.length);
    const cursor = Math.floor(t * 2.2) % 2 === 0;
    return (
      <div style={{
        position: 'absolute', left: 80, right: 80, top, opacity: o,
        background: MB_CARD, border: `2px solid ${azul ? MB_BLUE : MB_LINE}`, borderRadius: 999,
        padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: azul ? '0 18px 50px -16px rgba(59,130,246,0.5)' : 'none',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" stroke={azul ? MB_BLUE : MB_MUT} strokeWidth="2.4" />
          <path d="M16.5 16.5L21 21" stroke={azul ? MB_BLUE : MB_MUT} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <div style={{ fontFamily: BODY, fontSize: 30, color: MB_INK }}>
          {texto.slice(0, n)}
          <span style={{ opacity: cursor ? 1 : 0, color: azul ? MB_BLUE : MB_MUT }}>|</span>
        </div>
      </div>
    );
  };

export const MB03_Procurando: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const opHook = sceneOpacity(t, SC.hook, true);
  const opCaos = sceneOpacity(t, SC.caos);
  const opBusca = sceneOpacity(t, SC.busca);

  const relOp = interpolate(t, [B.senta - 0.3, B.senta], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const relVermelho = t > B.vinte8 && t < B.agora;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MBDarkBg />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: opHook }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 700, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 82, color: MB_INK, letterSpacing: -2.4, lineHeight: 1.14 }}>
            cronometra <span style={{ color: MB_BLUE }}>comigo.</span>
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 31, color: MB_MUT, marginTop: 22,
            opacity: interpolate(t, [B.senta, B.senta + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            você senta para estudar cardiologia.
          </div>
        </div>
      </div>

      {/* cronômetro fixo no topo, do início do caos até a busca */}
      {t > B.senta - 0.4 && t < B.hero - 0.5 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center',
          opacity: relOp * (t > B.hero - 0.9 ? interpolate(t, [B.hero - 0.9, B.hero - 0.5], [1, 0]) : 1),
        }}>
          <div style={{
            fontFamily: MONO, fontWeight: 700, fontSize: 74,
            color: relVermelho ? '#e08a8a' : t > B.agora ? MB_BLUE : MB_INK,
            letterSpacing: 2,
            textShadow: t > B.agora ? '0 0 40px rgba(59,130,246,0.5)' : 'none',
          }}>{relogio(t)}</div>
        </div>
      )}

      {/* caos */}
      <div style={{ position: 'absolute', inset: 0, opacity: opCaos }}>
        <Busca t={t} at={B.grupo - 0.2} texto="cardiologia" top={390} />
        <Cartao t={t} at={B.grupo} x={70} y={540} rot={-3.2} titulo="grupo da turma" nota="312 mensagens hoje" />
        <Cartao t={t} at={B.rola} x={520} y={640} rot={2.6} titulo="rolar, rolar, rolar" nota="sem achar" />
        <Cartao t={t} at={B.link} x={110} y={790} rot={1.8} titulo="um link!" nota="drive/pasta-2021" />
        <Cartao t={t} at={B.caiu} x={480} y={900} rot={-2.4} titulo="o link caiu" nota="404 — não encontrado" erro />
        <Cartao t={t} at={B.direct} x={90} y={1040} rot={-1.4} titulo="pede no direct" nota="visualizado" erro />
        <Cartao t={t} at={B.pdf} x={470} y={1160} rot={3.0} titulo="alguém manda um PDF" nota="versão 2019" erro />
        <Cartao t={t} at={B.grupo2} x={80} y={1300} rot={2.2} titulo="outro grupo" nota="+ 180 mensagens" />
        <Cartao t={t} at={B.pasta} x={450} y={1420} rot={-2.8} titulo="baixa uma pasta" nota="arquivo corrompido" erro />

        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1600, textAlign: 'center',
          opacity: interpolate(t, [B.nada, B.nada + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            display: 'inline-block', background: '#e05252', color: WHITE, borderRadius: 999,
            padding: '14px 34px', fontFamily: HEAD, fontWeight: 800, fontSize: 30,
            boxShadow: '0 18px 44px -14px rgba(224,82,82,0.6)',
          }}>
            28 minutos. zero estudado.
          </div>
        </div>
      </div>

      {/* a busca que resolve */}
      <div style={{ position: 'absolute', inset: 0, opacity: opBusca }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 336, textAlign: 'center',
          opacity: interpolate(t, [B.agora, B.agora + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 50, color: MB_INK, letterSpacing: -1.6 }}>
            agora, no Drive <span style={{ color: MB_BLUE }}>MedBrasil</span>
          </div>
        </div>
        <Busca t={t} at={B.busca - 0.3} texto="cardiologia" azul top={440} />
        <Resultado t={t} at={B.tudo} y={610} titulo="Cardiologia — cursos completos" nota="as melhores plataformas do Brasil, num acesso só" />
        <Resultado t={t} at={B.r1} y={780} titulo="Livros traduzidos" nota="+9.000 títulos, prontos para abrir" />
        <Resultado t={t} at={B.r2} y={950} titulo="Na nuvem" nota="sem ocupar a memória do celular" />
        <Resultado t={t} at={B.r3} y={1120} titulo="Atualizações garantidas" nota="sem custo a mais" />
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1340, textAlign: 'center',
          opacity: interpolate(t, [B.r4, B.r4 + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            display: 'inline-block', background: MB_BLUE, color: WHITE, borderRadius: 999,
            padding: '16px 40px', fontFamily: HEAD, fontWeight: 800, fontSize: 30,
            boxShadow: '0 20px 54px -14px rgba(59,130,246,0.6)',
          }}>
            4 segundos. tudo na mão.
          </div>
        </div>
      </div>

      <MBHero t={t} range={SC.hero} line1="o tempo que você perde procurando" line2="é o tempo que falta para estudar."
        size={54} top={780} blueAfterSec={1.6} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1780} size={52} highlight={MB_BLUE} />
      <MBEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/mb03.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
