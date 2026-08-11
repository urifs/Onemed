import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard } from './common';
import { Grain, Vignette, win, typed, easeOutExpo, FlashCut } from './cine';
import timing from './timings/c59.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C59_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  cursor: DELAY + 0.1,
  pergunta: DELAY + 3.3,
  lib: DELAY + 6.7, libOk: DELAY + 10.1,
  livros: DELAY + 11.4, livrosOk: DELAY + 14.6,
  sync: DELAY + 16.0, syncOk: DELAY + 23.1,
  assist: DELAY + 24.3, assistOk: DELAY + 29.8,
  crono: DELAY + 31.0, cronoOk: DELAY + 35.6,
  sobrio: DELAY + 36.8,
  ultima: DELAY + 44.8,
  interface: DELAY + 48.0,
  pronto: DELAY + 50.6,
  end: DELAY + T.duration - 3.2,
};

type Cmd = { at: number; okAt: number; cmd: string; detail?: string };
const CMDS: Cmd[] = [
  { at: B.lib, okAt: B.libOk, cmd: '> carregar biblioteca … +530 cursos', detail: 'aulas, módulos, categorias' },
  { at: B.livros, okAt: B.livrosOk, cmd: '> indexar livros … +9.000', detail: 'todas as especialidades' },
  { at: B.sync, okAt: B.syncOk, cmd: '> sincronizar progresso', detail: 'questões · erros · anotações — onde você parou' },
  { at: B.assist, okAt: B.assistOk, cmd: '> ativar assistente_ia --le-a-tela', detail: 'responde sobre a aula aberta' },
  { at: B.crono, okAt: B.cronoOk, cmd: '> montar cronograma --mapa-mental', detail: 'marcos · checklist · navegável' },
];
const GREEN = '#4ade80';

const Barra: React.FC<{ t: number; at: number; okAt: number }> = ({ t, at, okAt }) => {
  const p = win(t, at + 0.5, okAt);
  const blocks = Math.round(p * 24);
  return (
    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
      [{'█'.repeat(blocks)}{'░'.repeat(24 - blocks)}] {Math.round(p * 100)}%
    </span>
  );
};

export const C59_Boot: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const termOp = 1 - easeOutExpo(win(t, B.interface - 0.3, B.interface + 0.5));
  const uiOp = easeOutExpo(win(t, B.interface - 0.1, B.interface + 0.6));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#050607' }}>
      {/* terminal */}
      <div style={{ position: 'absolute', inset: 0, opacity: termOp }}>
        <div style={{ position: 'absolute', left: 50, right: 50, top: 220, bottom: 420, background: '#0a0c0f', borderRadius: 26, border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 60px 130px -30px rgba(0,0,0,0.9)', padding: '30px 36px', overflow: 'hidden' }}>
          {/* barra de título */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <div key={i} style={{ width: 18, height: 18, borderRadius: 99, background: c }} />)}
            <span style={{ fontFamily: MONO, fontSize: 20, color: 'rgba(255,255,255,0.4)', marginLeft: 14 }}>onemed — boot</span>
          </div>
          {/* pergunta inicial */}
          {t >= B.pergunta - 2.4 && (
            <div style={{ fontFamily: MONO, fontSize: 26, color: 'rgba(255,255,255,0.65)', marginBottom: 22, lineHeight: 1.5 }}>
              {typed('# e se o seu estudo ligasse de verdade?', t, B.pergunta - 2.2, 22)}
            </div>
          )}
          {/* comandos */}
          {CMDS.map((c, i) => {
            if (t < c.at) return null;
            const ok = t >= c.okAt;
            return (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: WHITE, lineHeight: 1.4 }}>
                  {typed(c.cmd, t, c.at, 30)}
                  {ok && <span style={{ color: GREEN, marginLeft: 16 }}>OK ✓</span>}
                </div>
                {t > c.at + 0.6 && !ok && (
                  <div style={{ fontFamily: MONO, fontSize: 22, marginTop: 6 }}><Barra t={t} at={c.at} okAt={c.okAt} /></div>
                )}
                {ok && c.detail && (
                  <div style={{ fontFamily: MONO, fontSize: 21, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>· {c.detail}</div>
                )}
              </div>
            );
          })}
          {/* observação sóbria */}
          {t >= B.sobrio && t < B.interface && (
            <div style={{ fontFamily: MONO, fontSize: 23, color: '#7d9bff', marginTop: 10, lineHeight: 1.5 }}>
              {typed('# nenhum efeito especial. só um sistema sóbrio\n# deixando tudo pronto pra você sentar e estudar.', t, B.sobrio, 26)}
            </div>
          )}
          {/* cursor */}
          <span style={{ fontFamily: MONO, fontSize: 28, color: GREEN, opacity: t % 0.8 < 0.4 ? 1 : 0 }}>▌</span>
        </div>
      </div>

      {/* interface real assume */}
      <FlashCut t={t} atSec={B.interface} color="rgba(255,255,255,0.4)" />
      <div style={{ position: 'absolute', inset: 0, opacity: uiOp }}>
        <div style={{ position: 'absolute', left: '50%', top: 860, transform: `translate(-50%,-50%) scale(${0.94 + uiOp * 0.06})`, width: 640, height: 1180, borderRadius: 34, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.14)', boxShadow: '0 60px 140px -30px rgba(0,0,0,0.9)' }}>
          <ClipAt fromSec={B.interface - 0.3}>
            <OffthreadVideo src={staticFile('rec/m_dashboard.mp4')} muted startFrom={80} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </ClipAt>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 240, textAlign: 'center', opacity: win(t, B.pronto, B.pronto + 0.4) }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: GREEN, textShadow: '0 0 30px rgba(74,222,128,0.5)' }}>
            SISTEMA PRONTO. <span style={{ color: WHITE }}>e você?</span>
          </span>
        </div>
      </div>

      <Vignette strength={0.5} />
      <Grain opacity={0.06} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1680} size={50} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c59.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
