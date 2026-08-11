import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01, easeInOut } from './theme';
import { FPS, ClipAt } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win } from './cine';
import timing from './timings/c45.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C45_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

/* estágios do zoom-out contínuo: cada um entra gigante e assenta */
const ST = {
  s1: DELAY + 0.1,    // caixinha
  s2: DELAY + 5.5,    // semana
  s3: DELAY + 10.4,   // mapa mental
  s4: DELAY + 16.3,   // cronograma real
  s5: DELAY + 24.1,   // plataforma
  s6: DELAY + 30.2,   // rotina
  end: DELAY + T.duration - 3.2,
};
const tick = DELAY + 4.8;

/* transform de um estágio: escala de entrada 3.6 → 1 na sua janela; sai encolhendo pra 0.24 */
const stage = (t: number, from: number, to: number) => {
  const zIn = 1 + 2.6 * (1 - easeInOut(win(t, from, from + 1.1)));
  const zOut = 1 - 0.78 * easeInOut(win(t, to, to + 1.1));
  const op = Math.min(win(t, from, from + 0.5), 1 - win(t, to + 0.55, to + 1.05));
  return { scale: zIn * zOut, op: clamp01(op) };
};

const Semana: React.FC<{ hi: boolean }> = ({ hi }) => (
  <div style={{ width: 760 }}>
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: O_INK, marginBottom: 24 }}>Semana 7 — Cardiologia</div>
    {['SEG · IC aguda — aula + resumo', 'TER · IC — flashcards do material', 'QUA · Valvopatias — aula', 'QUI · Questões comentadas do bloco', 'SEX · Revisar insuficiência cardíaca', 'SÁB · Simulado curto + erros'].map((d, i) => (
      <div key={i} style={{
        background: WHITE, border: `2px solid ${i === 4 && hi ? O_RED : 'rgba(22,24,29,0.1)'}`,
        borderRadius: 16, padding: '18px 24px', marginBottom: 12,
        fontFamily: BODY, fontWeight: 600, fontSize: 26, color: i === 4 && hi ? O_RED : O_INK,
        boxShadow: '0 10px 26px -12px rgba(22,24,29,0.18)',
      }}>{d}</div>
    ))}
  </div>
);

const Mapa: React.FC<{ t: number }> = ({ t }) => {
  const pulse = t > DELAY + 14.3 && t < DELAY + 16.0 ? 1 + Math.sin((t - DELAY - 14.3) * 9) * 0.05 : 1;
  return (
    <svg width={900} height={760} viewBox="0 0 900 760">
      <line x1={450} y1={120} x2={200} y2={330} stroke="rgba(22,24,29,0.25)" strokeWidth={4} />
      <line x1={450} y1={120} x2={450} y2={330} stroke="rgba(22,24,29,0.25)" strokeWidth={4} />
      <line x1={450} y1={120} x2={700} y2={330} stroke="rgba(22,24,29,0.25)" strokeWidth={4} />
      <line x1={450} y1={330} x2={450} y2={540} stroke={O_RED} strokeWidth={5} />
      <g>
        <rect x={310} y={60} width={280} height={92} rx={22} fill={O_RED} />
        <text x={450} y={116} textAnchor="middle" fontFamily={HEAD} fontWeight={900} fontSize={30} fill={WHITE}>Residência 2027</text>
      </g>
      {[['Cardiologia', 200, true], ['Nefrologia', 450, false], ['Revisão ativa', 700, false]].map(([lb, x, on], i) => (
        <g key={i} transform={`translate(${x},330) scale(${on ? pulse : 1})`}>
          <rect x={-120} y={-40} width={240} height={80} rx={18} fill={WHITE} stroke={on ? O_RED : 'rgba(22,24,29,0.18)'} strokeWidth={3} />
          <text x={0} y={10} textAnchor="middle" fontFamily={HEAD} fontWeight={800} fontSize={26} fill={on ? O_RED : O_INK}>{lb}</text>
        </g>
      ))}
      <g>
        <rect x={330} y={500} width={240} height={80} rx={18} fill={WHITE} stroke={O_RED} strokeWidth={3} />
        <text x={450} y={550} textAnchor="middle" fontFamily={HEAD} fontWeight={800} fontSize={26} fill={O_RED}>Semana 7</text>
      </g>
    </svg>
  );
};

export const C45_ZoomInf: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s1 = stage(t, ST.s1, ST.s2);
  const s2 = stage(t, ST.s2, ST.s3);
  const s3 = stage(t, ST.s3, ST.s4);
  const s4 = stage(t, ST.s4, ST.s5);
  const s5 = stage(t, ST.s5, ST.s6);
  const s6 = stage(t, ST.s6, ST.end + 0.4);
  const tickP = win(t, DELAY + 2.9, tick);

  const Wrap: React.FC<{ s: { scale: number; op: number }; children: React.ReactNode }> = ({ s, children }) => (
    s.op <= 0 ? null : (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: s.op, transform: `scale(${s.scale}) rotate(${(s.scale - 1) * 1.6}deg)`, transformOrigin: '50% 44%',
      }}>{children}</div>
    )
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* 1 — caixinha */}
      <Wrap s={s1}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div style={{ width: 130, height: 130, borderRadius: 30, border: `8px solid ${tickP > 0 ? O_GREEN : 'rgba(22,24,29,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: WHITE }}>
            <svg width={84} height={84} viewBox="0 0 24 24" fill="none">
              <path d="M4 12.5l5.5 5.5L20 7" stroke={O_GREEN} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={30} strokeDashoffset={30 * (1 - tickP)} />
            </svg>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: O_INK, maxWidth: 560, lineHeight: 1.2 }}>
            revisar<br />insuficiência cardíaca
          </div>
        </div>
      </Wrap>

      {/* 2 — semana */}
      <Wrap s={s2}><Semana hi /></Wrap>

      {/* 3 — mapa mental */}
      <Wrap s={s3}><Mapa t={t} /></Wrap>

      {/* 4 — cronograma real */}
      <Wrap s={s4}>
        <div style={{ width: 620, height: 1180, borderRadius: 36, overflow: 'hidden', boxShadow: '0 50px 110px -28px rgba(22,24,29,0.4)', border: '2px solid rgba(22,24,29,0.1)' }}>
          <ClipAt fromSec={ST.s4 - 0.4}>
            <OffthreadVideo src={staticFile('rec/ol_plano.mp4')} muted startFrom={300} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </ClipAt>
        </div>
      </Wrap>

      {/* 5 — plataforma */}
      <Wrap s={s5}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 620, height: 1180, borderRadius: 36, overflow: 'hidden', boxShadow: '0 50px 110px -28px rgba(22,24,29,0.4)', border: '2px solid rgba(22,24,29,0.1)' }}>
            <ClipAt fromSec={ST.s5 - 0.4}>
              <OffthreadVideo src={staticFile('rec/ol_dash.mp4')} muted startFrom={60} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </ClipAt>
          </div>
          {['Cardiologia', 'Cirurgia', 'Pediatria', 'GO', 'Preventiva'].map((c, i) => (
            <div key={i} style={{
              position: 'absolute', left: i % 2 === 0 ? -190 : 640, top: 120 + i * 210,
              background: WHITE, borderRadius: 14, padding: '14px 22px', transform: `rotate(${(i % 2 ? 1 : -1) * 5}deg)`,
              boxShadow: '0 16px 40px -14px rgba(22,24,29,0.28)',
              fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: O_INK,
              opacity: win(t, ST.s5 + 0.5 + i * 0.12, ST.s5 + 0.8 + i * 0.12),
            }}>{c}</div>
          ))}
        </div>
      </Wrap>

      {/* 6 — rotina (entardecer 2D) */}
      <Wrap s={s6}>
        <div style={{ position: 'relative', width: 1080, height: 1920 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#ffd9a0 0%,#ffb787 34%,#e77a6b 70%,#8d4a63 100%)' }} />
          <div style={{ position: 'absolute', left: '50%', top: 560, transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: 999, background: 'radial-gradient(circle,#fff3d6,#ffcf7e 66%,transparent 70%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, background: '#3c2a3e' }} />
          <div style={{ position: 'absolute', left: '50%', bottom: 400, transform: 'translateX(-50%)', width: 300, height: 560, borderRadius: 40, background: '#16181d', padding: 12, boxShadow: '0 50px 110px -20px rgba(0,0,0,0.6)' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 30, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, border: `5px solid ${O_GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={38} height={38} viewBox="0 0 24 24" fill="none">
                  <path d="M4 12.5l5.5 5.5L20 7" stroke={O_GREEN} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={30} strokeDashoffset={30 * (1 - win(t, ST.s6 + 1.2, ST.s6 + 1.8))} />
                </svg>
              </div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: O_INK, textAlign: 'center' }}>rotina<br />organizada</div>
            </div>
          </div>
        </div>
      </Wrap>

      <Vignette strength={0.25} />
      <Grain opacity={0.045} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(ST.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c45.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
