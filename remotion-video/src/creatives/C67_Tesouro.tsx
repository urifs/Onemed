import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { OLEndCard, O_RED, O_INK, O_MUT, O_GREEN } from './olight';
import { Grain, Vignette, win, easeOutExpo } from './cine';
import timing from './timings/c67.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C67_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);
const PAPEL = '#f3e9d2';
const TINTA = '#5b4a32';

const B = {
  mapa: DELAY + 1.7,
  ilha: DELAY + 4.1, estrategia: DELAY + 5.4, medcof: DELAY + 6.7, n65: DELAY + 8.4,
  arquip: DELAY + 12.2, cardio: DELAY + 14.2, incor: DELAY + 16.6,
  continente: DELAY + 18.1, n42: DELAY + 20.4, n86: DELAY + 22.6,
  x: DELAY + 24.8, n56: DELAY + 27.6,
  n530: DELAY + 31.1,
  bussola: DELAY + 34.7, b1: DELAY + 38.9, b2: DELAY + 39.9, b3: DELAY + 40.7,
  enterrado: DELAY + 43.6, logado: DELAY + 44.7,
  end: DELAY + T.duration - 3.2,
};

const Ilha: React.FC<{ t: number; at: number; cx: number; cy: number; w: number; h: number; rot: number; titulo: string; children?: React.ReactNode }> =
({ t, at, cx, cy, w, h, rot, titulo, children }) => {
  const p = easeOutExpo(win(t, at, at + 0.6));
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, opacity: win(t, at, at + 0.35), transform: `rotate(${rot}deg) scale(${0.85 + p * 0.15})` }}>
      <div style={{
        position: 'absolute', inset: 0, background: '#e6d7b4', border: `4px solid ${TINTA}`,
        borderRadius: '48% 52% 55% 45% / 55% 48% 52% 45%', boxShadow: 'inset 0 0 40px rgba(91,74,50,0.25)',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: 18 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 21, color: TINTA, letterSpacing: 2 }}>{titulo}</div>
        {children}
      </div>
    </div>
  );
};

const Nome: React.FC<{ t: number; at: number; children: React.ReactNode; size?: number }> = ({ t, at, children, size = 33 }) => (
  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: O_INK, opacity: win(t, at, at + 0.3) }}>{children}</div>
);

export const C67_Tesouro: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const rota = win(t, B.ilha, B.x + 0.6);
  const mapOp = Math.min(win(t, B.mapa - 0.9, B.mapa - 0.3), 1 - win(t, B.end + 0.5, B.end + 1));
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#e9dcbc' }}>
      {/* pergaminho */}
      <div style={{ position: 'absolute', inset: 40, background: PAPEL, borderRadius: 18, border: `3px solid #d6c49a`, boxShadow: 'inset 0 0 120px rgba(91,74,50,0.22), 0 30px 80px rgba(60,45,20,0.35)', opacity: mapOp }} />
      <div style={{ position: 'absolute', inset: 40, opacity: 0.5 * mapOp, backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(91,74,50,0.08) 0 3px, transparent 3px), radial-gradient(circle at 80% 60%, rgba(91,74,50,0.06) 0 2px, transparent 2px)', backgroundSize: '160px 160px, 220px 220px' }} />

      <div style={{ position: 'absolute', inset: 0, opacity: mapOp }}>
        {/* título do mapa */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', opacity: win(t, B.mapa, B.mapa + 0.4) }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: TINTA, letterSpacing: 7 }}>CARTA NÁUTICA DO ESTUDO</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_INK, marginTop: 8, opacity: win(t, B.n530, B.n530 + 0.35) }}>
            +530 cursos no mesmo mapa
          </div>
        </div>

        {/* rota tracejada ligando tudo */}
        <svg style={{ position: 'absolute', inset: 0 }} width={1080} height={1920} viewBox="0 0 1080 1920">
          <path
            d="M 310 560 C 470 620, 640 640, 760 780 C 850 890, 700 980, 560 1030 C 400 1090, 330 1180, 420 1300"
            fill="none" stroke={O_RED} strokeWidth={7} strokeLinecap="round" strokeDasharray="12 26"
            style={{ opacity: 0.9 * rota }}
          />
        </svg>

        {/* Ilha dos Extensivos */}
        <Ilha t={t} at={B.ilha} cx={310} cy={540} w={480} h={330} rot={-3} titulo="ILHA DOS EXTENSIVOS">
          <Nome t={t} at={B.estrategia}>Estratégia MED</Nome>
          <Nome t={t} at={B.medcof}>Medcof</Nome>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: O_RED, opacity: win(t, B.n65, B.n65 + 0.3) }}>+65 mil aulas</div>
        </Ilha>

        {/* Arquipélago das Especialidades */}
        <Ilha t={t} at={B.arquip} cx={780} cy={800} w={440} h={300} rot={4} titulo="ARQUIPÉLAGO DAS ESPECIALIDADES">
          <Nome t={t} at={B.cardio}>Cardiopapers</Nome>
          <Nome t={t} at={B.incor} size={29}>InCor · Eletrocardiograma</Nome>
        </Ilha>

        {/* Continente das Questões */}
        <Ilha t={t} at={B.continente} cx={470} cy={1120} w={640} h={400} rot={-2} titulo="CONTINENTE DAS QUESTÕES">
          <div style={{ display: 'flex', gap: 26, alignItems: 'baseline', opacity: win(t, B.n42, B.n42 + 0.3) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_INK }}>42</span>
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24, color: TINTA }}>cursos de banco de questões</span>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: O_RED, opacity: win(t, B.n86, B.n86 + 0.3) }}>+86 mil itens</div>
          {/* X do tesouro */}
          <div style={{ position: 'absolute', right: 64, bottom: 46, opacity: win(t, B.x, B.x + 0.3), transform: `scale(${0.5 + 0.5 * easeOutExpo(win(t, B.x, B.x + 0.5))}) rotate(-8deg)` }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 110, color: O_RED, textShadow: '0 6px 0 rgba(91,74,50,0.3)' }}>✕</div>
          </div>
        </Ilha>

        {/* legenda do X */}
        <div style={{ position: 'absolute', left: 110, right: 110, top: 1360, textAlign: 'center', opacity: win(t, B.n56, B.n56 + 0.35) }}>
          <div style={{ display: 'inline-block', background: 'rgba(224,45,45,0.08)', border: `3px solid ${O_RED}`, borderRadius: 16, padding: '18px 30px', transform: 'rotate(-1.5deg)' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: O_INK }}>o tesouro: </span>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: O_RED }}>Banco de Questões MED — +56 mil</span>
          </div>
        </div>

        {/* bússola da IA */}
        {t >= B.bussola && t < B.enterrado + 0.4 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(243,233,210,0.94)', opacity: Math.min(win(t, B.bussola, B.bussola + 0.35), 1 - win(t, B.enterrado - 0.2, B.enterrado + 0.2)) }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: TINTA, letterSpacing: 6 }}>A BÚSSOLA DA EXPEDIÇÃO</div>
              {/* rosa dos ventos */}
              <svg width={420} height={420} viewBox="0 0 420 420" style={{ marginTop: 30 }}>
                <circle cx={210} cy={210} r={190} fill="none" stroke={TINTA} strokeWidth={5} />
                <circle cx={210} cy={210} r={150} fill="none" stroke={TINTA} strokeWidth={2} opacity={0.5} />
                <g style={{ transform: `rotate(${(1 - easeOutExpo(win(t, B.bussola, B.bussola + 1.4))) * 220}deg)`, transformOrigin: '210px 210px' }}>
                  <polygon points="210,55 232,210 210,250 188,210" fill={O_RED} />
                  <polygon points="210,365 188,210 210,170 232,210" fill={TINTA} opacity={0.6} />
                </g>
                <circle cx={210} cy={210} r={16} fill={O_INK} />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', marginTop: 26 }}>
                {[['aponta o que estudar', B.b1], ['resume em 1 clique', B.b2], ['monta seu cronograma', B.b3]].map(([txt, at], i) => (
                  <span key={i} style={{
                    opacity: win(t, at as number, (at as number) + 0.3),
                    background: '#fffdf6', border: `2.5px solid ${i === 0 ? O_RED : '#d6c49a'}`, borderRadius: 999, padding: '16px 30px',
                    fontFamily: HEAD, fontWeight: 800, fontSize: 33, color: O_INK,
                  }}>{txt as string}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* fecho */}
        {t >= B.enterrado && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(243,233,210,0.96)', opacity: Math.min(win(t, B.enterrado, B.enterrado + 0.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
            <div style={{ position: 'absolute', left: 80, right: 80, top: 780, textAlign: 'center' }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: O_INK, letterSpacing: -2, lineHeight: 1.25 }}>
                o tesouro não está enterrado.
              </div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: O_RED, letterSpacing: -3, marginTop: 24, opacity: win(t, B.logado, B.logado + 0.35), transform: `scale(${0.9 + 0.1 * easeOutExpo(win(t, B.logado, B.logado + 0.5))})` }}>
                está logado.
              </div>
            </div>
          </div>
        )}
      </div>

      <Vignette strength={0.3} />
      <Grain opacity={0.05} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c67.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
