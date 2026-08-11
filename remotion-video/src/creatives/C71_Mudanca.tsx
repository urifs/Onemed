import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, WipePanel, win, easeOutExpo } from './cine';
import timing from './timings/c71.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C71_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);
const PAPELAO = '#d9b17c';
const PAPELAO_ESC = '#c39a63';

const B = {
  mudanca: DELAY + 0.5,
  cx1: DELAY + 4.0, n14: DELAY + 8.5,
  cx2: DELAY + 12.6, cx3: DELAY + 14.5, n12: DELAY + 18.4, banca: DELAY + 21.9,
  cx42: DELAY + 24.5, n86: DELAY + 28.2,
  livros: DELAY + 30.8, n9k: DELAY + 32.2,
  casa: DELAY + 34.2, n530: DELAY + 35.9, cabe: DELAY + 38.9, corredor: DELAY + 40.2,
  ia: DELAY + 42.4, ia1: DELAY + 47.2, ia2: DELAY + 48.6, ia3: DELAY + 50.9,
  chave: DELAY + 53.8, login: DELAY + 54.6,
  end: DELAY + T.duration - 3.2,
};

const Caixa: React.FC<{ t: number; at: number; rotulo: string; sub?: string; subAt?: number; w?: number; peso?: boolean }> =
({ t, at, rotulo, sub, subAt, w = 560, peso }) => {
  const p = easeOutExpo(win(t, at, at + 0.6));
  if (p <= 0) return null;
  return (
    <div style={{
      width: w, margin: '0 auto', opacity: win(t, at, at + 0.3),
      transform: `translateX(${(1 - p) * 700}px) rotate(${(1 - p) * 4}deg)`,
    }}>
      <div style={{ background: PAPELAO, border: `3px solid ${PAPELAO_ESC}`, borderRadius: 10, padding: '26px 30px', boxShadow: '0 30px 70px -20px rgba(120,85,40,0.45)', position: 'relative' }}>
        {/* fita adesiva */}
        <div style={{ position: 'absolute', left: '38%', right: '38%', top: -8, height: 22, background: 'rgba(180,150,100,0.7)', transform: 'rotate(-1.5deg)' }} />
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: 'rgba(80,55,25,0.7)', letterSpacing: 3 }}>FRÁGIL · CONTEÚDO VALIOSO {peso && '· PESADA ⚠'}</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: rotulo.length > 14 ? 40 : 52, color: '#4a3418', marginTop: 8 }}>{rotulo}</div>
        {sub && (
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: O_RED, marginTop: 10, opacity: subAt ? win(t, subAt, subAt + 0.3) : 1 }}>{sub}</div>
        )}
      </div>
    </div>
  );
};

export const C71_Mudanca: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.cx1 ? 1 - win(t, B.cx1 - 0.3, B.cx1) : 0 }}>
        <div style={{ position: 'absolute', left: 70, right: 70, top: 640, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: O_MUT, letterSpacing: 6 }}>DIA DE MUDANÇA</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: O_INK, letterSpacing: -2, marginTop: 20, lineHeight: 1.2 }}>
            o caminhão<br /><span style={{ color: O_RED }}>não acaba nunca.</span>
          </div>
        </div>
      </div>

      {/* caixas empilhando */}
      {t >= B.cx1 && t < B.cx42 && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 380, opacity: 1 - win(t, B.cx42 - 0.25, B.cx42), display: 'flex', flexDirection: 'column-reverse', gap: 18 }}>
          <Caixa t={t} at={B.cx1} rotulo="ESTRATÉGIA MED" sub="14.142 aulas só no Extensivo" subAt={B.n14} peso />
          <Caixa t={t} at={B.cx2} rotulo="MEDCURSO" w={520} />
          <Caixa t={t} at={B.cx3} rotulo="MEDGRUPO" sub="12.234 aulas — sua banca, seu estado" subAt={B.n12} w={600} />
        </div>
      )}

      {/* 42 caixas de questões */}
      {t >= B.cx42 && t < B.casa && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 430, opacity: 1 - win(t, B.casa - 0.25, B.casa) }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: O_RED, letterSpacing: 4 }}>DESCENDO AGORA</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {[...Array(18)].map((_, i) => (
              <div key={i} style={{
                height: 100, background: PAPELAO, border: `2.5px solid ${PAPELAO_ESC}`, borderRadius: 8,
                opacity: win(t, B.cx42 + i * 0.06, B.cx42 + 0.2 + i * 0.06),
                transform: `translateY(${(1 - easeOutExpo(win(t, B.cx42 + i * 0.06, B.cx42 + 0.4 + i * 0.06))) * -50}px)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 19, color: 'rgba(80,55,25,0.75)',
              }}>Q{String(i + 1).padStart(2, '0')}</div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_INK }}>
              42 caixas <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: O_MUT }}>só de questões e simulados</span>
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: O_RED, marginTop: 12, opacity: win(t, B.n86, B.n86 + 0.35) }}>+86 mil itens</div>
            <div style={{ marginTop: 24, opacity: win(t, B.livros, B.livros + 0.3) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 36, color: O_INK }}>e os livros? <span style={{ color: O_RED, opacity: win(t, B.n9k, B.n9k + 0.3) }}>+9.000</span></span>
            </div>
          </div>
        </div>
      )}

      {/* a casa nova */}
      {t >= B.casa && t < B.ia && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.ia - 0.25, B.ia) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 440, textAlign: 'center' }}>
            {/* telhado + casa = a plataforma */}
            <svg width={640} height={520} viewBox="0 0 640 520" style={{ display: 'block', margin: '0 auto' }}>
              <polygon points="320,10 620,190 20,190" fill={O_RED} opacity={0.92} />
              <rect x={70} y={190} width={500} height={310} rx={14} fill="#ffffff" stroke="#e4ddca" strokeWidth={3} />
              <rect x={270} y={330} width={100} height={170} rx={8} fill={O_RED} opacity={0.85} />
              <text x={320} y={140} textAnchor="middle" fontFamily={HEAD} fontWeight={900} fontSize={40} fill={WHITE}>OneMed</text>
              <text x={320} y={275} textAnchor="middle" fontFamily={HEAD} fontWeight={900} fontSize={48} fill={O_INK} opacity={win(t, B.n530, B.n530 + 0.35)}>+530 cursos</text>
            </svg>
            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center', gap: 18, opacity: win(t, B.cabe, B.cabe + 0.3) }}>
              <span style={{ background: WHITE, border: '2px solid #e4ddca', borderRadius: 999, padding: '14px 30px', fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: O_INK }}>tudo cabe</span>
              <span style={{ background: WHITE, border: `2px solid ${O_GREEN}`, borderRadius: 999, padding: '14px 30px', fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: O_GREEN, opacity: win(t, B.corredor, B.corredor + 0.3) }}>nada fica no corredor</span>
            </div>
          </div>
        </div>
      )}

      {/* IA desencaixota */}
      {t >= B.ia && t < B.chave - 0.2 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.ia, B.ia + 0.3), 1 - win(t, B.chave - 0.5, B.chave - 0.2)) }}>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 540, textAlign: 'center' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: O_INK, letterSpacing: -1.5, lineHeight: 1.25 }}>
              e quem desencaixota tudo<br />na ordem certa? <span style={{ color: O_RED }}>a IA.</span>
            </div>
            {/* caixa aberta soltando chips */}
            <div style={{ width: 420, height: 150, margin: '56px auto 0', background: PAPELAO, border: `3px solid ${PAPELAO_ESC}`, borderRadius: '0 0 12px 12px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: -26, top: -46, width: 200, height: 60, background: PAPELAO_ESC, transform: 'rotate(-24deg)', borderRadius: 6 }} />
              <div style={{ position: 'absolute', right: -26, top: -46, width: 200, height: 60, background: PAPELAO_ESC, transform: 'rotate(24deg)', borderRadius: 6 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
              {[['resumo em 1 clique', B.ia1], ['flashcards do seu material', B.ia2], ['cronograma pronto', B.ia3]].map(([txt, at], i) => (
                <span key={i} style={{
                  opacity: win(t, at as number, (at as number) + 0.3),
                  transform: `translateY(${(1 - easeOutExpo(win(t, at as number, (at as number) + 0.5))) * -70}px)`,
                  background: WHITE, border: `2.5px solid ${i === 2 ? O_RED : '#e4ddca'}`, borderRadius: 999, padding: '18px 30px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: O_INK, alignSelf: 'center',
                }}>{txt as string}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* chave/login */}
      {t >= B.chave - 0.2 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.chave - 0.2, B.chave + 0.2), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 760, textAlign: 'center' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: O_INK, letterSpacing: -1.5 }}>
              você só trouxe a chave:
            </div>
            <div style={{ marginTop: 34, opacity: win(t, B.login, B.login + 0.35), transform: `scale(${0.9 + 0.1 * easeOutExpo(win(t, B.login, B.login + 0.5))})` }}>
              <span style={{ display: 'inline-block', background: O_RED, borderRadius: 20, padding: '26px 60px', fontFamily: MONO, fontWeight: 700, fontSize: 52, color: WHITE, letterSpacing: 2, boxShadow: '0 30px 70px -18px rgba(224,45,45,0.5)' }}>
              🔑 o login
              </span>
            </div>
          </div>
        </div>
      )}

      <WipePanel t={t} atSec={B.cx42} color={O_RED} dur={0.45} angle={-10} />
      <WipePanel t={t} atSec={B.casa} color={O_INK} dur={0.45} angle={10} />
      <WipePanel t={t} atSec={B.ia} color={O_RED} dur={0.45} angle={-10} />
      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c71.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
