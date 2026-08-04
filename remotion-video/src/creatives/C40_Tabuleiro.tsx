import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c40.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C40_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  prova: DELAY + 0.8,
  casa: DELAY + 3.0,
  armadilha: DELAY + 4.9,
  reler: DELAY + 6.2,
  volta3: DELAY + 8.6,
  perdido: DELAY + 10.1,
  perdeVez: DELAY + 12.1,
  atalhos: DELAY + 13.6,
  escada: DELAY + 15.1,
  sobe: DELAY + 17.3,
  trampolim: DELAY + 18.4,
  pula: DELAY + 22.0,
  ponte: DELAY + 23.3,
  triade: DELAY + 26.2,
  desenha: DELAY + 29.9,
  verTudo: DELAY + 32.1,
  n10k: DELAY + 34.8,
  jogando: DELAY + 36.8,
  final: DELAY + 40.7,
  muda: DELAY + 43.7,
  teste: DELAY + 45.1,
  peao: DELAY + 48.5,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  board: [0, B.ponte - 0.3] as Range,
  mapa: [B.ponte - 0.3, B.verTudo + 2.4] as Range,
  jogadores: [B.verTudo + 2.4, B.final - 0.3] as Range,
  final: [B.final - 0.3, B.end + 1.0] as Range,
};

/* casas serpenteando */
const CELLS: Array<{ x: number; y: number }> = [];
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 4; c++) {
    const col = r % 2 === 0 ? c : 3 - c;
    CELLS.push({ x: 170 + col * 250, y: 1440 - r * 240 });
  }
}

const Board: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.board, true);
  // peão anda com a narração
  const steps = [
    [B.casa, 1], [B.reler, 3], [B.volta3, 0],       // armadilha: volta
    [B.atalhos, 2], [B.sobe, 5], [B.pula, 8],
  ] as const;
  let pos = 0;
  let from = 0, fromT = 0, toT = 0.4;
  for (const [at, p] of steps) {
    if (t >= at) { from = pos; pos = p; fromT = at; toT = at + 0.5; }
  }
  const prog = easeInOut(clamp01((t - fromT) / (toT - fromT)));
  const cellA = CELLS[Math.min(from, CELLS.length - 1)];
  const cellB = CELLS[Math.min(pos, CELLS.length - 1)];
  const px = cellA.x + (cellB.x - cellA.x) * prog;
  const py = cellA.y + (cellB.y - cellA.y) * prog - Math.sin(prog * Math.PI) * 90;
  const titOp = interpolate(frame, [2, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', opacity: titOp, zIndex: 5 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: O_INK, letterSpacing: -1 }}>
          sua prova é a <span style={{ color: O_RED }}>última casa.</span>
        </div>
      </div>
      {/* casas */}
      {CELLS.map((c, i) => {
        const isLast = i === CELLS.length - 1;
        const trap = i === 5 || i === 11;
        const o = interpolate(frame, [6 + i * 2, 14 + i * 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute', left: c.x - 90, top: c.y - 70, width: 180, height: 140,
            opacity: o,
            background: isLast ? O_RED : trap ? '#fff0ee' : WHITE,
            border: `2px solid ${isLast ? O_RED : trap ? 'rgba(224,45,45,0.4)' : 'rgba(22,24,29,0.1)'}`,
            borderRadius: 18,
            boxShadow: '0 12px 30px -12px rgba(22,24,29,0.18)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: isLast ? 26 : 22, color: isLast ? WHITE : trap ? O_RED : O_MUT }}>
              {isLast ? 'PROVA' : trap ? '⚠' : `sem ${i + 1}`}
            </span>
            {trap && <span style={{ fontFamily: BODY, fontSize: 14, color: O_RED }}>{i === 5 ? 'só reler: −3' : 'perdeu a vez'}</span>}
          </div>
        );
      })}
      {/* atalhos desenhados */}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {t > B.escada - 0.3 && (
          <line x1={CELLS[2].x} y1={CELLS[2].y} x2={CELLS[5].x} y2={CELLS[5].y - 40} stroke={O_GREEN} strokeWidth={7} strokeDasharray="16 10" opacity={0.7} />
        )}
        {t > B.trampolim - 0.3 && (
          <path d={`M ${CELLS[5].x} ${CELLS[5].y - 30} Q ${(CELLS[5].x + CELLS[8].x) / 2} ${CELLS[8].y - 260} ${CELLS[8].x} ${CELLS[8].y - 30}`}
            fill="none" stroke={O_RED} strokeWidth={7} strokeDasharray="4 12" opacity={0.75} />
        )}
      </svg>
      {/* rótulos dos atalhos */}
      {t > B.escada && (
        <div style={{ position: 'absolute', left: 90, top: 1140, background: 'rgba(14,159,110,0.1)', border: '1.5px solid rgba(14,159,110,0.45)', borderRadius: 12, padding: '8px 18px', fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: O_GREEN }}>
          🪜 escada do resumo
        </div>
      )}
      {t > B.trampolim + 0.3 && (
        <div style={{ position: 'absolute', left: 480, top: 900, background: 'rgba(224,45,45,0.08)', border: '1.5px solid rgba(224,45,45,0.4)', borderRadius: 12, padding: '8px 18px', fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: O_RED }}>
          🃏 trampolim dos flashcards
        </div>
      )}
      {/* peão */}
      <div style={{ position: 'absolute', left: px - 26, top: py - 60, zIndex: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50% 50% 50% 0', background: O_RED, transform: 'rotate(-45deg)', boxShadow: '0 14px 30px -8px rgba(224,45,45,0.5)' }} />
        <div style={{ width: 20, height: 20, borderRadius: 999, background: WHITE, position: 'absolute', top: 15, left: 16 }} />
      </div>
    </div>
  );
};

export const C40_Tabuleiro: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />
      <Board t={t} />

      {/* a ponte: cronograma com mapa mental (tela real) */}
      <OLPhone t={t} range={SC.mapa} src="rec/ol_plano.mp4" startFrom={270}>
        <OLBadge x={56} y={330} delay={Math.round((B.ponte + 0.4) * FPS)} from="left" accent
          top="🌉 a ponte nova" bottom="cronograma com mapa mental" />
        <OLBadge x={600} y={520} delay={Math.round(B.triade * FPS)} from="right"
          top="objetivo · horas · prova" />
        <OLBadge x={56} y={1140} delay={Math.round(B.verTudo * FPS)} from="left" green
          top="✓ dá pra ver o tabuleiro todo" bottom="pela primeira vez" />
      </OLPhone>

      {/* jogadores: peões como prova social */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.jogadores) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', maxWidth: 700, margin: '0 auto' }}>
            {[...Array(12)].map((_, i) => {
              const o = interpolate(t, [SC.jogadores[0] + 0.2 + i * 0.12, SC.jogadores[0] + 0.4 + i * 0.12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{
                  width: 44, height: 44, borderRadius: '50% 50% 50% 0',
                  background: i % 3 === 0 ? O_RED : i % 3 === 1 ? '#3aa0e0' : O_GREEN,
                  transform: `rotate(-45deg) scale(${o})`,
                }} />
              );
            })}
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_INK, marginTop: 50, letterSpacing: -1.5,
            opacity: interpolate(t, [B.n10k, B.n10k + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            +10.000 <span style={{ color: O_RED }}>jogando junto</span>
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 26, color: O_MUT, marginTop: 14,
            opacity: interpolate(t, [B.jogando + 0.6, B.jogando + 1.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            num acervo com +530 cursos
          </div>
        </div>
      </div>

      {/* final: a casa PROVA */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.final) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', background: O_RED, borderRadius: 26, padding: '34px 70px',
            boxShadow: '0 26px 70px -18px rgba(224,45,45,0.55)',
            transform: `scale(${1 + Math.sin((t - SC.final[0]) * 4) * 0.02})`,
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 72, color: WHITE, letterSpacing: 2 }}>PROVA</span>
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 42, color: O_INK, marginTop: 40,
            opacity: interpolate(t, [B.muda, B.muda + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            o que muda... <span style={{ color: O_RED }}>é o caminho.</span>
          </div>
          <div style={{
            marginTop: 44, display: 'inline-flex', alignItems: 'center', gap: 16,
            opacity: interpolate(t, [B.peao, B.peao + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50% 50% 50% 0', background: O_RED, transform: 'rotate(-45deg)' }} />
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: O_INK }}>seu peão já está na primeira casa.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c40.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
