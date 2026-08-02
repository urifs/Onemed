import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { MedufBg, MEndCard, M_BLUE, M_DEEP, M_NAVY, M_MUT, M_GREEN, M_RED, M_BG, WHITE } from './meduf';
import timing from './timings/m10.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M10_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  mi35: DELAY + 0.1,
  pubmed: DELAY + 2.48,
  amanha: DELAY + 4.57,
  todoDia: DELAY + 6.72,
  lendo: DELAY + 8.97,
  anos66: DELAY + 11.1,
  tempo: DELAY + 13.03,
  minutos: DELAY + 14.86,
  naoFecha: DELAY + 16.17,
  nunca: DELAY + 18.22,
  muda: DELAY + 19.88,
  tres: DELAY + 22.05,
  gpt: DELAY + 23.33,
  claude: DELAY + 24.26,
  gemini: DELAY + 24.9,
  mesma: DELAY + 26.18,
  concordam: DELAY + 28.83,
  divergem: DELAY + 31.39,
  consenso: DELAY + 33.68,
  seg: DELAY + 34.67,
  f17: DELAY + 36.09,
  valida: DELAY + 38.28,
  sempre: DELAY + 40.69,
  k10: DELAY + 42.03,
  e27: DELAY + 43.96,
  nota: DELAY + 45.96,
  fecha: DELAY + 48.11,
  duvida: DELAY + 50.11,
  prova: DELAY + 51.39,
  end: DELAY + T.duration - 3.2,
};

/* slam tipográfico: corte seco + assentamento */
const Slam: React.FC<{
  t: number; from: number; to: number;
  invert?: boolean; blue?: boolean;
  children: React.ReactNode;
  top?: number;
}> = ({ t, from, to, invert, blue, children, top = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (t < from || t >= to) return null;
  const lf = frame - Math.round(from * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 13, stiffness: 190 }, from: 1.12, to: 1 });
  const bg = invert ? M_NAVY : blue ? M_BLUE : 'transparent';
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {(invert || blue) && <div style={{ position: 'absolute', inset: 0, background: bg }} />}
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${s}) translateY(${top}px)`,
        textAlign: 'center',
      }}>
        {children}
      </div>
    </div>
  );
};

const Big: React.FC<{ size?: number; color?: string; children: React.ReactNode }> = ({ size = 110, color = M_NAVY, children }) => (
  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color, letterSpacing: -3, lineHeight: 1.08 }}>{children}</div>
);
const Sub: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = M_MUT, children }) => (
  <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color, marginTop: 22 }}>{children}</div>
);

/* metrônomo no topo: pontos que acendem no ritmo */
const Ticker: React.FC<{ t: number }> = ({ t }) => {
  const n = Math.floor(((t - DELAY) / (T.duration)) * 24);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 200, display: 'flex', justifyContent: 'center', gap: 10, zIndex: 5 }}>
      {[...Array(24)].map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: 999,
          background: i <= n ? M_BLUE : 'rgba(14,27,51,0.12)',
        }} />
      ))}
    </div>
  );
};

export const M10_Conta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;
  // contador do 35 milhões
  const cnt = Math.round(35000000 * Math.min(1, Math.max(0, (t - B.mi35) / 1.6)) ** 0.5);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <Ticker t={t} />

      <Slam t={t} from={B.mi35} to={B.amanha}>
        <Big size={124}>{cnt.toLocaleString('pt-BR')}</Big>
        <Sub>artigos no PubMed. hoje.</Sub>
      </Slam>

      <Slam t={t} from={B.amanha} to={B.lendo}>
        <Big size={96}>amanhã... <span style={{ color: M_BLUE }}>tem mais.</span></Big>
        <Sub>todo dia, tem mais.</Sub>
      </Slam>

      <Slam t={t} from={B.lendo} to={B.tempo}>
        <Big size={150} color={M_BLUE}>66 anos</Big>
        <Sub>lendo um por minuto, sem dormir</Sub>
      </Slam>

      <Slam t={t} from={B.tempo} to={B.naoFecha}>
        <Big size={92}>seu tempo por paciente:<br /><span style={{ color: M_BLUE }}>minutos.</span></Big>
      </Slam>

      <Slam t={t} from={B.naoFecha} to={B.muda} invert>
        <Big size={104} color={WHITE}>ESSA CONTA<br /><span style={{ color: '#ff8a80' }}>NÃO FECHA.</span></Big>
        <Sub color="rgba(255,255,255,0.6)">nunca fechou.</Sub>
      </Slam>

      <Slam t={t} from={B.muda} to={B.tres}>
        <Big size={110}>então...<br /><span style={{ color: M_BLUE }}>muda a conta.</span></Big>
      </Slam>

      <Slam t={t} from={B.tres} to={B.mesma}>
        <div style={{ display: 'flex', gap: 22 }}>
          {[['GPT', B.gpt], ['Claude', B.claude], ['Gemini', B.gemini]].map(([n, at]) => (
            <div key={n as string} style={{
              opacity: t >= (at as number) ? 1 : 0,
              background: WHITE, borderRadius: 22, padding: '30px 34px',
              boxShadow: '0 24px 60px -18px rgba(14,27,51,0.3)',
              fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: M_NAVY,
            }}>{n}</div>
          ))}
        </div>
        <Sub>três inteligências. a mesma pergunta.</Sub>
      </Slam>

      <Slam t={t} from={B.mesma} to={B.consenso}>
        <Big size={78}>
          <span style={{ color: M_GREEN, opacity: t >= B.concordam ? 1 : 0.25 }}>✓ onde concordam</span>
          <br />
          <span style={{ color: '#b45309', opacity: t >= B.divergem ? 1 : 0.25 }}>⚠ onde divergem</span>
        </Big>
        <Sub>você vê os dois.</Sub>
      </Slam>

      <Slam t={t} from={B.consenso} to={B.f17} blue>
        <Big size={104} color={WHITE}>consenso.<br />em segundos.</Big>
      </Slam>

      <Slam t={t} from={B.f17} to={B.valida}>
        <Big size={190} color={M_BLUE}>17</Big>
        <Sub>ferramentas clínicas</Sub>
      </Slam>

      <Slam t={t} from={B.valida} to={B.k10}>
        <Big size={90}>quem valida e decide<br /><span style={{ color: M_BLUE }}>é você. sempre.</span></Big>
      </Slam>

      <Slam t={t} from={B.k10} to={B.fecha}>
        <Big size={92}>
          <span style={{ opacity: t >= B.k10 ? 1 : 0 }}>10.000 médicos</span><br />
          <span style={{ color: M_BLUE, opacity: t >= B.e27 ? 1 : 0 }}>27 estados</span><br />
          <span style={{ fontSize: 72, opacity: t >= B.nota ? 1 : 0 }}>★ 4.9</span>
        </Big>
      </Slam>

      <Slam t={t} from={B.fecha} to={B.duvida} invert>
        <Big size={104} color={WHITE}>AGORA A CONTA<br /><span style={{ color: '#7db4ff' }}>FECHA.</span></Big>
      </Slam>

      <Slam t={t} from={B.duvida} to={B.end + 1.2}>
        <Big size={84}>duvida?</Big>
        <Sub color={M_NAVY}>a prova leva <b style={{ color: M_BLUE }}>30 minutos</b>. grátis.</Sub>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: M_BLUE, marginTop: 26 }}>meduf.com.br</div>
      </Slam>

      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m10.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
