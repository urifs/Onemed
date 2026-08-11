import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, FlashCut, win, easeOutExpo } from './cine';
import timing from './timings/c64.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C64_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);
const OURO = '#d8b45a';

const B = {
  filme: DELAY + 1.4,
  estrelando: DELAY + 4.7, n14: DELAY + 9.2, take1: DELAY + 10.6,
  elenco: DELAY + 12.9, medcof: DELAY + 14.4, sanarflix: DELAY + 16.0, medcel: DELAY + 17.9, emr: DELAY + 19.0,
  incor: DELAY + 21.2, ecg: DELAY + 23.0,
  figuracao: DELAY + 26.6, n31: DELAY + 28.3,
  acelera: DELAY + 32.6, selo: DELAY + 35.4,
  pos: DELAY + 41.6, tk_resumo: DELAY + 44.4, tk_flash: DELAY + 45.9, tk_crono: DELAY + 48.5,
  cartela: DELAY + 51.4,
  end: DELAY + T.duration - 3.2,
};

const Rolo: React.FC<{ t: number; at: number; until: number; children: React.ReactNode; speed?: number }> =
({ t, at, until, children, speed = 55 }) => {
  const o = Math.min(win(t, at, at + 0.3), 1 - win(t, until - 0.3, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 640 - (t - at) * speed, textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
};

const Rotulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: 'rgba(255,255,255,0.55)', letterSpacing: 8 }}>{children}</div>
);
const NomeOuro: React.FC<{ on: boolean; size?: number; children: React.ReactNode }> = ({ on, size = 62, children }) => (
  <div style={{
    fontFamily: HEAD, fontWeight: 900, fontSize: size, letterSpacing: 1, lineHeight: 1.35,
    color: on ? OURO : 'rgba(255,255,255,0.28)', textShadow: on ? '0 0 44px rgba(216,180,90,0.45)' : 'none',
  }}>{children}</div>
);

const Take: React.FC<{ t: number; at: number; until: number; src: string; from: number; label: string }> =
({ t, at, until, src, from, label }) => {
  const o = Math.min(win(t, at, at + 0.22), 1 - win(t, until - 0.2, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%)', width: 620, height: 1130, borderRadius: 30, overflow: 'hidden', border: `1.5px solid rgba(216,180,90,0.4)`, boxShadow: '0 60px 130px -30px rgba(0,0,0,0.9)' }}>
        <ClipAt fromSec={at - 0.3}>
          <OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', filter: 'brightness(1.22)' }} />
        </ClipAt>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 330, textAlign: 'center' }}>
        <span style={{ background: 'rgba(0,0,0,0.7)', border: `1px solid ${OURO}`, borderRadius: 999, padding: '10px 28px', fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: OURO }}>{label}</span>
      </div>
    </div>
  );
};

export const C64_Creditos: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const blur = win(t, B.acelera, B.selo - 0.4);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#060608' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 70% at 50% 20%, #101018 0%, #060608 70%)' }} />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.estrelando ? 1 - win(t, B.estrelando - 0.3, B.estrelando) : 0 }}>
        <div style={{ position: 'absolute', left: 70, right: 70, top: 760, textAlign: 'center' }}>
          <Rotulo>SESSÃO FINAL</Rotulo>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE, letterSpacing: -1.5, marginTop: 20, lineHeight: 1.25 }}>
            se o seu estudo fosse um filme…<br /><span style={{ color: OURO }}>créditos finais.</span>
          </div>
        </div>
      </div>

      {/* ESTRELANDO */}
      <Rolo t={t} at={B.estrelando} until={B.take1} speed={40}>
        <Rotulo>ESTRELANDO</Rotulo>
        <NomeOuro on size={84}>ESTRATÉGIA MED</NomeOuro>
        <div style={{ fontFamily: MONO, fontSize: 30, color: 'rgba(255,255,255,0.7)', marginTop: 12, opacity: win(t, B.n14, B.n14 + 0.3) }}>
          Extensivo · <span style={{ color: OURO, fontWeight: 700 }}>14.142 aulas</span>
        </div>
      </Rolo>
      <Take t={t} at={B.take1} until={B.elenco} src="rec/m_course.mp4" from={120} label="na plataforma, completo" />

      {/* ELENCO DE APOIO */}
      <Rolo t={t} at={B.elenco} until={B.incor} speed={30}>
        <Rotulo>ELENCO DE APOIO</Rotulo>
        <div style={{ marginTop: 16 }}>
          <NomeOuro on={t >= B.medcof}>MEDCOF</NomeOuro>
          <NomeOuro on={t >= B.sanarflix}>SANARFLIX</NomeOuro>
          <NomeOuro on={t >= B.medcel}>MEDCEL</NomeOuro>
          <NomeOuro on={t >= B.emr}>EU MÉDICO RESIDENTE</NomeOuro>
        </div>
      </Rolo>

      {/* PARTICIPAÇÃO ESPECIAL */}
      <Rolo t={t} at={B.incor} until={B.figuracao} speed={30}>
        <Rotulo>PARTICIPAÇÃO ESPECIAL</Rotulo>
        <NomeOuro on size={78}>InCor</NomeOuro>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.8)', marginTop: 8, opacity: win(t, B.ecg, B.ecg + 0.3) }}>Eletrocardiograma</div>
        <svg width={860} height={140} viewBox="0 0 860 140" style={{ marginTop: 20, opacity: win(t, B.ecg, B.ecg + 0.4) }}>
          <polyline
            points="0,70 180,70 210,70 230,20 250,120 270,55 300,70 520,70 550,70 570,26 590,114 610,60 640,70 860,70"
            fill="none" stroke="#41d98c" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={1700} strokeDashoffset={1700 * (1 - win(t, B.ecg, B.ecg + 1.6))}
          />
        </svg>
      </Rolo>

      {/* FIGURAÇÃO */}
      <Rolo t={t} at={B.figuracao} until={B.acelera + 0.6} speed={26}>
        <Rotulo>FIGURAÇÃO</Rotulo>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 120, color: WHITE, letterSpacing: -4, marginTop: 14, opacity: win(t, B.n31, B.n31 + 0.3) }}>
          31.612
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
          AULAS DE QUESTÕES COMENTADAS
        </div>
      </Rolo>

      {/* letreiro acelera e vira selo */}
      {blur > 0 && t < B.pos && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.pos - 0.35, B.pos) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 700 - blur * 900, filter: `blur(${blur * 7}px)`, textAlign: 'center', opacity: 0.5 * (1 - win(t, B.selo - 0.3, B.selo)) }}>
            {[...Array(14)].map((_, i) => (
              <div key={i} style={{ fontFamily: MONO, fontSize: 26, color: 'rgba(255,255,255,0.5)', lineHeight: 2.1 }}>
                {'· · · · · · · · · ·'}
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 70, right: 70, top: 780, textAlign: 'center', opacity: win(t, B.selo, B.selo + 0.4) }}>
            <div style={{ display: 'inline-block', border: `3px solid ${OURO}`, borderRadius: 20, padding: '30px 44px' }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 76, color: WHITE, letterSpacing: -2 }}>+530 <span style={{ color: OURO }}>cursos</span></div>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.75)', marginTop: 12 }}>ao lado de +10.000 médicos e estudantes</div>
            </div>
          </div>
        </div>
      )}

      {/* PÓS-PRODUÇÃO: IA */}
      {t >= B.pos && t < B.cartela && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 350, textAlign: 'center', opacity: Math.min(win(t, B.pos, B.pos + 0.3), 1 - win(t, B.cartela - 0.25, B.cartela)), zIndex: 6 }}>
          <Rotulo>PÓS-PRODUÇÃO</Rotulo>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: OURO, marginTop: 8 }}>INTELIGÊNCIA ARTIFICIAL</div>
        </div>
      )}
      <Take t={t} at={B.tk_resumo} until={B.tk_flash} src="rec/m_pdf.mp4" from={210} label="resumo em 1 clique" />
      <Take t={t} at={B.tk_flash} until={B.tk_crono} src="rec/oa_flash_gen.mp4" from={220} label="flashcards do seu material" />
      <Take t={t} at={B.tk_crono} until={B.cartela} src="rec/ol_plano.mp4" from={300} label="cronograma com mapa mental" />

      {/* cartela final */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.cartela, B.cartela + 0.4), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 800, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -1, lineHeight: 1.3 }}>
            este filme passa<br />na sua tela <span style={{ color: RED }}>todo dia.</span>
          </div>
        </div>
      </div>

      {[B.estrelando, B.take1, B.elenco, B.incor, B.figuracao, B.pos, B.cartela].map((b, i) => (
        <FlashCut key={i} t={t} atSec={b} color="rgba(216,180,90,0.28)" />
      ))}
      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={140} />
      <Vignette strength={0.55} />
      <Grain opacity={0.08} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={OURO} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c64.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
