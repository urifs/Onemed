import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, ClipAt } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, Letterbox, FlashCut, WipePanel, shakeAt, win, easeOutExpo } from './cine';

export const QUIZ_DELAY = 0.7;
const THINK = 15; // segundos de countdown

export type QuizData = {
  id: string;
  contexto: string;           // rótulo da cena: "PLANTÃO · 03:12"
  pergunta: string;
  alternativas: [string, string, string, string];
  corretaIdx: 0 | 1 | 2 | 3;
  timingA: Timing;            // história + pergunta + alternativas + "valendo"
  timingB: Timing;            // "já escolheu... 3,2,1" + revelação + fecho
  mp3a: string; mp3b: string;
  revealSecB: number;         // instante em B onde começa a revelação (depois do "um")
  perguntaSecA: number;       // instante em A onde a pergunta aparece
  altSecA: [number, number, number, number]; // instante de cada alternativa em A
  takeSrc: string; takeFrom: number;
  n31SecB: number;            // instante em B do fecho de valor (cartela 31.612)
  Cena: React.FC<{ t: number }>; // cena ilustrada do hook
};

export const quizDuration = (d: QuizData) =>
  Math.round((QUIZ_DELAY + d.timingA.duration + 0.4 + (THINK - d.revealSecB) + d.timingB.duration + 2.2) * FPS);

/* ── mini-cenas de abertura (modo claro, 2D) ── */

export const CenaMonitor: React.FC<{ t: number; bpmFlat?: boolean; tApex?: boolean }> = ({ t, tApex }) => (
  <div style={{ width: 720, height: 460, background: '#101318', borderRadius: 26, padding: 30, boxShadow: '0 50px 110px -30px rgba(22,24,29,0.45)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 24, color: '#5dead0' }}>
      <span>FC {tApex ? 44 : 118}</span><span>SpO₂ 96%</span><span style={{ color: '#ffb84d' }}>PA {tApex ? '188/110' : '92/60'}</span>
    </div>
    <svg width={660} height={330} viewBox="0 0 660 330">
      {[0, 1].map(row => (
        <polyline key={row}
          points={[...Array(67)].map((_, i) => {
            const x = i * 10; const ph = ((i * 10 + t * 160) % 220) / 220;
            let y = 100 + row * 130;
            if (tApex) { if (ph > 0.42 && ph < 0.58) y -= Math.sin((ph - 0.42) / 0.16 * Math.PI) * 88; }
            else { if (ph > 0.45 && ph < 0.5) y -= 70; else if (ph > 0.5 && ph < 0.55) y += 34; else if (ph > 0.62 && ph < 0.72) y -= Math.sin((ph - 0.62) / 0.1 * Math.PI) * 18; }
            return `${x},${y}`;
          }).join(' ')}
          fill="none" stroke={row ? '#ffb84d' : '#5dead0'} strokeWidth={4} strokeLinecap="round" />
      ))}
    </svg>
  </div>
);

export const CenaFrasco: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
    <div style={{ transform: `rotate(${86 * easeOutExpo(win(t, 0.5, 1.4))}deg)`, transformOrigin: '85% 90%' }}>
      <div style={{ width: 40, height: 26, background: '#d9d2c2', borderRadius: '8px 8px 0 0', margin: '0 auto' }} />
      <div style={{ width: 120, height: 210, background: '#f2ede0', border: '3px solid #d9d2c2', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 86, height: 110, background: WHITE, border: '2px solid #e4ddca', borderRadius: 8, fontFamily: MONO, fontSize: 15, color: O_MUT, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>500mg<br />×20</div>
      </div>
    </div>
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 120, color: '#e4ddca', transform: `scale(${1 + 0.06 * Math.sin(t * 2)})` }}>?</div>
  </div>
);

export const CenaAmbulancia: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: 'relative', width: 760, height: 400 }}>
    <div style={{ position: 'absolute', left: 40 + Math.sin(t * 5) * 4, top: 90, width: 560, height: 220, background: WHITE, border: '4px solid #d8dde4', borderRadius: 22 }}>
      <div style={{ position: 'absolute', left: 24, top: 22, width: 150, height: 90, background: '#e8505b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: WHITE }}>+</div>
      <div style={{ position: 'absolute', right: 20, top: 20, width: 140, height: 76, background: '#cfe3f5', borderRadius: 10 }} />
      <div style={{ position: 'absolute', left: -8, top: -34, width: 90, height: 40, borderRadius: 10, background: (t * 3 % 1) < 0.5 ? '#e8505b' : '#3f6fb5', boxShadow: `0 0 ${(t * 3 % 1) < 0.5 ? 40 : 24}px ${(t * 3 % 1) < 0.5 ? 'rgba(232,80,91,0.8)' : 'rgba(63,111,181,0.8)'}` }} />
    </div>
    {[170, 470].map(x => <div key={x} style={{ position: 'absolute', left: x, top: 290, width: 92, height: 92, borderRadius: 99, background: '#232830', border: '14px solid #3a4150', transform: `rotate(${t * 220}deg)` }}><div style={{ width: 8, height: 26, background: '#8b95a5', margin: '6px auto 0' }} /></div>)}
    {[...Array(4)].map((_, i) => <div key={i} style={{ position: 'absolute', left: 640 + i * 26, top: 160 + i * 34, width: 46 - i * 8, height: 7, borderRadius: 6, background: '#d8dde4', opacity: 1 - i * 0.2, transform: `translateX(${-((t * 320 + i * 40) % 130)}px)` }} />)}
  </div>
);

export const CenaBebe: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: 'relative', width: 620, height: 420 }}>
    <div style={{ position: 'absolute', left: 60, bottom: 0, width: 500, height: 210, background: '#f6f1e6', border: '4px solid #e4ddca', borderRadius: '26px 26px 60px 60px' }} />
    <div style={{ position: 'absolute', left: 150, bottom: 120, width: 320, height: 150, background: '#ffe9b8', borderRadius: 90, border: '4px solid #f2d68a', transform: `translateY(${Math.sin(t * 1.6) * 5}px)` }} />
    <div style={{ position: 'absolute', left: 400, bottom: 190, width: 120, height: 120, background: '#ffdf9e', borderRadius: 99, border: '4px solid #f2d68a', transform: `translateY(${Math.sin(t * 1.6) * 5}px)` }}>
      <div style={{ position: 'absolute', left: 26, top: 48, width: 12, height: 6, borderRadius: 6, background: '#8a6d3b' }} />
      <div style={{ position: 'absolute', right: 26, top: 48, width: 12, height: 6, borderRadius: 6, background: '#8a6d3b' }} />
      <div style={{ position: 'absolute', left: 48, top: 72, width: 18, height: 10, borderRadius: 9, background: '#d8956b' }} />
    </div>
    <div style={{ position: 'absolute', left: 40, top: 10, fontFamily: MONO, fontWeight: 700, fontSize: 24, color: '#c98a1b', background: '#fff6df', border: '2px solid #f2d68a', borderRadius: 999, padding: '10px 22px', transform: `scale(${1 + 0.04 * Math.sin(t * 3)})` }}>
      12 HORAS DE VIDA · ICTERÍCIA?
    </div>
  </div>
);

export const CenaAusculta: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: 'relative', width: 620, height: 420 }}>
    <svg width={620} height={420} viewBox="0 0 620 420">
      <path d="M 180 60 C 180 160, 240 200, 310 230 C 380 200, 440 160, 440 60" fill="none" stroke="#3a4150" strokeWidth={16} strokeLinecap="round" />
      <circle cx={180} cy={54} r={20} fill="#3a4150" /><circle cx={440} cy={54} r={20} fill="#3a4150" />
      <path d="M 310 230 C 310 300, 330 330, 390 344" fill="none" stroke="#3a4150" strokeWidth={16} strokeLinecap="round" />
      <circle cx={430} cy={352} r={44} fill="#e8505b" stroke="#c93b46" strokeWidth={6} style={{ transformOrigin: '430px 352px', transform: `scale(${1 + 0.08 * Math.sin(t * 6)})` }} />
    </svg>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ position: 'absolute', left: 470 + i * 34, top: 320 - i * 8, width: 20 + i * 14, height: 20 + i * 14, borderRadius: 99, border: '4px solid rgba(232,80,91,0.5)', opacity: (Math.sin(t * 6 - i) + 1) / 2 * 0.7 }} />
    ))}
  </div>
);

export const CenaGestante: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: 'relative', width: 620, height: 430 }}>
    <div style={{ position: 'absolute', left: 200, top: 20, width: 110, height: 110, borderRadius: 99, background: '#f2d0b8' }} />
    <div style={{ position: 'absolute', left: 170, top: 130, width: 200, height: 260, background: '#b56576', borderRadius: '60px 130px 120px 60px' }} />
    <div style={{ position: 'absolute', left: 330, top: 210, width: 96, height: 96, borderRadius: 99, background: '#b56576', transform: `scale(${1 + 0.03 * Math.sin(t * 1.8)})` }} />
    <div style={{ position: 'absolute', left: 420, top: 60, background: '#16181d', borderRadius: 14, padding: '14px 20px', fontFamily: MONO, fontWeight: 700, fontSize: 30, color: '#ff8a8a', transform: `scale(${1 + 0.05 * Math.sin(t * 3.5)})` }}>
      160×110
    </div>
  </div>
);

/* ── engine ── */

const LETRAS = ['A', 'B', 'C', 'D'] as const;

export const QuizVideo: React.FC<{ d: QuizData }> = ({ d }) => {
  const t = useCurrentFrame() / FPS;
  const durA = d.timingA.duration;
  const cdStart = QUIZ_DELAY + durA + 0.4;              // countdown começa
  const bStart = cdStart + THINK - d.revealSecB;         // B alinhado: "um" acaba quando timer zera
  const reveal = cdStart + THINK;                        // instante da revelação
  const end = bStart + d.timingB.duration - 2.6;
  const cd = clamp01((t - cdStart) / THINK);             // progresso 0..1 do countdown
  const emCd = t >= cdStart && t < reveal;
  const restante = Math.max(0, Math.ceil(THINK - (t - cdStart)));
  const urgente = emCd && restante <= 5;

  const perguntaAt = QUIZ_DELAY + d.perguntaSecA;
  const quizVisivel = t >= perguntaAt - 0.2 && t < reveal + (d.n31SecB - d.revealSecB) - 0.6;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', transform: shakeAt(t, reveal, 8) || undefined }}>
      <OLightBg />

      {/* CENA DE ABERTURA */}
      {t < perguntaAt + 0.4 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, perguntaAt - 0.35, perguntaAt) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center' }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: O_RED, letterSpacing: 5, background: 'rgba(224,45,45,0.07)', border: `2px solid rgba(224,45,45,0.35)`, borderRadius: 999, padding: '12px 28px', opacity: win(t, QUIZ_DELAY + 0.2, QUIZ_DELAY + 0.6) }}>
              {d.contexto}
            </span>
          </div>
          <div style={{ position: 'absolute', left: '50%', top: '42%', transform: `translate(-50%,-50%) scale(${0.94 + 0.1 * win(t, 0, perguntaAt)})` }}>
            <d.Cena t={t} />
          </div>
        </div>
      )}

      {/* CARD DA PERGUNTA + ALTERNATIVAS */}
      {quizVisivel && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 320 - 110 * easeOutExpo(win(t, cdStart - 0.4, cdStart + 0.3)), opacity: win(t, perguntaAt - 0.1, perguntaAt + 0.3) }}>
          <div style={{ background: WHITE, border: '2px solid #eae6dc', borderRadius: 26, padding: '34px 36px', boxShadow: '0 40px 90px -26px rgba(22,24,29,0.25)' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: O_MUT, letterSpacing: 3 }}>QUESTÃO · {d.id.replace('C', '')}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: O_INK, letterSpacing: -0.5, lineHeight: 1.25, marginTop: 12 }}>{d.pergunta}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
            {d.alternativas.map((alt, i) => {
              const at = QUIZ_DELAY + d.altSecA[i];
              const certa = i === d.corretaIdx;
              const revelada = t >= reveal;
              const bg = revelada ? (certa ? O_GREEN : WHITE) : WHITE;
              const op = revelada && !certa ? 0.38 : 1;
              const pulso = emCd ? 1 + 0.012 * Math.sin(t * 4 + i * 1.7) : 1;
              return (
                <div key={i} style={{
                  opacity: win(t, at, at + 0.3) * op,
                  transform: `translateX(${(1 - easeOutExpo(win(t, at, at + 0.45))) * 60}px) scale(${revelada && certa ? 1 + 0.05 * easeOutExpo(win(t, reveal, reveal + 0.5)) : pulso})`,
                  background: bg, border: `2.5px solid ${revelada && certa ? O_GREEN : '#e6e1d5'}`, borderRadius: 18,
                  padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20,
                  boxShadow: revelada && certa ? '0 24px 60px -16px rgba(14,159,110,0.45)' : '0 14px 36px -14px rgba(22,24,29,0.14)',
                }}>
                  <span style={{
                    width: 54, height: 54, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: revelada && certa ? WHITE : (urgente ? O_RED : O_INK), color: revelada && certa ? O_GREEN : WHITE,
                    fontFamily: HEAD, fontWeight: 900, fontSize: 30,
                  }}>{revelada && certa ? '✓' : LETRAS[i]}</span>
                  <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: revelada && certa ? WHITE : O_INK }}>{alt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COUNTDOWN RING */}
      {emCd && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 190, height: 190 }}>
            <svg width={190} height={190} viewBox="0 0 190 190" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={95} cy={95} r={82} fill={WHITE} stroke="#eee9dd" strokeWidth={14} />
              <circle cx={95} cy={95} r={82} fill="none" stroke={urgente ? O_RED : '#f2a33c'} strokeWidth={14} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 82} strokeDashoffset={2 * Math.PI * 82 * cd} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: urgente ? O_RED : O_INK, transform: `scale(${1 + (urgente ? 0.1 * Math.abs(Math.sin(t * Math.PI)) : 0)})` }}>
              {restante}
            </div>
          </div>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 23, color: O_MUT, letterSpacing: 3 }}>
            {restante > 8 ? 'PAUSA E PENSA' : restante > 4 ? 'JÁ ESCOLHEU?' : 'ÚLTIMOS SEGUNDOS'}
          </span>
        </div>
      )}

      {/* EXPLICAÇÃO + PLATAFORMA (pós-reveal) */}
      {t >= reveal + (d.n31SecB - d.revealSecB) - 0.6 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, reveal + (d.n31SecB - d.revealSecB) - 0.5, reveal + (d.n31SecB - d.revealSecB)), 1 - win(t, end + 0.5, end + 1)) }}>
          <div style={{ position: 'absolute', left: '50%', top: 430, transform: 'translate(-50%,0)', width: 520, height: 860, borderRadius: 30, overflow: 'hidden', border: `2.5px solid ${O_RED}`, boxShadow: '0 50px 120px -30px rgba(224,45,45,0.35)' }}>
            <ClipAt fromSec={reveal + (d.n31SecB - d.revealSecB) - 0.5}>
              <OffthreadVideo src={staticFile(d.takeSrc)} muted startFrom={d.takeFrom} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </ClipAt>
          </div>
          <div style={{ position: 'absolute', left: 70, right: 70, top: 240, textAlign: 'center' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: O_INK }}>
              <span style={{ color: O_RED }}>31.612 aulas</span> só de questões comentadas
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 320, textAlign: 'center' }}>
            <span style={{ background: WHITE, border: '2px solid #e6e1d5', borderRadius: 999, padding: '14px 30px', fontFamily: HEAD, fontWeight: 800, fontSize: 29, color: O_INK, boxShadow: '0 16px 40px -14px rgba(22,24,29,0.18)' }}>
              resposta comentada, uma a uma
            </span>
          </div>
        </div>
      )}

      <FlashCut t={t} atSec={reveal} color="rgba(14,159,110,0.35)" />
      <WipePanel t={t} atSec={perguntaAt} color={O_RED} dur={0.4} angle={-10} />
      <Letterbox t={t} inAt={0.1} outAt={QUIZ_DELAY + d.perguntaSecA - 0.5} size={110} color="rgba(22,24,29,0.92)" />
      <Vignette strength={0.22} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={d.timingA} delaySec={QUIZ_DELAY} y={1660} size={50} highlight={O_RED} />
      <CaptionTrack timing={d.timingB} delaySec={bStart} y={1660} size={50} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(end * FPS)} />
      <Sequence from={Math.round(QUIZ_DELAY * FPS)}><Audio src={staticFile(d.mp3a)} /></Sequence>
      <Sequence from={Math.round(bStart * FPS)}><Audio src={staticFile(d.mp3b)} /></Sequence>
    </AbsoluteFill>
  );
};
