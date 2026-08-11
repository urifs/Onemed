import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { OLightBg, OLEndCard, OLogo, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo, FlashCut } from './cine';
import timing from './timings/c50.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C50_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  tarjada: DELAY + 1.8,
  p1: DELAY + 7.1, j1: DELAY + 11.0,
  p2: DELAY + 16.5, j2: DELAY + 19.6,
  p3: DELAY + 27.0, j3: DELAY + 30.1,
  adivinha: DELAY + 34.1, nums: DELAY + 36.0,
  reveal: DELAY + 40.5,
  refazer: DELAY + 43.2,
  end: DELAY + T.duration - 3.2,
};

/* janelinha-spotlight sobre a tela tarjada */
const Janela: React.FC<{ t: number; at: number; until: number; x: number; y: number; w: number; h: number; src: string; from: number; label: string }> =
({ t, at, until, x, y, w, h, src, from, label }) => {
  const p = easeOutExpo(win(t, at, at + 0.5));
  const o = Math.min(p, 1 - win(t, until, until + 0.4));
  if (o <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h * p + 4, zIndex: 12,
      borderRadius: 22, overflow: 'hidden', border: `4px solid ${O_RED}`, opacity: o,
      boxShadow: '0 30px 80px -20px rgba(224,45,45,0.5)',
    }}>
      <div style={{ position: 'absolute', left: -x + 190, top: -y + 330, width: 700, height: 1260 }}>
        <ClipAt fromSec={at - 0.3}>
          <OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </ClipAt>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(224,45,45,0.92)', padding: '8px 16px', fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: WHITE }}>{label}</div>
    </div>
  );
};

const Pergunta: React.FC<{ t: number; at: number; until: number; n: number; txt: string }> = ({ t, at, until, n, txt }) => {
  const o = Math.min(win(t, at, at + 0.4), 1 - win(t, until, until + 0.35));
  if (o <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: 70, top: 240, zIndex: 16, opacity: o,
      transform: `translateY(${(1 - easeOutExpo(win(t, at, at + 0.5))) * -30}px)`,
      background: WHITE, border: '2px solid rgba(22,24,29,0.12)', borderRadius: 20, padding: '20px 30px',
      boxShadow: '0 18px 46px -16px rgba(22,24,29,0.3)',
      display: 'flex', alignItems: 'center', gap: 18,
    }}>
      <span style={{ width: 52, height: 52, borderRadius: 999, background: O_INK, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 26 }}>{n}</span>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: O_INK }}>{txt}</span>
    </div>
  );
};

export const C50_TesteCego: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const revealP = easeOutExpo(win(t, B.reveal, B.reveal + 0.8));
  const tarjaOp = 1 - revealP;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* “plataforma tarjada”: tela real coberta */}
      <div style={{ position: 'absolute', left: 190, top: 330, width: 700, height: 1260, borderRadius: 40, overflow: 'hidden', border: '2px solid rgba(22,24,29,0.14)', boxShadow: '0 50px 120px -30px rgba(22,24,29,0.4)' }}>
        <ClipAt fromSec={0.2}>
          <OffthreadVideo src={staticFile('rec/ol_dash.mp4')} muted startFrom={40} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </ClipAt>
        {/* tarja */}
        <div style={{
          position: 'absolute', inset: 0, background: '#101216', opacity: tarjaOp,
          transform: `translateY(${revealP * -1300}px)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 22,
        }}>
          <div style={{ border: `3px dashed ${WHITE}`, borderRadius: 18, padding: '20px 40px', fontFamily: MONO, fontWeight: 700, fontSize: 40, color: WHITE, letterSpacing: 3 }}>
            MATERIAL ?
          </div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: '#8b93a0' }}>identidade sob tarja</div>
        </div>
      </div>

      {/* perguntas + janelinhas */}
      <Pergunta t={t} at={B.p1} until={B.p2 - 0.4} n={1} txt="acha qualquer assunto em quantos toques?" />
      <Janela t={t} at={B.j1} until={B.p2 - 0.4} x={250} y={620} w={580} h={420} src="rec/ol_acervo.mp4" from={160} label="uma busca só → aula, livro e questão" />
      <Pergunta t={t} at={B.p2} until={B.p3 - 0.4} n={2} txt="tem revisão ativa?" />
      <Janela t={t} at={B.j2} until={B.p3 - 0.4} x={250} y={560} w={580} h={400} src="rec/ol_flash.mp4" from={180} label="flashcards do próprio material" />
      <Janela t={t} at={B.j2 + 3.6} until={B.p3 - 0.4} x={300} y={1010} w={580} h={380} src="rec/ol_quest.mp4" from={210} label="questões com resposta comentada" />
      <Pergunta t={t} at={B.p3} until={B.adivinha - 0.3} n={3} txt="atualiza sozinho?" />
      <Janela t={t} at={B.j3} until={B.adivinha - 0.3} x={250} y={640} w={580} h={360} src="rec/ol_dash.mp4" from={140} label="atualizações sem custo" />

      {/* números antes do reveal */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center', zIndex: 18, opacity: Math.min(win(t, B.nums, B.nums + 0.4), 1 - win(t, B.reveal, B.reveal + 0.3)) }}>
        <span style={{ background: O_INK, color: WHITE, borderRadius: 999, padding: '14px 34px', fontFamily: HEAD, fontWeight: 900, fontSize: 30 }}>
          +530 cursos · +9.000 livros… já dá pra adivinhar?
        </span>
      </div>

      {/* reveal */}
      <FlashCut t={t} atSec={B.reveal + 0.35} color="rgba(255,255,255,0.7)" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', zIndex: 20, opacity: win(t, B.reveal + 0.4, B.reveal + 0.8) }}>
        <div style={{ transform: `scale(${0.8 + 0.2 * easeOutExpo(win(t, B.reveal + 0.4, B.reveal + 1))})` }}>
          <OLogo size={92} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 1620, textAlign: 'center', zIndex: 20, opacity: win(t, B.refazer, B.refazer + 0.4) * (1 - win(t, B.end + 0.4, B.end + 0.9)) }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: O_INK }}>
          refaz o teste <span style={{ color: O_RED }}>de olhos bem abertos.</span>
        </span>
      </div>

      <Vignette strength={0.22} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1760} size={50} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c50.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
