import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MedufBg, MLogo, MBadge, MPhone, MHero, MNumbers, MEndCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, M_BG, M_LIGHT, WHITE } from './meduf';
import timing from './timings/m02.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M02_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  mandei: DELAY + 4.68,
  alguem: DELAY + 6.21,       // bolha "alguém aí?"
  pontinhos: DELAY + 7.1,
  morreram: DELAY + 9.07,
  ninguem: DELAY + 9.84,
  conheci: DELAY + 12.03,     // logo
  digitei: DELAY + 12.77,
  enviei: DELAY + 16.06,
  ias: DELAY + 17.68,
  gpt: DELAY + 19.33,
  claude: DELAY + 20.12,
  gemini: DELAY + 20.53,
  concordam: DELAY + 22.2,
  divergem: DELAY + 23.35,
  pubmed: DELAY + 25.05,
  sus: DELAY + 28.76,
  apoio: DELAY + 29.54,
  decide: DELAY + 30.7,
  n17: DELAY + 33.28,
  n10k: DELAY + 34.75,
  n27: DELAY + 36.17,
  h24: DELAY + 37.68,
  seVoce: DELAY + 39.48,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  grupo: [0, B.conheci - 0.3] as Range,
  logo: [B.conheci - 0.3, B.digitei + 1.3] as Range,
  typing: [B.digitei + 1.3, B.ias + 0.6] as Range,
  consenso: [B.ias + 0.6, B.concordam + 0.4] as Range,
  result: [B.concordam + 0.4, B.decide - 0.4] as Range,
  decide: [B.decide - 0.4, B.n17 + 0.7] as Range,
  numeros: [B.n17 + 0.7, B.seVoce - 0.2] as Range,
  callback: [B.seVoce - 0.2, B.end + 1.0] as Range,
};

/* ══ bolha de chat (kit da cena 1 e do callback) ═════════════════════════ */
const ChatCard: React.FC<{ children: React.ReactNode; topPx: number; opacity?: number; y?: number }> =
({ children, topPx, opacity = 1, y = 0 }) => (
  <div style={{
    position: 'absolute', left: 70, right: 70, top: topPx,
    transform: `translateY(${y}px)`, opacity,
    background: '#101a2e', borderRadius: 26,
    boxShadow: '0 40px 100px -28px rgba(0,0,0,0.7)',
    padding: '30px 34px', overflow: 'hidden',
  }}>
    {children}
  </div>
);

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.grupo, true);
  const cardS = spring({ frame, fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const bolhaOp = interpolate(t, [B.alguem - 0.5, B.alguem], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // pontinhos pulsam e morrem
  const dotsAlive = t > B.pontinhos && t < B.morreram;
  const dotsDie = clamp01((t - B.morreram) / 0.5);
  const vistoOp = interpolate(t, [B.morreram + 0.5, B.morreram + 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // avatares apagando
  const AV = ['R', 'C', 'F', 'M', 'J'];
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,27,51,0.9)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 64, color: WHITE, opacity: 0.9, textShadow: '0 0 40px rgba(21,96,232,0.5)' }}>
          02:14
        </div>
        <div style={{ fontFamily: BODY, fontSize: 24, color: 'rgba(255,255,255,0.55)', marginTop: 10 }}>
          grupo · turma de medicina
        </div>
      </div>
      <div style={{ opacity: cardS, transform: `translateY(${(1 - cardS) * 80}px)` }}>
        <ChatCard topPx={600}>
          {/* avatares */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {AV.map((a, i) => {
              const off = clamp01((t - (B.ninguem - 0.8) - i * 0.22) / 0.3);
              return (
                <div key={i} style={{
                  width: 58, height: 58, borderRadius: 999,
                  background: off > 0.5 ? 'rgba(255,255,255,0.08)' : `hsl(${i * 60 + 10}, 45%, 45%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 24,
                  color: off > 0.5 ? 'rgba(255,255,255,0.25)' : WHITE,
                }}>{a}</div>
              );
            })}
          </div>
          {/* bolha enviada */}
          <div style={{
            marginLeft: 'auto', width: 'fit-content',
            opacity: bolhaOp, transform: `translateY(${(1 - bolhaOp) * 20}px)`,
            background: M_BLUE, borderRadius: '20px 20px 4px 20px',
            padding: '18px 28px', fontFamily: BODY, fontSize: 30, color: WHITE,
          }}>
            alguém aí? 🆘
          </div>
          {/* digitando... que morre */}
          <div style={{ marginTop: 22, height: 54, display: 'flex', alignItems: 'center' }}>
            {dotsAlive && (
              <div style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: '20px 20px 20px 4px',
                padding: '14px 24px', display: 'flex', gap: 8,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.7)',
                    opacity: 0.3 + 0.7 * Math.abs(Math.sin(t * 5 + i * 0.9)),
                  }} />
                ))}
              </div>
            )}
            {dotsDie > 0 && (
              <div style={{ fontFamily: BODY, fontSize: 22, color: 'rgba(255,255,255,0.4)', opacity: vistoOp }}>
                visto por último às 23:47
              </div>
            )}
          </div>
        </ChatCard>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1120, textAlign: 'center',
        opacity: interpolate(t, [B.ninguem + 0.3, B.ninguem + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 36, color: WHITE }}>
          ninguém <span style={{ color: M_RED }}>acordado.</span>
        </span>
      </div>
    </div>
  );
};

const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.logo);
  const base = Math.round(SC.logo[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 12, stiffness: 95 }, from: 0.6, to: 1 });
  const o = interpolate(frame - base, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center', opacity: o, transform: `scale(${s})` }}>
        <MLogo size={120} row={false} />
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1140, textAlign: 'center',
        opacity: interpolate(frame - base, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <span style={{ fontFamily: BODY, fontSize: 25, color: M_MUT, letterSpacing: 5, textTransform: 'uppercase' }}>
          o colega que nunca dorme
        </span>
      </div>
    </div>
  );
};

/* ══ callback: a bolha com resposta ══════════════════════════════════════ */
const S8: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.callback);
  const base = Math.round(SC.callback[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 15, stiffness: 75 }, from: 0, to: 1 });
  const replyAt = SC.callback[0] + 1.1;
  const rOp = interpolate(t, [replyAt, replyAt + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const refOp = interpolate(t, [replyAt + 0.7, replyAt + 1.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 54, color: M_NAVY, opacity: 0.85 }}>02:14</div>
        <div style={{ fontFamily: BODY, fontSize: 23, color: M_MUT, marginTop: 8 }}>a hora não mudou. o que mudou foi ter resposta.</div>
      </div>
      <div style={{ opacity: s, transform: `translateY(${(1 - s) * 70}px)` }}>
        <div style={{
          position: 'absolute', left: 70, right: 70, top: 620,
          background: WHITE, borderRadius: 26, padding: '30px 34px',
          boxShadow: '0 40px 100px -28px rgba(14,27,51,0.4)',
        }}>
          <div style={{
            marginLeft: 'auto', width: 'fit-content',
            background: M_BLUE, borderRadius: '20px 20px 4px 20px',
            padding: '16px 26px', fontFamily: BODY, fontSize: 27, color: WHITE,
          }}>
            paciente complicado. alguém aí?
          </div>
          <div style={{
            marginTop: 20, width: 'fit-content', opacity: rOp,
            background: M_BG, border: `1.5px solid ${M_LIGHT}`,
            borderRadius: '20px 20px 20px 4px', padding: '16px 26px',
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: M_NAVY }}>
              sempre. <span style={{ color: M_BLUE }}>em segundos.</span>
            </span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, opacity: refOp }}>
            <span style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 19, color: M_GREEN,
              background: 'rgba(14,159,110,0.09)', border: '1.5px solid rgba(14,159,110,0.35)',
              borderRadius: 999, padding: '8px 18px',
            }}>✓ com referência</span>
            <span style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 19, color: M_MUT,
              background: M_BG, borderRadius: 999, padding: '8px 18px',
            }}>PubMed · SUS</span>
          </div>
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1130, textAlign: 'center',
        opacity: interpolate(t, [SC.callback[0] + 2.6, SC.callback[0] + 3.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: M_NAVY }}>
          isso aqui é <span style={{ color: M_BLUE }}>pra você.</span>
        </span>
      </div>
    </div>
  );
};

export const M02_Chat: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />

      {/* digitando o caso no assistente */}
      <MPhone t={t} range={SC.typing} src="rec/mg_chat.mp4" startFrom={60}>
        <MBadge x={56} y={330} delay={Math.round((SC.typing[0] + 0.4) * FPS)} from="left" accent
          top="Assistente Clínico" bottom="pergunta em linguagem natural" />
      </MPhone>

      {/* enviado + analisando */}
      <MPhone t={t} range={SC.consenso} src="rec/mg_chat.mp4" startFrom={210}>
        <MBadge x={600} y={480} delay={Math.round(B.gpt * FPS)} from="right" top="GPT" bottom="OpenAI" />
        <MBadge x={620} y={640} delay={Math.round(B.claude * FPS)} from="right" top="Claude" bottom="Anthropic" />
        <MBadge x={600} y={800} delay={Math.round(B.gemini * FPS)} from="right" top="Gemini" bottom="Google" />
      </MPhone>

      {/* resposta real com seções */}
      <MPhone t={t} range={SC.result} src="rec/mg_chat.mp4" startFrom={520}>
        <MBadge x={56} y={340} delay={Math.round((B.concordam + 0.45) * FPS)} from="left" green
          top="✓ onde concordam" />
        <MBadge x={620} y={500} delay={Math.round(B.divergem * FPS)} from="right"
          top="⚠ onde divergem" />
        <MBadge x={56} y={670} delay={Math.round(B.pubmed * FPS)} from="left" accent
          top="PubMed" bottom="+35 milhões de artigos" />
        <MBadge x={600} y={850} delay={Math.round(B.sus * FPS)} from="right"
          top="Protocolos do SUS" bottom="PCDT · RENAME" />
      </MPhone>

      <MHero t={t} range={SC.decide} line1="ela responde sempre." line2="quem decide é você." size={68} blueAfterSec={1.5} />

      <MNumbers t={t} range={SC.numeros}
        atFirstSec={B.n10k} atSecondSec={B.n27} atPillSec={B.h24}
        pillText={<>🕐 24 horas por dia · 17 ferramentas</>} />

      <S8 t={t} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m02.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
