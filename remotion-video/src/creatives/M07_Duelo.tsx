import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { MedufBg, MBadge, MEndCard, M_BLUE, M_DEEP, M_NAVY, M_MUT, M_GREEN, M_RED, M_BG, WHITE } from './meduf';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/m07.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M07_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  valendo: DELAY + 3.37,
  caso: DELAY + 4.79,
  esquerda: DELAY + 10.99,
  abas: DELAY + 13.5,
  pdf: DELAY + 15.36,
  cron40: DELAY + 17.94,
  direita: DELAY + 21.27,
  digita: DELAY + 23.4,
  gpt: DELAY + 25.39,
  claude: DELAY + 26.19,
  gemini: DELAY + 26.54,
  concordam: DELAY + 28.73,
  divergem: DELAY + 29.99,
  pubmed: DELAY + 32.03,
  s30: DELAY + 37.36,
  pontos: DELAY + 39.36,
  fonte: DELAY + 41.19,
  decisao: DELAY + 43.26,
  encurta: DELAY + 47.36,
  n10k: DELAY + 50.1,
  suaVez: DELAY + 53.03,
  abre: DELAY + 56.3,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  abertura: [0, B.caso - 0.2] as Range,
  caso: [B.caso - 0.2, B.esquerda] as Range,
  esquerda: [B.esquerda, B.direita] as Range,
  direita: [B.direita, B.s30 + 0.5] as Range,
  vitoria: [B.s30 + 0.5, B.n10k - 0.3] as Range,
  placar: [B.n10k - 0.3, B.suaVez + 0.3] as Range,
  cta: [B.suaVez + 0.3, B.end + 1.0] as Range,
};

const fmtTimer = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* cronômetro */
const Timer: React.FC<{ label: string; sec: number; color: string; x: number; y: number; size?: number; frozen?: boolean }> =
({ label, sec, color, x, y, size = 64, frozen }) => (
  <div style={{ position: 'absolute', left: x, top: y, textAlign: 'center' }}>
    <div style={{ fontFamily: BODY, fontSize: size * 0.3, color: M_MUT, letterSpacing: 3, textTransform: 'uppercase' }}>{label}</div>
    <div style={{
      fontFamily: MONO, fontWeight: 700, fontSize: size, color, lineHeight: 1.15,
      textShadow: frozen ? `0 0 30px ${color}66` : 'none',
    }}>
      {fmtTimer(sec)}{frozen ? ' ✓' : ''}
    </div>
  </div>
);

/* ══ S1+S2 — abertura e o caso ═══════════════════════════════════════════ */
const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, [0, SC.caso[1]] as Range, true);
  const lineH = interpolate(frame, [4, 22], [0, 1920], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titOp = interpolate(frame, [8, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const valOp = interpolate(t, [B.valendo, B.valendo + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const caseOp = interpolate(t, [B.caso, B.caso + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // o card duplica: desliza pros dois lados
  const dup = clamp01((t - (B.caso + 3.2)) / 0.8);
  const dupE = easeInOut(dup);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, width: 3, height: lineH, background: `linear-gradient(180deg, ${M_BLUE}, transparent)`, transform: 'translateX(-50%)', boxShadow: `0 0 16px ${M_BLUE}66` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', opacity: titOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: M_NAVY, letterSpacing: -1 }}>
          MESMA DÚVIDA.<br />DOIS CAMINHOS.
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: M_BLUE, marginTop: 18, opacity: valOp }}>
          VALENDO. 🏁
        </div>
      </div>
      {[-1, 1].map(side => (
        <div key={side} style={{
          position: 'absolute', left: '50%', top: 760,
          transform: `translateX(calc(-50% + ${side === -1 ? dupE * -250 : dupE * 250}px)) scale(${1 - dupE * 0.22})`,
          opacity: caseOp * (side === 1 || dup > 0 ? 1 : 1),
          width: 640, borderRadius: 20,
          background: WHITE, padding: '30px 36px',
          boxShadow: '0 30px 80px -24px rgba(14,27,51,0.4)',
          display: side === -1 && dup === 0 ? 'none' : 'block',
        }}>
          <div style={{ fontFamily: BODY, fontSize: 19, color: M_MUT, letterSpacing: 3, textTransform: 'uppercase' }}>caso clínico</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_NAVY, marginTop: 10, lineHeight: 1.3 }}>
            Cefaleia súbita intensa + rigidez de nuca. <span style={{ color: M_BLUE }}>Conduta inicial?</span>
          </div>
        </div>
      ))}
      <div style={{ opacity: interpolate(t, [B.caso + 3.6, B.caso + 4.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        <Timer label="você" sec={Math.max(0, (t - (B.caso + 4)) * 1)} color={M_NAVY} x={150} y={1300} />
        <Timer label="você + meduf" sec={Math.max(0, (t - (B.caso + 4)) * 1)} color={M_BLUE} x={640} y={1300} />
      </div>
    </div>
  );
};

/* ══ S3 — lado esquerdo: o caminho das abas ══════════════════════════════ */
const S3: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.esquerda);
  const base = Math.round(SC.esquerda[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  // cronômetro esquerdo em timelapse: acelera
  const el = Math.max(0, t - SC.esquerda[0]);
  const leftSec = Math.min(2400, el * el * 26);
  const TABS = ['busca: cefaleia súbita...', 'fórum — 2019', 'diretriz_2014.pdf', 'artigo (paywall)', 'blog médico', 'busca: rigidez nuca', 'PDF pág. 214'];
  const nTabs = Math.min(TABS.length, 1 + Math.floor(el * 1.6));
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 400, opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>
        <div style={{
          borderRadius: 22, background: WHITE, overflow: 'hidden',
          boxShadow: '0 36px 90px -26px rgba(14,27,51,0.45)',
          filter: `saturate(${1 - Math.min(0.6, el * 0.05)})`,
        }}>
          <div style={{ background: '#e8ecf4', padding: '14px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TABS.slice(0, nTabs).map((tb, i) => (
              <div key={i} style={{
                background: i === nTabs - 1 ? WHITE : 'rgba(255,255,255,0.6)',
                borderRadius: 8, padding: '8px 14px',
                fontFamily: BODY, fontSize: 16, color: '#3d4a61',
                maxWidth: 190, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>{tb}</div>
            ))}
          </div>
          <div style={{ padding: '26px 30px', height: 560 }}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={{
                height: i % 3 === 0 ? 22 : 14,
                width: `${88 - (i * 7) % 40}%`,
                background: i % 3 === 0 ? '#c9d3e4' : '#e3e9f3',
                borderRadius: 6, marginBottom: 18,
                opacity: interpolate(frame - base - 8 - i * 3, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }} />
            ))}
            <div style={{
              marginTop: 8, display: 'inline-block',
              opacity: interpolate(t, [B.pdf, B.pdf + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              background: '#fff5f5', border: `1.5px solid ${M_RED}55`, borderRadius: 12,
              padding: '14px 22px', fontFamily: MONO, fontSize: 21, color: '#b3372f',
            }}>
              📄 diretriz_2014.pdf — <b>2014</b>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1280, display: 'flex', justifyContent: 'center' }}>
        <Timer label="você, sozinho" sec={leftSec} color={leftSec > 600 ? M_RED : M_NAVY} x={0} y={0} size={92} />
      </div>
    </div>
  );
};

/* ══ S4 — lado direito: MEDUF ════════════════════════════════════════════ */
const S4: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.direita);
  const base = Math.round(SC.direita[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const el = Math.max(0, t - SC.direita[0]);
  const rightSec = Math.min(30, el * 1.95);
  const swapAt = B.concordam - 0.3;
  const fiA = 1, foA = clamp01(1 - (t - swapAt) / 0.38);
  const fiB = clamp01((t - swapAt) / 0.38);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 330,
        transform: `translateX(-50%) translateY(${(1 - s) * 80}px)`,
        opacity: s,
      }}>
        <div style={{ position: 'relative' }}>
          {foA > 0 && (
            <div style={{ opacity: foA }}>
              <ClipAt fromSec={SC.direita[0]}>
                <PhoneFrame src="rec/mg_chat.mp4" width={560} startFrom={60} statusDark />
              </ClipAt>
            </div>
          )}
          {fiB > 0 && (
            <div style={{ position: 'absolute', inset: 0, opacity: fiB }}>
              <ClipAt fromSec={swapAt - 0.4}>
                <PhoneFrame src="rec/mg_chat.mp4" width={560} startFrom={520} statusDark />
              </ClipAt>
            </div>
          )}
        </div>
      </div>
      <MBadge x={40} y={430} delay={Math.round(B.gpt * FPS)} from="left" top="GPT · Claude · Gemini" bottom="respondem juntos" />
      <MBadge x={620} y={620} delay={Math.round(B.concordam * FPS)} from="right" green top="✓ concordam" />
      <MBadge x={640} y={770} delay={Math.round(B.divergem * FPS)} from="right" top="⚠ divergem" />
      <MBadge x={40} y={950} delay={Math.round(B.pubmed * FPS)} from="left" accent
        top="PubMed +35 milhões · SUS" bottom="a fonte pra você conferir" />
      <div style={{ position: 'absolute', right: 90, top: 1520 }}>
        <Timer label="você + meduf" sec={rightSec} color={M_BLUE} x={0} y={0} size={80} />
      </div>
    </div>
  );
};

/* ══ S5 — bandeirada ═════════════════════════════════════════════════════ */
const S5: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.vitoria);
  const base = Math.round(SC.vitoria[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 12, stiffness: 110 }, from: 1.5, to: 1 });
  const decOp = interpolate(t, [B.decisao, B.decisao + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const el = Math.max(0, t - SC.vitoria[0]);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 480, textAlign: 'center', transform: `scale(${s})` }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 170, color: M_BLUE, lineHeight: 1, textShadow: '0 0 60px rgba(21,96,232,0.4)' }}>
          00:30<span style={{ color: M_GREEN }}> ✓</span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: 26, color: M_MUT, marginTop: 14 }}>
          pontos de atenção na tela · fonte pra conferir
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: 'rgba(14,27,51,0.35)', marginTop: 34 }}>
          {fmtTimer(2280 + el * 26)} <span style={{ fontFamily: BODY, fontSize: 22 }}>e contando...</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 1120, textAlign: 'center', opacity: decOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: M_NAVY, letterSpacing: -2 }}>
          VOCÊ VALIDA.<br /><span style={{ color: M_BLUE }}>VOCÊ DECIDE.</span>
        </div>
      </div>
    </div>
  );
};

/* ══ S6+S7 — placar e CTA ════════════════════════════════════════════════ */
const S6: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.placar);
  const base = Math.round(SC.placar[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.88, to: 1 });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', transform: `scale(${s})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: M_NAVY, letterSpacing: -3 }}>
          10.000<span style={{ color: M_BLUE }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34, color: M_MUT, marginTop: 6 }}>
          médicos já cronometraram
        </div>
      </div>
    </div>
  );
};

const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.cta);
  const base = Math.round(SC.cta[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.9, to: 1 });
  const urlOp = interpolate(t, [B.abre, B.abre + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 640, textAlign: 'center', transform: `scale(${s})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: M_NAVY, letterSpacing: -1, lineHeight: 1.25 }}>
          pega a sua dúvida<br /><span style={{ color: M_BLUE }}>mais difícil...</span>
        </div>
        <div style={{ marginTop: 40, opacity: urlOp }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: M_BLUE }}>meduf.com.br</span>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_NAVY, marginTop: 18 }}>
            ⏱ cronometra... e compara.
          </div>
        </div>
      </div>
    </div>
  );
};

export const M07_Duelo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S3 t={t} />
      <S4 t={t} />
      <S5 t={t} />
      <S6 t={t} />
      <S7 t={t} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={54} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m07.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
