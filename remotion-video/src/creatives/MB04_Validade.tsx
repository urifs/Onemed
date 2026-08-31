import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MBDarkBg, MBHero, MBEndCard, useMBCount, MB_BLUE, MB_INK, MB_MUT, MB_CARD, MB_LINE, WHITE } from './mbdark';
import timing from './timings/mb04.json';

/* ============================================================
   MB04 — VALIDADE
   A diretriz muda, a conduta muda, a prova cobra a versão nova —
   e o PDF que passou de mão em mão continua parado em 2022.
   ============================================================ */

const T = timing as Timing;
const DELAY = 0.7;
export const MB04_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  dequando: DELAY + 3.0,
  diretriz: DELAY + 4.5,
  conduta: DELAY + 6.4,
  prova: DELAY + 8.3,
  pdf: DELAY + 10.8,
  data: DELAY + 13.9,
  vencido: DELAY + 16.3,
  errado: DELAY + 19.9,
  drive: DELAY + 23.4,
  garantida: DELAY + 24.9,
  custa: DELAY + 26.3,
  atualizam: DELAY + 27.8,
  acompanha: DELAY + 29.6,
  n530: DELAY + 31.8,
  n9000: DELAY + 33.9,
  valendo: DELAY + 35.4,
  end: DELAY + 37.6,
};

const SC = {
  hook: [0, B.diretriz - 0.3] as Range,
  velho: [B.diretriz - 0.3, B.errado + 1.4] as Range,
  novo: [B.drive - 0.6, B.n530 - 0.4] as Range,
  numeros: [B.n530 - 0.4, B.valendo + 1.6] as Range,
  hero: [B.vencido - 0.2, B.drive - 0.5] as Range,
};

/* a folha que envelhece: a data some, a poeira entra */
const Folha: React.FC<{ t: number; velha: boolean }> = ({ t, velha }) => {
  const idade = velha ? clamp01((t - B.pdf) / 3.2) : 0;
  return (
    <div style={{
      position: 'absolute', left: 300, top: 620, width: 480, height: 620,
      background: velha ? '#171b23' : MB_CARD,
      border: `2px solid ${velha ? MB_LINE : `${MB_BLUE}66`}`,
      borderRadius: 18, padding: '30px 30px',
      transform: `rotate(${velha ? -2.2 + idade * 1.2 : 0}deg)`,
      boxShadow: velha
        ? '0 26px 60px -20px rgba(0,0,0,0.8)'
        : '0 26px 70px -18px rgba(59,130,246,0.45)',
      filter: velha ? `grayscale(${0.2 + idade * 0.5}) brightness(${1 - idade * 0.22})` : 'none',
      overflow: 'hidden',
    }}>
      <div style={{
        fontFamily: MONO, fontWeight: 700, fontSize: 22,
        color: velha ? MB_MUT : MB_BLUE, letterSpacing: 1,
      }}>{velha ? 'apostila_final_v3.pdf' : 'plataforma · edição vigente'}</div>
      <div style={{
        marginTop: 16, fontFamily: HEAD, fontWeight: 900, fontSize: 90,
        color: velha ? MB_MUT : MB_INK, letterSpacing: -3, lineHeight: 1,
      }}>{velha ? '2022' : '2026'}</div>
      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 13 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            height: 12, borderRadius: 999,
            width: `${[92, 74, 88, 60, 82, 48][i]}%`,
            background: velha ? 'rgba(255,255,255,0.10)' : `${MB_BLUE}3a`,
          }} />
        ))}
      </div>
      {velha && (
        <div style={{
          position: 'absolute', left: -30, top: 300, width: 560,
          transform: 'rotate(-14deg)', textAlign: 'center',
          opacity: clamp01((t - B.data) / 0.5),
        }}>
          <span style={{
            display: 'inline-block', border: '5px solid #e05252', color: '#e05252',
            borderRadius: 14, padding: '10px 26px',
            fontFamily: HEAD, fontWeight: 900, fontSize: 46, letterSpacing: 2,
          }}>VENCIDO</span>
        </div>
      )}
      {!velha && (
        <div style={{
          position: 'absolute', right: 26, bottom: 26,
          background: MB_BLUE, borderRadius: 999, padding: '10px 22px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: WHITE,
          opacity: clamp01((t - B.atualizam) / 0.5),
        }}>atualizado</div>
      )}
    </div>
  );
};

/* as três linhas que mudam enquanto a folha fica parada */
const Mudanca: React.FC<{ t: number; at: number; y: number; velho: string; novo: string }> =
  ({ t, at, y, velho, novo }) => {
    const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const troca = clamp01((t - at - 0.5) / 0.4);
    return (
      <div style={{ position: 'absolute', left: 80, right: 80, top: y, opacity: o }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: MB_CARD, border: `2px solid ${MB_LINE}`, borderRadius: 14, padding: '16px 22px',
        }}>
          <div style={{
            flex: 1, fontFamily: BODY, fontSize: 26, color: MB_MUT,
            textDecoration: troca > 0.5 ? 'line-through' : 'none',
            opacity: troca > 0.5 ? 0.5 : 1,
          }}>{velho}</div>
          <div style={{ fontFamily: HEAD, fontSize: 26, color: MB_MUT, opacity: troca }}>→</div>
          <div style={{
            flex: 1, fontFamily: BODY, fontWeight: 600, fontSize: 26, color: MB_BLUE,
            opacity: troca, transform: `translateX(${(1 - troca) * 12}px)`,
          }}>{novo}</div>
        </div>
      </div>
    );
  };

export const MB04_Validade: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const opHook = sceneOpacity(t, SC.hook, true);
  const opVelho = sceneOpacity(t, SC.velho);
  const opNovo = sceneOpacity(t, SC.novo);
  const opNum = sceneOpacity(t, SC.numeros);

  const cursos = useMBCount(530, Math.round(B.n530 * FPS), 26);
  const livros = useMBCount(9000, Math.round(B.n9000 * FPS), 26);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MBDarkBg />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: opHook }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 720, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontSize: 30, color: MB_MUT, letterSpacing: 1 }}>
            uma pergunta incômoda:
          </div>
          <div style={{
            marginTop: 24, fontFamily: HEAD, fontWeight: 900, fontSize: 76,
            color: MB_INK, letterSpacing: -2.4, lineHeight: 1.16,
          }}>
            o material que<br />você estuda<br />
            <span style={{
              color: MB_BLUE,
              opacity: interpolate(t, [B.dequando, B.dequando + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>é de quando?</span>
          </div>
        </div>
      </div>

      {/* o que muda por fora, e a folha parada */}
      <div style={{ position: 'absolute', inset: 0, opacity: opVelho }}>
        <Mudanca t={t} at={B.diretriz} y={300} velho="diretriz 2022" novo="diretriz vigente" />
        <Mudanca t={t} at={B.conduta} y={404} velho="conduta antiga" novo="conduta revisada" />
        <Mudanca t={t} at={B.prova} y={508} velho="o que você decorou" novo="o que a prova cobra" />
        <Folha t={t} velha />
      </div>

      {/* a versão que vale */}
      <div style={{ position: 'absolute', inset: 0, opacity: opNovo }}>
        <div style={{
          position: 'absolute', left: 60, right: 60, top: 330, textAlign: 'center',
          opacity: interpolate(t, [B.drive, B.drive + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: MB_INK, letterSpacing: -1.8 }}>
            no Drive <span style={{ color: MB_BLUE }}>MedBrasil</span>
          </div>
          <div style={{
            marginTop: 18, fontFamily: BODY, fontSize: 29, color: MB_MUT,
            opacity: interpolate(t, [B.garantida, B.garantida + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            atualização garantida — e sem custo a mais
          </div>
        </div>
        <Folha t={t} velha={false} />
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1330, textAlign: 'center',
          opacity: interpolate(t, [B.acompanha, B.acompanha + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            display: 'inline-block', background: MB_CARD, border: `2px solid ${MB_BLUE}`,
            borderRadius: 999, padding: '14px 32px',
            fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: MB_BLUE,
          }}>
            as plataformas atualizam · o seu acesso acompanha
          </div>
        </div>
      </div>

      {/* números */}
      <div style={{ position: 'absolute', inset: 0, opacity: opNum }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 620, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: MB_INK, letterSpacing: -5, lineHeight: 1 }}>
            {cursos}<span style={{ color: MB_BLUE }}>+</span>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: MB_MUT }}>cursos completos</div>
          <div style={{
            marginTop: 54, fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: MB_INK, letterSpacing: -5, lineHeight: 1,
            opacity: interpolate(t, [B.n9000, B.n9000 + 0.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            {livros}<span style={{ color: MB_BLUE }}>+</span>
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: MB_MUT,
            opacity: interpolate(t, [B.n9000, B.n9000 + 0.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>livros traduzidos</div>
          <div style={{
            marginTop: 58, display: 'flex', justifyContent: 'center',
            opacity: interpolate(t, [B.valendo, B.valendo + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            <div style={{
              background: MB_BLUE, borderRadius: 999, padding: '16px 40px',
              boxShadow: '0 18px 50px -12px rgba(59,130,246,0.55)',
              fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: WHITE,
            }}>
              sempre na versão que está valendo
            </div>
          </div>
        </div>
      </div>

      <MBHero t={t} range={SC.hero} line1="estudar material vencido não é estudar menos."
        line2="é estudar errado." size={50} top={1450}
        blueAfterSec={B.errado - SC.hero[0]} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1780} size={52} highlight={MB_BLUE} />
      <MBEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/mb04.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
