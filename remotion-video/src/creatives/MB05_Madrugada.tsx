import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MBDarkBg, MBHero, MBEndCard, useMBCount, MB_BLUE, MB_INK, MB_MUT, MB_CARD, MB_LINE, WHITE } from './mbdark';
import timing from './timings/mb05.json';

/* ============================================================
   MB05 — 02:47
   A hora em que dá para estudar não é a hora comercial. Tudo
   fechado, e o acervo aberto — na nuvem, no celular, agora.
   ============================================================ */

const T = timing as Timing;
const DELAY = 0.7;
export const MB05_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  prova: DELAY + 2.1,
  capitulo: DELAY + 4.0,
  biblioteca: DELAY + 7.7,
  grupo: DELAY + 9.6,
  loja: DELAY + 11.1,
  acordado: DELAY + 12.7,
  drive: DELAY + 14.5,
  naofecha: DELAY + 15.8,
  n530: DELAY + 17.3,
  n9000: DELAY + 18.9,
  nuvem: DELAY + 20.8,
  suporte: DELAY + 25.0,
  h24: DELAY + 27.1,
  hero: DELAY + 28.5,
  end: DELAY + 32.1,
};

const SC = {
  hook: [0, B.biblioteca - 0.4] as Range,
  fechado: [B.biblioteca - 0.4, B.drive - 0.3] as Range,
  aberto: [B.drive - 0.3, B.hero - 0.4] as Range,
  hero: [B.hero - 0.4, B.end + 1.0] as Range,
};

const Porta: React.FC<{ t: number; at: number; y: number; nome: string; estado: string }> =
  ({ t, at, y, nome, estado }) => {
    const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const apaga = clamp01((t - at - 0.45) / 0.5);
    return (
      <div style={{
        position: 'absolute', left: 100, right: 100, top: y, opacity: o,
        background: MB_CARD, border: `2px solid ${MB_LINE}`, borderRadius: 16,
        padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        filter: `brightness(${1 - apaga * 0.35})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: MB_INK, opacity: 1 - apaga * 0.45 }}>
          {nome}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          fontFamily: MONO, fontWeight: 700, fontSize: 23, color: '#e08a8a', opacity: apaga,
        }}>
          <span style={{ width: 11, height: 11, borderRadius: 999, background: '#e05252', display: 'inline-block' }} />
          {estado}
        </div>
      </div>
    );
  };

const Linha: React.FC<{ t: number; at: number; texto: string }> = ({ t, at, texto }) => {
  const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, opacity: o,
      transform: `translateY(${(1 - o) * 10}px)`,
    }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: MB_BLUE, display: 'inline-block' }} />
      <span style={{ fontFamily: BODY, fontSize: 28, color: MB_INK }}>{texto}</span>
    </div>
  );
};

export const MB05_Madrugada: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const opHook = sceneOpacity(t, SC.hook, true);
  const opFechado = sceneOpacity(t, SC.fechado);
  const opAberto = sceneOpacity(t, SC.aberto);

  const cursos = useMBCount(530, Math.round(B.n530 * FPS), 24);
  const livros = useMBCount(9000, Math.round(B.n9000 * FPS), 24);
  const pulso = 1 + Math.sin(t * 2.1) * 0.012;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MBDarkBg />

      {/* hook: o relógio */}
      <div style={{ position: 'absolute', inset: 0, opacity: opHook }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 620, textAlign: 'center' }}>
          <div style={{
            fontFamily: MONO, fontWeight: 700, fontSize: 190, color: MB_INK,
            letterSpacing: 4, lineHeight: 1, transform: `scale(${pulso})`,
            textShadow: '0 0 60px rgba(255,255,255,0.10)',
          }}>02:47</div>
          <div style={{ fontFamily: BODY, fontSize: 30, color: MB_MUT, marginTop: 14, letterSpacing: 2 }}>
            da manhã
          </div>
          <div style={{
            marginTop: 70, fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: MB_INK, letterSpacing: -1.6,
            opacity: interpolate(t, [B.prova, B.prova + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            a prova é daqui a <span style={{ color: MB_BLUE }}>6 horas.</span>
          </div>
          <div style={{
            marginTop: 26, fontFamily: BODY, fontSize: 29, color: MB_MUT, lineHeight: 1.4,
            opacity: interpolate(t, [B.capitulo, B.capitulo + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            e você precisa de um capítulo específico,<br />de um livro específico.
          </div>
        </div>
      </div>

      {/* tudo fechado */}
      <div style={{ position: 'absolute', inset: 0, opacity: opFechado }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center',
          fontFamily: MONO, fontWeight: 700, fontSize: 58, color: MB_MUT, letterSpacing: 3,
        }}>02:47</div>
        <Porta t={t} at={B.biblioteca} y={620} nome="biblioteca" estado="fechada" />
        <Porta t={t} at={B.grupo} y={790} nome="grupo da turma" estado="dormindo" />
        <Porta t={t} at={B.loja} y={960} nome="loja / suporte" estado="abre às 9h" />
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1190, textAlign: 'center',
          opacity: interpolate(t, [B.acordado, B.acordado + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: MB_INK, letterSpacing: -1.8 }}>
            e você está <span style={{ color: MB_BLUE }}>acordado agora.</span>
          </div>
        </div>
      </div>

      {/* o acervo aberto */}
      <div style={{ position: 'absolute', inset: 0, opacity: opAberto }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center',
          opacity: interpolate(t, [B.drive, B.drive + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: MB_INK, letterSpacing: -1.8 }}>
            o acervo <span style={{ color: MB_BLUE }}>não fecha.</span>
          </div>
        </div>

        <div style={{
          position: 'absolute', left: 100, right: 100, top: 540,
          background: MB_CARD, border: `2px solid ${MB_BLUE}`, borderRadius: 22,
          padding: '34px 34px 30px',
          boxShadow: '0 26px 70px -20px rgba(59,130,246,0.5)',
          opacity: interpolate(t, [B.naofecha, B.naofecha + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: MB_INK }}>Drive MedBrasil</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: MONO, fontWeight: 700, fontSize: 22, color: '#5fd39a',
            }}>
              <span style={{ width: 11, height: 11, borderRadius: 999, background: '#22c55e', display: 'inline-block' }} />
              aberto
            </div>
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 30 }}>
            <div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: MB_INK, letterSpacing: -3, lineHeight: 1 }}>
                {cursos}<span style={{ color: MB_BLUE }}>+</span>
              </div>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: MB_MUT, marginTop: 2 }}>cursos</div>
            </div>
            <div style={{
              opacity: interpolate(t, [B.n9000, B.n9000 + 0.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: MB_INK, letterSpacing: -3, lineHeight: 1 }}>
                {livros}<span style={{ color: MB_BLUE }}>+</span>
              </div>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: MB_MUT, marginTop: 2 }}>livros traduzidos</div>
            </div>
          </div>
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 15 }}>
            <Linha t={t} at={B.nuvem} texto="na nuvem — no seu celular, a qualquer hora" />
            <Linha t={t} at={B.nuvem + 1.0} texto="sem instalar, sem ocupar espaço" />
          </div>
        </div>

        <div style={{
          position: 'absolute', left: 100, right: 100, top: 1230,
          background: MB_CARD, border: `2px solid ${MB_LINE}`, borderRadius: 18, padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 18,
          opacity: interpolate(t, [B.suporte, B.suporte + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 999, background: '#22c55e', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 20l1.3-3.6A8 8 0 1 1 8.4 19L4 20z" stroke={WHITE} strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 29, color: MB_INK }}>
              suporte no WhatsApp
            </div>
            <div style={{
              fontFamily: BODY, fontSize: 24, color: MB_MUT, marginTop: 3,
              opacity: interpolate(t, [B.h24, B.h24 + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>
              responde 24 horas — inclusive às 02:47
            </div>
          </div>
        </div>
      </div>

      <MBHero t={t} range={SC.hero} line1="a hora que você tem para estudar"
        line2="nem sempre é a hora comercial." size={52} top={800} blueAfterSec={2.4} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1780} size={52} highlight={MB_BLUE} />
      <MBEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/mb05.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
