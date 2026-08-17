import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, FlashCut, shakeAt, win, easeOutExpo, easeInExpo } from './cine';
import timing from './timings/c83.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C83_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  hook: DELAY + 0.1, sete: DELAY + 3.1,
  estrategia: DELAY + 5.6, n14: DELAY + 7.6, carimbos: DELAY + 10.1,
  medcurso: DELAY + 12.8, medcel: DELAY + 16.4, popup: DELAY + 17.5,
  medcof: DELAY + 21.3, rajada: DELAY + 23.9,
  caos: DELAY + 29.1, congela: DELAY + 35.3,
  virada: DELAY + 37.4, carteirinha: DELAY + 38.6, n530: DELAY + 41.2,
  avulsa: DELAY + 45.7,
  f1: DELAY + 46.7, f2: DELAY + 49.1, f3: DELAY + 50.4, f4: DELAY + 52.4,
  end: DELAY + T.duration - 3.2,
};

/* fichas de matrícula que caem — cada uma com rotação/posição próprias */
type Ficha = { at: number; nome: string; sub?: string; x: number; y: number; rot: number; w: number };
const FICHAS: Ficha[] = [
  { at: B.estrategia, nome: 'ESTRATÉGIA MED', sub: '14.142 aulas', x: 90, y: 430, rot: -4, w: 620 },
  { at: B.medcurso, nome: 'MEDCURSO', x: 250, y: 560, rot: 3, w: 540 },
  { at: B.medcel, nome: 'MEDCEL', x: 140, y: 700, rot: -2.5, w: 500 },
  { at: B.medcof, nome: 'MEDCOF', x: 320, y: 820, rot: 5, w: 520 },
  { at: B.rajada, nome: 'SANARFLIX', x: 70, y: 930, rot: -6, w: 480 },
  { at: B.rajada + 0.9, nome: 'MEDGRUPO', x: 380, y: 1010, rot: 4, w: 500 },
  { at: B.rajada + 2.1, nome: 'EU MÉDICO RESIDENTE', x: 150, y: 1120, rot: -3, w: 640 },
];

const POSTITS = [
  { at: B.popup + 0.8, x: 700, y: 640, rot: 8, txt: 'senha: med2024̶ 2025̶ ???' },
  { at: B.rajada + 1.5, x: 640, y: 980, rot: -6, txt: 'boleto vence AMANHÃ' },
];

const AVISOS = [
  { at: B.caos + 0.3, x: 90, y: 350, txt: 'senha expirada' },
  { at: B.caos + 1.1, x: 560, y: 300, txt: 'fatura em aberto' },
  { at: B.caos + 1.9, x: 320, y: 1330, txt: '3 tentativas restantes' },
  { at: B.caos + 2.7, x: 620, y: 1430, txt: 'renove sua assinatura' },
];

const FERRAMENTAS = [
  { at: 0, titulo: 'busca única', sub: 'aula + livro + questão' },
  { at: 1, titulo: 'resumo em 1 clique', sub: 'a aula longa vira o essencial' },
  { at: 2, titulo: 'flashcards do SEU material', sub: 'a IA monta o baralho' },
  { at: 3, titulo: 'questões comentadas', sub: 'resposta explicada, uma a uma' },
];

export const C83_Matriculas: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // sucção da virada: tudo converge pro centro e some
  const suga = easeInExpo(win(t, B.virada, B.carteirinha + 0.4));
  const caosVivo = t < B.carteirinha + 0.45;
  const shake = shakeAt(t, B.carimbos, 6) || shakeAt(t, B.carimbos + 0.5, 5) || shakeAt(t, B.carimbos + 1.0, 5) || shakeAt(t, B.carteirinha + 0.3, 8);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', transform: shake || undefined }}>
      <OLightBg />

      {/* contador de matrículas */}
      {caosVivo && t >= B.sete && (
        <div style={{ position: 'absolute', top: 170, right: 70, opacity: 1 - suga, zIndex: 9 }}>
          <div style={{ background: WHITE, border: `3px solid ${O_RED}`, borderRadius: 16, padding: '12px 22px', textAlign: 'center', boxShadow: '0 16px 40px -12px rgba(224,45,45,0.3)' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_RED, lineHeight: 1 }}>
              {Math.min(7, FICHAS.filter(f => t >= f.at).length)}
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: O_MUT, letterSpacing: 1 }}>MATRÍCULAS</div>
          </div>
        </div>
      )}

      {/* hook */}
      {t < B.estrategia && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 560, textAlign: 'center', opacity: 1 - win(t, B.estrategia - 0.35, B.estrategia) }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 72, color: O_INK, letterSpacing: -2, lineHeight: 1.2 }}>
            pra estudar com<br />todos os grandes…
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_RED, marginTop: 26, opacity: win(t, B.sete, B.sete + 0.35) }}>
            sete matrículas diferentes.
          </div>
        </div>
      )}

      {/* fichas caindo */}
      {caosVivo && FICHAS.map((f, i) => {
        const p = easeOutExpo(win(t, f.at, f.at + 0.55));
        if (p <= 0) return null;
        const sx = 540 - (f.x + f.w / 2);          // deslocamento até o centro na sucção
        const sy = 900 - (f.y + 60);
        return (
          <div key={i} style={{
            position: 'absolute', left: f.x, top: f.y, width: f.w,
            transform: `translateY(${(1 - p) * -900}px) translate(${suga * sx}px, ${suga * sy}px) rotate(${f.rot * (1 - p * 0.3) + suga * 25}deg) scale(${1 - suga * 0.85})`,
            opacity: Math.min(1, p * 2) * (1 - easeInExpo(win(t, B.carteirinha, B.carteirinha + 0.4))),
            background: '#fffdf6', border: '2px solid #e2dcc9', borderRadius: 14,
            boxShadow: '0 26px 60px -18px rgba(22,24,29,0.3)', padding: '20px 26px', zIndex: 3 + i,
          }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: O_MUT, letterSpacing: 2 }}>FICHA DE MATRÍCULA</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: f.nome.length > 12 ? 30 : 38, color: O_INK, marginTop: 4 }}>{f.nome}</div>
            {f.sub && <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: O_RED, marginTop: 2, opacity: win(t, B.n14, B.n14 + 0.3) }}>{f.sub}</div>}
            {/* linhas de formulário */}
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              {['login', 'senha', 'boleto'].map((c, k) => (
                <span key={c} style={{
                  fontFamily: MONO, fontWeight: 700, fontSize: 15, color: '#8a1f1f',
                  border: '2px solid #c94f4f', borderRadius: 6, padding: '3px 10px', transform: `rotate(${k % 2 ? 2 : -2}deg)`,
                  opacity: i === 0 ? win(t, B.carimbos + k * 0.45, B.carimbos + 0.2 + k * 0.45) : win(t, f.at + 0.4 + k * 0.15, f.at + 0.55 + k * 0.15),
                  background: 'rgba(201,79,79,0.06)',
                }}>{c.toUpperCase()}</span>
              ))}
            </div>
          </div>
        );
      })}

      {/* pop-up "esqueceu sua senha?" */}
      {caosVivo && t >= B.popup && (
        <div style={{
          position: 'absolute', left: 420, top: 610, width: 420, zIndex: 20,
          transform: `scale(${easeOutExpo(win(t, B.popup, B.popup + 0.35))}) translate(${suga * -180}px, ${suga * 240}px) scale(${1 - suga})`,
          opacity: 1 - easeInExpo(win(t, B.carteirinha - 0.1, B.carteirinha + 0.3)),
          background: WHITE, border: '2px solid #d8dde4', borderRadius: 14, boxShadow: '0 30px 70px -20px rgba(22,24,29,0.35)',
        }}>
          <div style={{ background: '#f2f4f7', borderRadius: '12px 12px 0 0', padding: '10px 16px', fontFamily: MONO, fontSize: 15, color: O_MUT, display: 'flex', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: '#e8505b' }} />
            <span style={{ width: 12, height: 12, borderRadius: 99, background: '#f2c14e' }} />
            <span style={{ width: 12, height: 12, borderRadius: 99, background: '#4bb56a' }} />
          </div>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 26, color: O_INK }}>Esqueceu sua senha?</div>
            <div style={{ marginTop: 12, background: O_RED, color: WHITE, borderRadius: 8, padding: '10px 0', textAlign: 'center', fontFamily: HEAD, fontWeight: 800, fontSize: 20 }}>Recuperar… de novo</div>
          </div>
        </div>
      )}

      {/* post-its */}
      {caosVivo && POSTITS.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y, width: 300, zIndex: 18,
          transform: `rotate(${p.rot}deg) scale(${easeOutExpo(win(t, p.at, p.at + 0.3)) * (1 - suga)})`,
          opacity: 1 - easeInExpo(win(t, B.carteirinha - 0.1, B.carteirinha + 0.3)),
          background: '#fff3ad', boxShadow: '0 14px 30px -10px rgba(120,100,20,0.35)', padding: '16px 18px',
          fontFamily: BODY, fontWeight: 700, fontSize: 21, color: '#6b5d1c',
        }}>{p.txt}</div>
      ))}

      {/* avisos vermelhos do caos */}
      {caosVivo && AVISOS.map((a, i) => (
        <div key={i} style={{
          position: 'absolute', left: a.x, top: a.y, zIndex: 22,
          opacity: win(t, a.at, a.at + 0.25) * (t >= B.congela ? (Math.sin(t * 10 + i) > 0 ? 1 : 0.4) : 1) * (1 - easeInExpo(win(t, B.virada, B.carteirinha))),
          transform: `scale(${easeOutExpo(win(t, a.at, a.at + 0.35))})`,
          background: '#c93b46', color: WHITE, borderRadius: 999, padding: '10px 20px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 21, boxShadow: '0 14px 34px -10px rgba(201,59,70,0.5)',
        }}>⚠ {a.txt}</div>
      ))}

      {/* carteirinha única */}
      {t >= B.carteirinha && t < B.avulsa + 0.4 && (
        <div style={{
          position: 'absolute', left: '50%', top: 760, zIndex: 30,
          transform: `translateX(-50%) scale(${0.3 + 0.7 * easeOutExpo(win(t, B.carteirinha + 0.15, B.carteirinha + 0.7))})`,
          opacity: win(t, B.carteirinha + 0.15, B.carteirinha + 0.4) * (1 - win(t, B.avulsa - 0.3, B.avulsa + 0.2)),
        }}>
          <div style={{ width: 640, borderRadius: 26, overflow: 'hidden', boxShadow: '0 60px 130px -30px rgba(224,45,45,0.4)' }}>
            <div style={{ background: O_RED, padding: '22px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: WHITE }}>One<span style={{ opacity: 0.85 }}>Med</span></span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 17, color: 'rgba(255,255,255,0.85)', letterSpacing: 2 }}>CARTEIRINHA ÚNICA</span>
            </div>
            <div style={{ background: WHITE, padding: '26px 34px' }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_INK, opacity: win(t, B.n530, B.n530 + 0.3) }}>+530 cursos</div>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: O_GREEN, marginTop: 6, opacity: win(t, B.n530 + 0.5, B.n530 + 0.8) }}>um login. só isso.</div>
            </div>
          </div>
        </div>
      )}

      {/* ferramentas */}
      {t >= B.avulsa - 0.4 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.avulsa - 0.3, B.avulsa + 0.1), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: O_INK, letterSpacing: -1 }}>
              o que nenhuma matrícula<br />avulsa <span style={{ color: O_RED }}>te dá:</span>
            </span>
          </div>
          <div style={{ position: 'absolute', left: 90, right: 90, top: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FERRAMENTAS.map((f, i) => {
              const at = [B.f1, B.f2, B.f3, B.f4][i];
              const p = easeOutExpo(win(t, at, at + 0.5));
              return (
                <div key={i} style={{
                  opacity: win(t, at, at + 0.3), transform: `translateX(${(1 - p) * (i % 2 ? 90 : -90)}px)`,
                  background: WHITE, border: `2.5px solid ${i === 3 ? O_RED : '#e6e1d5'}`, borderRadius: 20,
                  padding: '22px 30px', boxShadow: '0 22px 55px -18px rgba(22,24,29,0.18)',
                  display: 'flex', alignItems: 'center', gap: 22,
                }}>
                  <span style={{ width: 58, height: 58, borderRadius: 16, background: i === 3 ? O_RED : O_INK, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 28, flexShrink: 0 }}>{i + 1}</span>
                  <span>
                    <span style={{ display: 'block', fontFamily: HEAD, fontWeight: 900, fontSize: 36, color: O_INK }}>{f.titulo}</span>
                    <span style={{ display: 'block', fontFamily: BODY, fontWeight: 600, fontSize: 24, color: O_MUT, marginTop: 2 }}>{f.sub}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FlashCut t={t} atSec={B.carteirinha + 0.15} color="rgba(224,45,45,0.25)" />
      <FlashCut t={t} atSec={B.avulsa} color="rgba(22,24,29,0.18)" />
      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c83.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
