import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo, shakeAt } from './cine';
import timing from './timings/c52.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C52_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  abre: DELAY + 0.1,
  f1: DELAY + 5.7, f2: DELAY + 14.1, f3: DELAY + 19.5, f4: DELAY + 27.3, f5: DELAY + 33.3,
  carimbo: DELAY + 38.1,
  disponivel: DELAY + 41.0,
  end: DELAY + T.duration - 3.2,
};

type Ficha = { at: number; until: number; n: string; titulo: string; sub: string; src: string; from: number };
const FICHAS: Ficha[] = [
  { at: B.f1, until: B.f2, n: '01', titulo: 'A BUSCA TOTAL', sub: 'aula + livro + questão — acha até arquivo dentro do acervo', src: 'rec/ol_acervo.mp4', from: 165 },
  { at: B.f2, until: B.f3, n: '02', titulo: 'RESUMO + ANOTAÇÃO', sub: '1 clique — e grifo por cima do próprio PDF', src: 'rec/ol_assist.mp4', from: 180 },
  { at: B.f3, until: B.f4, n: '03', titulo: 'A FÁBRICA DE REVISÃO', sub: 'flashcards do teu material + questões comentadas', src: 'rec/ol_flash.mp4', from: 180 },
  { at: B.f4, until: B.f5, n: '04', titulo: 'O ASSISTENTE', sub: 'lê a tela aberta e responde na hora', src: 'rec/ol_assist.mp4', from: 310 },
  { at: B.f5, until: B.carimbo, n: '05', titulo: 'A REDE', sub: '+10.000 médicos e estudantes compartilhando', src: 'rec/ol_acervo.mp4', from: 50 },
];

export const C52_Dossie: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const capa = 1 - easeOutExpo(win(t, B.f1 - 1.2, B.f1 - 0.3));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', transform: shakeAt(t, B.carimbo + 0.5, 9) || undefined }}>
      <OLightBg />

      {/* capa do dossiê */}
      {capa > 0 && (
        <div style={{
          position: 'absolute', left: 120, right: 120, top: 360, height: 1100, zIndex: 20,
          transform: `perspective(1400px) rotateX(${(1 - capa) * -74}deg)`, transformOrigin: '50% 0%',
          background: '#e8ddc4', borderRadius: 22, boxShadow: '0 50px 120px -30px rgba(22,24,29,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30, opacity: Math.min(1, capa * 2),
        }}>
          <div style={{ border: `5px solid ${O_INK}`, borderRadius: 14, padding: '20px 44px', fontFamily: MONO, fontWeight: 700, fontSize: 46, color: O_INK, letterSpacing: 6 }}>DOSSIÊ</div>
          <div style={{ fontFamily: MONO, fontSize: 26, color: '#6b6250', letterSpacing: 2 }}>o arsenal de quem estuda com sistema</div>
          <div style={{
            transform: 'rotate(-8deg)', border: `5px double ${O_RED}`, borderRadius: 12, padding: '12px 26px',
            fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: O_RED, opacity: win(t, B.abre + 1.6, B.abre + 2.0),
          }}>ACESSO LIBERADO</div>
        </div>
      )}

      {/* fichas */}
      {FICHAS.map((f, i) => {
        const p = easeOutExpo(win(t, f.at, f.at + 0.55));
        const o = Math.min(p, 1 - win(t, f.until - 0.25, f.until + 0.15));
        if (o <= 0) return null;
        return (
          <div key={i} style={{
            position: 'absolute', left: 90, right: 90, top: 300, zIndex: 10, opacity: o,
            transform: `translateY(${(1 - p) * 160}px) rotate(${(1 - p) * (i % 2 ? 4 : -4)}deg)`,
            background: '#fffdf6', borderRadius: 20, border: '1.5px solid rgba(22,24,29,0.14)',
            boxShadow: '0 40px 100px -26px rgba(22,24,29,0.4)', padding: 34,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, borderBottom: '2px dashed #cfc7ae', paddingBottom: 18 }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: O_RED }}>FICHA {f.n}</span>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: O_INK, letterSpacing: -1 }}>{f.titulo}</span>
            </div>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: O_MUT, margin: '18px 0' }}>{f.sub}</div>
            <div style={{ width: '100%', height: 760, borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(22,24,29,0.12)', position: 'relative' }}>
              <ClipAt fromSec={f.at - 0.3}>
                <OffthreadVideo src={staticFile(f.src)} muted startFrom={f.from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </ClipAt>
              {/* clipe de papel */}
              <div style={{ position: 'absolute', right: 30, top: -16, width: 52, height: 90, border: '7px solid #9aa3ad', borderRadius: 26, borderBottom: 'none', opacity: 0.85 }} />
            </div>
          </div>
        );
      })}

      {/* carimbo final */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 24, opacity: win(t, B.carimbo, B.carimbo + 0.2) * (1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,250,250,0.92)' }} />
        <div style={{
          position: 'absolute', left: '50%', top: 700, transform: `translateX(-50%) rotate(-7deg) scale(${2.2 - 1.2 * easeOutExpo(win(t, B.carimbo + 0.15, B.carimbo + 0.5))})`,
          border: `8px double ${O_RED}`, borderRadius: 18, padding: '30px 46px', textAlign: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: O_RED, letterSpacing: 1, opacity: win(t, B.carimbo + 0.15, B.carimbo + 0.35),
        }}>
          NÃO É SEGREDO<br />DE NINGUÉM
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1160, textAlign: 'center', fontFamily: HEAD, fontWeight: 800, fontSize: 36, color: O_INK, opacity: win(t, B.disponivel, B.disponivel + 0.4) }}>
          disponível pra qualquer um — <span style={{ color: O_RED }}>teste grátis.</span>
        </div>
      </div>

      <Vignette strength={0.22} />
      <Grain opacity={0.05} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c52.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
