import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard, FloatBadge, BadgeText } from './common';
import { Grain, Vignette, CamDrift, win, easeInExpo, easeOutExpo } from './cine';
import timing from './timings/c61.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C61_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  barulho: DELAY + 0.1,
  desliga: DELAY + 10.1,
  rede: DELAY + 12.1,
  grupo: DELAY + 14.1,
  abas: DELAY + 15.7,
  sobra: DELAY + 17.2,
  ambiente: DELAY + 20.8,
  resumo: DELAY + 25.5,
  assist: DELAY + 27.8,
  silencio: DELAY + 33.8,
  espaco: DELAY + 36.5,
  esperar: DELAY + 39.5,
  end: DELAY + T.duration - 3.2,
};

type Ruido = { id: string; x: number; y: number; w: number; h: number; rot: number; off: number; cor: string; label: string; icone: string };
const RUIDOS: Ruido[] = [
  { id: 'notif', x: 70, y: 380, w: 420, h: 150, rot: -5, off: B.rede, cor: '#e0862d', label: '4 novas notificações', icone: '!' },
  { id: 'grupo', x: 560, y: 470, w: 450, h: 150, rot: 4, off: B.grupo, cor: '#43b586', label: 'Grupo da turma (97)', icone: 'G' },
  { id: 'aba1', x: 120, y: 640, w: 380, h: 130, rot: 3, off: B.abas, cor: '#4b9de0', label: 'aba: “ver depois”', icone: '▸' },
  { id: 'aba2', x: 540, y: 700, w: 420, h: 130, rot: -3, off: B.abas + 0.35, cor: '#8a6fd6', label: 'vídeo em 2º plano', icone: '▶' },
  { id: 'aba3', x: 200, y: 860, w: 430, h: 130, rot: -2, off: B.abas + 0.7, cor: '#d6b13f', label: '+9 abas abertas', icone: '≡' },
];

export const C61_Foco: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const focoP = easeOutExpo(win(t, B.sobra, B.sobra + 1.2));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#0a0b10' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 70% at 50% 36%, #12141d 0%, #0a0b10 70%)' }} />

      {/* título do caos */}
      <div style={{ position: 'absolute', left: 70, right: 70, top: 190, textAlign: 'center', zIndex: 4, opacity: Math.min(win(t, B.barulho, B.barulho + 0.4), 1 - win(t, B.sobra, B.sobra + 0.6)) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: WHITE, letterSpacing: -1.5, lineHeight: 1.2 }}>
          escuta o <span style={{ color: RED }}>barulho</span><br />que o seu estudo faz.
        </div>
      </div>

      {/* cards de ruído — tremem, depois caem um a um */}
      {RUIDOS.map((r, i) => {
        const some = easeInExpo(win(t, r.off, r.off + 0.7));
        const op = Math.min(win(t, B.barulho + 0.6 + i * 0.35, B.barulho + 0.9 + i * 0.35), 1 - some);
        if (op <= 0) return null;
        const tremor = t < B.desliga ? Math.sin(t * 12 + i * 3) * 3 : 0;
        return (
          <div key={r.id} style={{
            position: 'absolute', left: r.x, top: r.y + some * 900, width: r.w, height: r.h, zIndex: 5,
            transform: `rotate(${r.rot + some * (i % 2 ? 30 : -26)}deg) translateX(${tremor}px)`,
            background: '#141721', border: `2px solid ${r.cor}55`, borderRadius: 22, opacity: op,
            boxShadow: '0 24px 60px -18px rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', gap: 18, padding: '0 26px',
          }}>
            <div style={{ width: 62, height: 62, borderRadius: 16, background: r.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: WHITE }}>{r.icone}</div>
            <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 27, color: 'rgba(255,255,255,0.85)' }}>{r.label}</span>
          </div>
        );
      })}

      {/* a tela limpa que sobra */}
      <div style={{ position: 'absolute', inset: 0, opacity: focoP * (1 - win(t, B.silencio + 1.8, B.silencio + 2.4)) }}>
        <CamDrift t={t} amp={4} zoom={0.02}>
          <div style={{
            position: 'absolute', left: '50%', top: 880, transform: 'translate(-50%,-50%)',
            width: 640, height: 1200, borderRadius: 34, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.13)',
            boxShadow: `0 0 ${90 * focoP}px 6px rgba(239,68,68,0.14), 0 60px 130px -30px rgba(0,0,0,0.9)`,
          }}>
            <ClipAt fromSec={B.sobra - 0.2}>
              <OffthreadVideo src={staticFile('rec/d_course_player.mp4')} muted startFrom={180} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top' }} />
            </ClipAt>
          </div>
        </CamDrift>
        <FloatBadge x={56} y={300} delay={Math.round((B.ambiente + 0.4) * FPS)} from="left" accent>
          <BadgeText top="foco não é força de vontade" bottom="é ambiente" />
        </FloatBadge>
        <FloatBadge x={470} y={1420} delay={Math.round((B.assist + 0.3) * FPS)} from="right">
          <BadgeText top="assistente lê a página junto" bottom="a dúvida não vira desvio" />
        </FloatBadge>
      </div>

      {/* o silêncio */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 14, opacity: Math.min(win(t, B.silencio + 2.0, B.silencio + 2.5), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,11,16,0.92)' }} />
        <div style={{ position: 'absolute', left: 80, right: 80, top: 800, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE, letterSpacing: -2, lineHeight: 1.3 }}>
            o silêncio não é vazio.<br /><span style={{ color: RED }}>é espaço pro conteúdo entrar.</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 30, color: 'rgba(255,255,255,0.7)', marginTop: 40, opacity: win(t, B.esperar, B.esperar + 0.4) }}>
            o resto pode esperar 25 minutos.
          </div>
        </div>
      </div>

      <Vignette strength={0.55} />
      <Grain opacity={0.07} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={52} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c61.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
