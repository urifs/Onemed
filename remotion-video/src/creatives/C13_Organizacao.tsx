import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { CaptionTrack, Timing } from './Captions';
import {
  useZoomPunch, KenBurnsVideo, Spotlight, whipProgress, WhipPane, useSquash, TapDot,
} from './motion';
import { RED, WHITE, HEAD, BODY, MONO, W60, W12, fade } from './theme';
import timing from './timings/c13.json';

const T = timing as Timing;
const FPS = 30;
const DELAY = 0.4; // narração entra quase junto do frame 0 (payoff antes do processo)
export const C13_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

/*
 * Beat map (frames absolutos na comp, palavras reais do c13.json + DELAY 0.4s).
 * Posições calibradas frame a frame nos takes (extração via ffmpeg):
 *
 *    0  FRAME 0: n_search2 digitando "ecg" AO VIVO (src 18 = 0.6s) + pill "530 cursos"
 *  101  "segundos"      → zoom punch (mascara o corte S1→S2 em 100)
 *  108  checkbox "Conteúdos internos" é tocado no take (src ~118) → TapDot
 *  114  Spotlight no checkbox enquanto a voz diz "procura dentro dos cursos"
 *  195/213 "arquivo"×2  → zoom punches staccato (cards rolando)
 *  238  "Favorita"      → WHIP 1 → n_tools: aula marcada (check verde, src ~123)
 *  245  TapDot no check + punch 246; Spotlight na ESTRELA dourada em "importa"
 *  288  "Baixa"         → crossfade → n_download: toque no botão de download
 *  299  TapDot no download (vira loader girando, src ~63) + punch 300
 *  322  jump cut → player da aula aberto ("assistir onde quiser")
 *  355  TapDot no "Baixar" do header do player (src ~258)
 *  361  "sino"          → WHIP 2 → n_bell: Spotlight no sino ANTES de abrir
 *  401  TapDot no sino (src ~80); popover abre com os cursos 2026
 *  412  "atualização"   → zoom punch com o popover florescendo
 *  445  "sem pagar"     → badge accent "Atualizações sem custo extra"
 *  496  "organizado"    → WHIP 3 → m_rows: gaveta CATEGORIAS deslizando (src 324)
 *  521  "categoria"     → zoom punch na lista de 17 categorias
 *  598  crossfade → estante de livros + contador gigante
 *  607  "9.000"         → zoom punch + count-up
 *  720  EndCard (últimos 4.2s, CTA falado sobrepõe)
 *
 * Mapeamento dos takes mobile 780x1688:
 *  · cover centrado (1080x1920): x = fx*1080 ; y = 960 + (fy - 0.5) * 2337
 *  · ancorado no topo (1080x2337, top:0): x = fx*1080 ; y = fy*2337
 *    (usado quando o header do app — busca, sino, título do player — precisa aparecer)
 */
const P_SEGUNDOS = 101;
const P_ARQ1 = 195;
const P_ARQ2 = 213;
const P_STAR = 246;
const P_DL = 300;
const P_ATT = 412;
const P_CAT = 521;
const P_LIVROS = 607;
const W1 = 238;
const W2 = 361;
const W3 = 496;
const CUT1 = 100;
const B_END = 720;

/** container full-bleed ancorado no topo: mostra o header do take (nada cortado em cima) */
const TOP: React.CSSProperties = { position: 'absolute', top: 0, left: 0 };

/** fade-in local (12f) para cenas que entram por crossfade */
const FadeIn: React.FC<{ dur?: number; children: React.ReactNode }> = ({ dur = 12, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

/** pill do hook: contador "530 cursos" surgindo pequeno no canto (frames locais da S1) */
const CounterPill: React.FC = () => {
  const f = useCurrentFrame();
  const n = useCountUp(530, 10, 40);
  const op = fade(f, 8, 20, 86, 98);
  const slide = interpolate(f, [8, 22], [-60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: 40, top: 1120, opacity: op,
      transform: `translateX(${slide}px)`,
      background: 'rgba(5,5,5,0.62)', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 999, padding: '14px 28px',
      display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(6px)',
    }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: RED, boxShadow: `0 0 12px ${RED}` }} />
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: WHITE, letterSpacing: 0.5 }}>{n}</span>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24, color: W60, letterSpacing: 1, textTransform: 'uppercase' }}>
        cursos
      </span>
    </div>
  );
};

/** cena final: estante de livros + contador +9.000 (frames locais da Sequence) */
const BooksStats: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useCountUp(9000, 12, 38);
  const squash = useSquash(50); // aterrissa quando crava 9.000
  const inS = spring({ frame: f - 6, fps, config: { damping: 13, stiffness: 90 }, from: 0.84, to: 1 });
  const inOp = interpolate(f, [6, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp = interpolate(f, [30, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillsOp = interpolate(f, [54, 68], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // estante: lombadas de livro springando de baixo, uma vermelha
  const SPINES = [
    { h: 122, c: '#1f2937', red: false },
    { h: 158, c: '#374151', red: false },
    { h: 140, c: '#7f1d1d', red: true },
    { h: 168, c: '#2b3442', red: false },
    { h: 130, c: '#4b5563', red: false },
    { h: 150, c: '#991b1b', red: true },
  ];

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 760px 620px at 50% 44%, rgba(239,68,68,0.17) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 36, paddingBottom: 330,
      }}>
        {/* mini-estante */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 172 }}>
          {SPINES.map((b, i) => {
            const s = spring({ frame: f - (8 + i * 3), fps, config: { damping: 12, stiffness: 150 }, from: 0, to: 1 });
            return (
              <div key={i} style={{
                width: 40, height: b.h, borderRadius: '8px 8px 3px 3px',
                background: b.c,
                border: b.red ? '2px solid rgba(239,68,68,0.75)' : '2px solid rgba(255,255,255,0.14)',
                boxShadow: b.red ? '0 0 24px rgba(239,68,68,0.4)' : '0 12px 26px rgba(0,0,0,0.55)',
                transform: `scaleY(${s})`, transformOrigin: 'bottom',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 14, left: 7, right: 7, height: 4,
                  borderRadius: 2, background: b.red ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.22)',
                }} />
              </div>
            );
          })}
        </div>
        <div style={{
          width: 420, height: 5, borderRadius: 3, marginTop: -30,
          background: 'rgba(255,255,255,0.16)', opacity: inOp,
        }} />

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
          livros médicos inclusos
        </div>

        <div style={{ opacity: pillsOp, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', padding: '0 60px' }}>
          {['+530 cursos', '17 categorias', 'atualizações sem custo'].map(s => (
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

export const C13_Organizacao: React.FC = () => {
  const frame = useCurrentFrame();
  const punch = useZoomPunch([P_SEGUNDOS, P_ARQ1, P_ARQ2, P_STAR, P_DL, P_ATT, P_CAT, P_LIVROS], 1.15);
  const w1 = whipProgress(frame, W1);
  const w2 = whipProgress(frame, W2);
  const w3 = whipProgress(frame, W3);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg />

      {/* stack de cenas — recebe o zoom punch inteiro */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${punch})`, transformOrigin: '50% 46%' }}>

        {/* S1 · frame 0: busca JÁ digitando "ecg" ao vivo (payoff imediato) + pill 530 */}
        <Sequence from={0} durationInFrames={CUT1}>
          <KenBurnsVideo
            src="rec/n_search2.mp4" startFrom={18} width={1080} height={2337} style={TOP}
            keys={[
              { f: 0, x: 0.42, y: 0.13, z: 1.08 },
              { f: 34, x: 0.5, y: 0.26, z: 1.0 },
              { f: 100, x: 0.5, y: 0.36, z: 1.08 },
            ]}
          />
          <CounterPill />
        </Sequence>

        {/* S2 · punch-cut → replay do toque no checkbox "Conteúdos internos" + resultados
            (checkbox no take: fx .294 / fy .436 → topo-ancorado (317,1019)) */}
        <Sequence from={CUT1} durationInFrames={142}>
          <WhipPane progress={w1} side="out">
            <KenBurnsVideo
              src="rec/n_search2.mp4" startFrom={110} width={1080} height={2337} style={TOP}
              keys={[
                { f: 0, x: 0.35, y: 0.42, z: 1.1 },
                { f: 45, x: 0.33, y: 0.45, z: 1.18 },
                { f: 95, x: 0.5, y: 0.52, z: 1.06 },
                { f: 142, x: 0.5, y: 0.6, z: 1.12 },
              ]}
            />
            <TapDot x={317} y={1019} frameAt={8} />
            <Spotlight x={400} y={1020} startFrame={14} duration={58} radius={215} />
          </WhipPane>
        </Sequence>

        {/* S3 · WHIP 1 → n_tools: aula marcada como concluída + ESTRELA dourada em destaque
            (check2 src (606,426) → cover (839,381) ; estrela src (686,686) → cover (944,741)) */}
        <Sequence from={234} durationInFrames={70}>
          <WhipPane progress={w1} side="in">
            <KenBurnsVideo
              src="rec/n_tools.mp4" startFrom={112} width={1080} height={1920}
              keys={[
                { f: 0, x: 0.7, y: 0.35, z: 1.06 },
                { f: 28, x: 0.8, y: 0.4, z: 1.18 },
                { f: 70, x: 0.78, y: 0.44, z: 1.14 },
              ]}
            />
            <TapDot x={839} y={381} frameAt={11} />
            <Spotlight x={944} y={741} startFrame={24} duration={44} radius={120} />
          </WhipPane>
        </Sequence>

        {/* S4a · crossfade → n_download: toque no download, ícone vira loader girando
            (botão src (526,426) → cover (728,381)) */}
        <Sequence from={288} durationInFrames={34}>
          <FadeIn>
            <KenBurnsVideo
              src="rec/n_download.mp4" startFrom={52} width={1080} height={1920}
              keys={[
                { f: 0, x: 0.62, y: 0.24, z: 1.05 },
                { f: 34, x: 0.68, y: 0.25, z: 1.16 },
              ]}
            />
            <TapDot x={728} y={381} frameAt={11} />
          </FadeIn>
        </Sequence>

        {/* S4b · jump cut → player da aula tocando ("assistir onde quiser") + toque em Baixar
            (ícone Baixar no header src (703,64) → topo-ancorado (973,89)) */}
        <Sequence from={322} durationInFrames={43}>
          <WhipPane progress={w2} side="out">
            <KenBurnsVideo
              src="rec/n_download.mp4" startFrom={225} width={1080} height={2337} style={TOP}
              keys={[
                { f: 0, x: 0.5, y: 0.44, z: 1.02 },
                { f: 43, x: 0.5, y: 0.54, z: 1.12 },
              ]}
            />
            <TapDot x={973} y={89} frameAt={33} />
          </WhipPane>
        </Sequence>

        {/* S5 · WHIP 2 → n_bell: Spotlight no sino ANTES de abrir, toque, popover com a
            lista "Cursos em processo de atualização" (2026) e scroll
            (sino src (520,64) → topo-ancorado (720,89)) */}
        <Sequence from={357} durationInFrames={145}>
          <WhipPane progress={w2} side="in">
            <WhipPane progress={w3} side="out">
              <KenBurnsVideo
                src="rec/n_bell.mp4" startFrom={36} width={1080} height={2337} style={TOP}
                keys={[
                  { f: 0, x: 0.66, y: 0.08, z: 1.03 },
                  { f: 40, x: 0.66, y: 0.08, z: 1.07 },
                  { f: 62, x: 0.45, y: 0.22, z: 1.1 },
                  { f: 105, x: 0.42, y: 0.33, z: 1.14 },
                  { f: 145, x: 0.42, y: 0.42, z: 1.17 },
                ]}
              />
              <Spotlight x={720} y={92} startFrame={8} duration={32} radius={100} />
              <TapDot x={720} y={89} frameAt={44} />
              <FloatBadge x={552} y={1140} delay={88} from="right" accent>
                <BadgeText top="Atualizações" bottom="sem custo extra" />
              </FloatBadge>
            </WhipPane>
          </WhipPane>
        </Sequence>

        {/* S6 · WHIP 3 → m_rows: gaveta CATEGORIAS deslizando aberta (17 categorias, contagens) */}
        <Sequence from={492} durationInFrames={118}>
          <WhipPane progress={w3} side="in">
            <KenBurnsVideo
              src="rec/m_rows.mp4" startFrom={324} width={1080} height={1920}
              keys={[
                { f: 0, x: 0.4, y: 0.26, z: 1.05 },
                { f: 55, x: 0.4, y: 0.42, z: 1.1 },
                { f: 118, x: 0.42, y: 0.6, z: 1.16 },
              ]}
            />
            <FloatBadge x={586} y={1150} delay={48} from="right" accent>
              <BadgeText top="17 categorias" bottom="organizadas" />
            </FloatBadge>
          </WhipPane>
        </Sequence>

        {/* S7 · crossfade → estante + contador gigante "+9.000 livros" */}
        <Sequence from={598} durationInFrames={C13_DURATION - 598}>
          <FadeIn>
            <BooksStats />
          </FadeIn>
        </Sequence>
      </div>

      {/* legendas sincronizadas por palavra (zona segura) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1380} size={60} />

      {/* end card cobre o CTA falado */}
      <EndCard startFrame={B_END} />
      <Narration id="c13" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
