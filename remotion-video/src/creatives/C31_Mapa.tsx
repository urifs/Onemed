import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLogo, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c31.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C31_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  ponto: DELAY + 3.7,
  resid: DELAY + 4.5,
  abre: DELAY + 6.7,
  cardio: DELAY + 7.6,
  nefro: DELAY + 8.5,
  revisao: DELAY + 9.4,
  ramoSemana: DELAY + 10.6,
  semana: DELAY + 12.6,
  tarefa: DELAY + 14.9,
  naoDesenho: DELAY + 16.7,
  cronograma: DELAY + 18.1,
  respostas: DELAY + 22.8,
  objetivo: DELAY + 24.5,
  horas: DELAY + 25.6,
  data: DELAY + 27.2,
  navegavel: DELAY + 29.6,
  marcos: DELAY + 30.9,
  conteudo: DELAY + 32.4,
  n530: DELAY + 35.3,
  teste: DELAY + 37.4,
  fim: DELAY + 40.7,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  arvore: [0, B.naoDesenho - 0.2] as Range,
  reveal: [B.naoDesenho - 0.2, B.respostas - 0.3] as Range,
  perguntas: [B.respostas - 0.3, B.navegavel - 0.4] as Range,
  navega: [B.navegavel - 0.4, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.fim - 0.4] as Range,
  fim: [B.fim - 0.4, B.end + 1.0] as Range,
};

/* ══ a árvore 2D que cresce (o gancho inteiro) ═══════════════════════════ */
interface TNode { label: string; x: number; y: number; at: number; lvl: number; px?: number; py?: number }
const NODES: TNode[] = [
  { label: 'Residência 2027', x: 540, y: 560, at: B.ponto, lvl: 0 },
  { label: 'Cardiologia', x: 250, y: 800, at: B.cardio, lvl: 1, px: 540, py: 560 },
  { label: 'Nefrologia', x: 540, y: 860, at: B.nefro, lvl: 1, px: 540, py: 560 },
  { label: 'Revisão ativa', x: 830, y: 800, at: B.revisao, lvl: 1, px: 540, py: 560 },
  { label: 'Semana 1', x: 160, y: 1000, at: B.ramoSemana + 1.0, lvl: 2, px: 250, py: 800 },
  { label: 'Semana 2', x: 360, y: 1030, at: B.ramoSemana + 1.6, lvl: 2, px: 250, py: 800 },
  { label: 'Semana 3', x: 560, y: 1060, at: B.ramoSemana + 2.2, lvl: 2, px: 540, py: 860 },
];

const Tree: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.arvore, true);
  // pulso do nó central antes de abrir
  const pulse = t < B.abre ? 1 + Math.sin((t - B.ponto) * 6) * 0.05 : 1;
  const titOp = interpolate(frame, [2, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // checklist dentro do nó Semana 2
  const chkAt = B.tarefa;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: titOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_INK, letterSpacing: -1 }}>
          um ano... <span style={{ color: O_RED }}>numa tela.</span>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        {NODES.filter(n => n.px != null).map((n, i) => {
          const p = clamp01((t - n.at + 0.15) / 0.45);
          if (p <= 0) return null;
          const x = n.px! + (n.x - n.px!) * easeInOut(p);
          const y = n.py! + (n.y - n.py!) * easeInOut(p);
          return <line key={i} x1={n.px} y1={n.py} x2={x} y2={y} stroke={O_RED} strokeWidth={4} strokeLinecap="round" opacity={0.55} />;
        })}
      </svg>
      {NODES.map((n, i) => {
        const s = spring({ frame: frame - Math.round(n.at * FPS), fps, config: { damping: 12, stiffness: 150 }, from: 0, to: 1 });
        if (s <= 0.01) return null;
        const isRoot = n.lvl === 0;
        return (
          <div key={i} style={{
            position: 'absolute', left: n.x, top: n.y,
            transform: `translate(-50%,-50%) scale(${s * (isRoot ? pulse : 1)})`,
            background: isRoot ? O_RED : n.lvl === 1 ? 'rgba(224,45,45,0.10)' : WHITE,
            border: `2px solid ${isRoot ? O_RED : n.lvl === 1 ? 'rgba(224,45,45,0.45)' : 'rgba(22,24,29,0.12)'}`,
            borderRadius: 999, padding: isRoot ? '18px 36px' : n.lvl === 1 ? '13px 26px' : '10px 20px',
            boxShadow: isRoot ? '0 18px 44px -10px rgba(224,45,45,0.45)' : '0 10px 30px -10px rgba(22,24,29,0.18)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: isRoot ? 900 : 700, fontSize: isRoot ? 34 : n.lvl === 1 ? 26 : 21, color: isRoot ? WHITE : O_INK }}>
              {n.label}
            </span>
          </div>
        );
      })}
      {/* checklist brotando da Semana 2 */}
      {t > chkAt && (
        <div style={{ position: 'absolute', left: 220, top: 1120 }}>
          {['Aulas de IC + resumo', 'Flashcards do capítulo', 'Questões — SCA'].map((s2, i) => {
            const o = interpolate(t, [chkAt + i * 0.3, chkAt + 0.3 + i * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const done = i < 2 && t > chkAt + 1.0 + i * 0.4;
            return (
              <div key={i} style={{
                opacity: o, transform: `translateY(${(1 - o) * 16}px)`,
                display: 'flex', alignItems: 'center', gap: 12,
                background: WHITE, border: '1.5px solid rgba(22,24,29,0.1)', borderRadius: 12,
                padding: '11px 20px', marginBottom: 10, boxShadow: '0 10px 26px -10px rgba(22,24,29,0.15)',
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: done ? O_RED : 'transparent', border: `2px solid ${done ? O_RED : 'rgba(22,24,29,0.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 15, fontWeight: 900,
                }}>{done ? '✓' : ''}</span>
                <span style={{ fontFamily: BODY, fontSize: 21, color: O_INK, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.55 : 1 }}>{s2}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══ as 3 perguntas ══════════════════════════════════════════════════════ */
const Perguntas: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.perguntas);
  if (op <= 0) return null;
  const QS = [
    ['🎯', 'Qual seu objetivo?', B.objetivo],
    ['⏱', 'Quantas horas por semana?', B.horas],
    ['📅', 'Quando é a prova?', B.data],
  ] as const;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: O_INK }}>
          a IA monta com <span style={{ color: O_RED }}>3 respostas:</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 110, right: 110, top: 640 }}>
        {QS.map(([ic, q, at], i) => {
          const o = interpolate(t, [at, at + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              opacity: o, transform: `translateX(${(1 - o) * 40}px)`,
              display: 'flex', alignItems: 'center', gap: 18,
              background: WHITE, border: '1.5px solid rgba(22,24,29,0.1)', borderRadius: 18,
              padding: '24px 30px', marginBottom: 18, boxShadow: '0 16px 44px -14px rgba(22,24,29,0.2)',
            }}>
              <span style={{ fontSize: 36 }}>{ic}</span>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 31, color: O_INK }}>{q}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const C31_Mapa: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />
      <Tree t={t} />

      {/* match-cut: a árvore vira a tela real */}
      <OLPhone t={t} range={SC.reveal} src="rec/ol_plano.mp4" startFrom={270}>
        <OLBadge x={56} y={330} delay={Math.round((B.cronograma) * FPS)} from="left" accent
          top="isso é a plataforma" bottom="cronograma com mapa mental, real" />
      </OLPhone>

      <Perguntas t={t} />

      {/* navegando: marcos + checklist na tela real */}
      <OLPhone t={t} range={SC.navega} src="rec/ol_plano.mp4" startFrom={500}>
        <OLBadge x={56} y={330} delay={Math.round((B.navegavel) * FPS)} from="left" accent
          top="mapa navegável" bottom="com marcos pelo caminho" />
        <OLBadge x={580} y={1150} delay={Math.round(B.conteudo * FPS)} from="right"
          top="cada tarefa → conteúdo certo" bottom="dentro de +530 cursos" />
      </OLPhone>

      <OLHero t={t} range={SC.numeros} line1="+530 cursos" line2="um plano só seu." size={72} redAfterSec={1.2} />

      {/* fim: o ponto volta e vira logo */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.fim) }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center',
          opacity: interpolate(t, [SC.fim[0], SC.fim[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999, background: O_RED, margin: '0 auto 26px',
            boxShadow: '0 0 40px rgba(224,45,45,0.5)',
            transform: `scale(${1 + Math.sin((t - SC.fim[0]) * 5) * 0.12})`,
          }} />
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: O_INK, letterSpacing: -1.5 }}>
            seu mapa começa<br /><span style={{ color: O_RED }}>num ponto.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c31.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
