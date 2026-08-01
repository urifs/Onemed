import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { LaptopFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import {
  useZoomPunch, KenBurnsVideo, Spotlight, whipProgress, WhipPane, TiltIn, useSquash, TapDot,
} from './motion';
import { RED, WHITE, HEAD, BODY, W60, W12, fade } from './theme';
import timing from './timings/c12.json';

const T = timing as Timing;
const FPS = 30;
const DELAY = 0.4; // narração entra quase junto do frame 0 (payoff antes do processo)
export const C12_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

/*
 * Beat map (frames absolutos na comp, palavras reais do c12.json + DELAY 0.4s):
 *   61  "pesado"        → zoom punch (feed full-bleed já rolando desde o frame 0)
 *  150  "acompanhado"   → Spotlight no card da Dra. Camila (anel dourado)
 *  193  "Abre"          → WHIP 1 → composer digitando ao vivo
 *  224  "pergunta"      → zoom punch
 *  258–270               → crossfade → n_reply (thread com selo Equipe OneMed)
 *  340  "selo"          → zoom punch + Spotlight no selo
 *  387  "Curtiu"        → WHIP 2 → feed rumo ao momento do like
 *  439                  → coração enche 18→19 (src 6.5s) + TapDot
 *  441  "Coração"       → zoom punch
 *  501–513               → crossfade → n_bell (popover com card do WhatsApp)
 *  521  "WhatsApp"      → zoom punch + Spotlight no card
 *  580  "trava/aula"    → WHIP 3 → desktop (LaptopFrame + TiltIn)
 *  651  "destrava"      → zoom punch
 *  684–696               → crossfade → contador gigante
 *  691  "+10.000"       → zoom punch + count-up
 *  864                  → EndCard (últimos 4.2s, CTA falado sobrepõe)
 */
const P_PESADO = 61;
const P_PERGUNTA = 224;
const P_SELO = 340;
const P_CORACAO = 441;
const P_WHATS = 521;
const P_DESTRAVA = 651;
const P_MIL = 691;
const W1 = 193;
const W2 = 387;
const W3 = 580;
const B_END = 864;

/** fade-in local (12f) para cenas que entram por crossfade */
const FadeIn: React.FC<{ dur?: number; children: React.ReactNode }> = ({ dur = 12, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

/** cena final: contador +10.000 com avatares e pills (frames locais da Sequence) */
const CommunityStats: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useCountUp(10000, 7, 42);
  const squash = useSquash(49); // aterrissa quando o contador crava 10.000
  const inS = spring({ frame: f - 4, fps, config: { damping: 13, stiffness: 90 }, from: 0.82, to: 1 });
  const inOp = interpolate(f, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp = interpolate(f, [26, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillsOp = interpolate(f, [50, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const AV = [
    { i: 'AC', c: '#7f1d1d', gold: true },
    { i: 'RM', c: '#374151', gold: false },
    { i: 'JP', c: '#4b5563', gold: false },
    { i: 'LS', c: '#991b1b', gold: false },
    { i: 'TB', c: '#1f2937', gold: false },
  ];

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 760px 620px at 50% 44%, rgba(239,68,68,0.17) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 34, paddingBottom: 340,
      }}>
        {/* avatares sobrepostos da comunidade */}
        <div style={{ display: 'flex', opacity: inOp }}>
          {AV.map((a, i) => {
            const s = spring({ frame: f - (10 + i * 4), fps, config: { damping: 12, stiffness: 140 }, from: 0, to: 1 });
            return (
              <div key={a.i} style={{
                width: 96, height: 96, borderRadius: '50%', marginLeft: i === 0 ? 0 : -22,
                background: a.c, transform: `scale(${s})`,
                border: a.gold ? '3.5px solid #f59e0b' : '3.5px solid rgba(255,255,255,0.25)',
                boxShadow: a.gold ? '0 0 22px rgba(245,158,11,0.55)' : '0 10px 26px rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 - i,
              }}>
                <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: WHITE }}>{a.i}</span>
              </div>
            );
          })}
        </div>

        {/* contador gigante */}
        <div style={{ opacity: inOp, transform: `scale(${inS})` }}>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 186, lineHeight: 1, color: WHITE,
            letterSpacing: -4, transform: squash,
            textShadow: '0 0 60px rgba(239,68,68,0.45)',
          }}>
            <span style={{ color: RED }}>+</span>{n}
          </div>
        </div>

        <div style={{
          opacity: subOp, fontFamily: BODY, fontWeight: 600, fontSize: 38,
          color: 'rgba(255,255,255,0.82)', letterSpacing: 0.5,
        }}>
          médicos e estudantes do seu lado
        </div>

        <div style={{ opacity: pillsOp, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', padding: '0 60px' }}>
          {['respostas da equipe', 'grupo no WhatsApp', 'comunidade ativa'].map(s => (
            <span key={s} style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 24, color: W60,
              background: W12, border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 999, padding: '12px 26px',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const C12_Comunidade: React.FC = () => {
  const frame = useCurrentFrame();
  const punch = useZoomPunch([P_PESADO, P_PERGUNTA, P_SELO, P_CORACAO, P_WHATS, P_DESTRAVA, P_MIL], 1.15);
  const w1 = whipProgress(frame, W1);
  const w2 = whipProgress(frame, W2);
  const w3 = whipProgress(frame, W3);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg />

      {/* stack de cenas — recebe o zoom punch inteiro */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${punch})`, transformOrigin: '50% 46%' }}>

        {/* S1a · frame 0: feed da comunidade JÁ rolando, full-bleed (payoff imediato) */}
        <Sequence from={0} durationInFrames={101}>
          <KenBurnsVideo
            src="rec/n_community.mp4" startFrom={115} width={1080} height={1920}
            keys={[
              { f: 0, x: 0.5, y: 0.5, z: 1.02 },
              { f: 100, x: 0.5, y: 0.42, z: 1.1 },
            ]}
          />
        </Sequence>

        {/* S1b · close-up nos cards com anel dourado (Dra. Camila) + Spotlight em "acompanhado" */}
        <Sequence from={101} durationInFrames={96}>
          <WhipPane progress={w1} side="out">
            <KenBurnsVideo
              src="rec/n_community.mp4" startFrom={100} width={1080} height={1920}
              keys={[
                { f: 0, x: 0.2, y: 0.4, z: 1.06 },
                { f: 50, x: 0.2, y: 0.4, z: 1.2 },
                { f: 96, x: 0.2, y: 0.4, z: 1.24 },
              ]}
            />
            <Spotlight x={216} y={726} startFrame={49} duration={55} radius={175} />
          </WhipPane>
        </Sequence>

        {/* S2 · WHIP 1 → composer digitando título e corpo AO VIVO ("Abre um tópico, pergunta") */}
        <Sequence from={189} durationInFrames={81}>
          <WhipPane progress={w1} side="in">
            <KenBurnsVideo
              src="rec/n_community.mp4" startFrom={291} width={1080} height={1920}
              keys={[
                { f: 0, x: 0.5, y: 0.4, z: 1.0 },
                { f: 81, x: 0.5, y: 0.36, z: 1.12 },
              ]}
            />
            <TapDot x={540} y={570} frameAt={9} />
          </WhipPane>
        </Sequence>

        {/* S3 · crossfade → thread com resposta da EQUIPE ONEMED + Spotlight no selo oficial */}
        <Sequence from={258} durationInFrames={133}>
          <WhipPane progress={w2} side="out">
            <FadeIn>
              <KenBurnsVideo
                src="rec/n_reply.mp4" startFrom={72} width={1080} height={1920}
                keys={[
                  { f: 0, x: 0.45, y: 0.46, z: 1.0 },
                  { f: 60, x: 0.42, y: 0.48, z: 1.1 },
                  { f: 133, x: 0.42, y: 0.48, z: 1.18 },
                ]}
              />
              <TapDot x={430} y={840} frameAt={18} />
              <Spotlight x={454} y={913} startFrame={83} duration={55} radius={185} />
            </FadeIn>
          </WhipPane>
        </Sequence>

        {/* S4 · WHIP 2 → momento EXATO do like: coração enche 18→19 em "Coração nela" */}
        <Sequence from={383} durationInFrames={130}>
          <WhipPane progress={w2} side="in">
            <KenBurnsVideo
              src="rec/n_community.mp4" startFrom={139} width={1080} height={1920}
              keys={[
                { f: 0, x: 0.5, y: 0.5, z: 1.02 },
                { f: 40, x: 0.16, y: 0.55, z: 1.08 },
                { f: 80, x: 0.16, y: 0.55, z: 1.18 },
                { f: 130, x: 0.3, y: 0.5, z: 1.1 },
              ]}
            />
            <TapDot x={173} y={1077} frameAt={54} />
            <Spotlight x={173} y={1077} startFrame={56} duration={45} radius={140} />
          </WhipPane>
        </Sequence>

        {/* S5 · crossfade → sino de notificações com card do WhatsApp ("grupo no WhatsApp") */}
        <Sequence from={501} durationInFrames={83}>
          <WhipPane progress={w3} side="out">
            <FadeIn>
              <KenBurnsVideo
                src="rec/n_bell.mp4" startFrom={40} width={1080} height={1920}
                keys={[
                  { f: 0, x: 0.5, y: 0.32, z: 1.02 },
                  { f: 83, x: 0.5, y: 0.3, z: 1.16 },
                ]}
              />
              <Spotlight x={540} y={492} startFrame={20} duration={55} radius={200} />
            </FadeIn>
          </WhipPane>
        </Sequence>

        {/* S6 · WHIP 3 → comunidade no desktop (variação de dispositivo, "a comunidade destrava") */}
        <Sequence from={576} durationInFrames={120}>
          <WhipPane progress={w3} side="in">
            <TiltIn startFrame={2} fromDeg={-18} style={{ position: 'absolute', left: 60, top: 640 }}>
              <LaptopFrame src="rec/nd_community.mp4" width={960} startFrom={62} />
            </TiltIn>
            <FloatBadge x={330} y={1190} delay={30} from="left" accent>
              <BadgeText top="Comunidade" bottom="em todas as telas" />
            </FloatBadge>
            <TapDot x={354} y={969} frameAt={103} />
          </WhipPane>
        </Sequence>

        {/* S7 · crossfade → contador gigante "+10.000 médicos e estudantes" */}
        <Sequence from={684} durationInFrames={C12_DURATION - 684}>
          <FadeIn>
            <CommunityStats />
          </FadeIn>
        </Sequence>

        {/* pill de contexto sobre o feed do hook */}
        {frame < 197 && (
          <div style={{
            position: 'absolute', top: 96, left: '50%', transform: 'translateX(-50%)',
            opacity: fade(frame, 6, 20, 176, 194),
            background: 'rgba(5,5,5,0.55)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 999, padding: '12px 26px',
            display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(6px)',
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: RED, boxShadow: `0 0 12px ${RED}` }} />
            <span style={{
              fontFamily: BODY, fontWeight: 700, fontSize: 24, color: WHITE,
              letterSpacing: 2, textTransform: 'uppercase',
            }}>
              Comunidade OneMed
            </span>
          </div>
        )}
      </div>

      {/* legendas sincronizadas por palavra (zona segura) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1380} size={60} />

      {/* end card cobre o CTA falado */}
      <EndCard startFrame={B_END} />
      <Narration id="c12" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
