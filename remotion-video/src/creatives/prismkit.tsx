import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, continueRender, delayRender } from 'remotion';

/* ============================================================
   Kit prism.face — tokens e peças do sistema visual do produto
   (paleta "clínica de estética editorial", Prata + Figtree,
   arco de 180° como assinatura).
   ============================================================ */

export const AREIA = '#f7f1e8';
export const PORCELANA = '#fdfaf5';
export const LINHO = '#e9ddcc';
export const ROSA_PO = '#f2dad3';
export const ROSA = '#c9908a';
export const CAFE = '#3f352e';
export const TAUPE = '#857567';
export const SALVIA = '#a9b59f';
export const AMBAR = '#b4764f';

export const DISPLAY = "'PrataVid', Georgia, serif";
export const SANS = "'FigtreeVid', 'Inter', system-ui, sans-serif";

export const FPS = 30;
export const DELAY = 0.6;

/* fontes do próprio produto, carregadas antes do primeiro quadro */
const handle = delayRender('fontes prism.face');
if (typeof document !== 'undefined') {
  const carregar = async () => {
    const prata = new FontFace('PrataVid', `url(${staticFile('fonts/Prata-Regular.ttf')})`);
    const fig = new FontFace('FigtreeVid', `url(${staticFile('fonts/Figtree-Regular.ttf')})`);
    const figSb = new FontFace('FigtreeVid', `url(${staticFile('fonts/Figtree-SemiBold.ttf')})`, { weight: '600' });
    await Promise.all([prata.load(), fig.load(), figSb.load()]).then(fs => {
      fs.forEach(f => (document.fonts as unknown as FontFaceSet).add(f));
    });
    continueRender(handle);
  };
  carregar().catch(() => continueRender(handle));
} else {
  continueRender(handle);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const outB = (p: number) => 1 - Math.pow(1 - p, 3);
export const suave = (p: number) => p * p * (3 - 2 * p);

export const surge = (t: number, at: number, dur = 0.6): React.CSSProperties => {
  const p = outB(win(t, at, at + dur));
  return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` };
};

/* fundo do produto: areia + grão + dois halos rosa-pó */
export const FundoPrism: React.FC<{ t: number }> = ({ t }) => (
  <>
    <AbsoluteFill style={{ background: AREIA }} />
    <AbsoluteFill style={{
      background: `radial-gradient(60% 40% at ${18 + Math.sin(t * 0.12) * 4}% 12%, ${ROSA_PO}88, transparent 70%),
                   radial-gradient(55% 35% at ${82 + Math.cos(t * 0.1) * 4}% 88%, ${LINHO}aa, transparent 70%)`,
    }} />
    <AbsoluteFill style={{
      backgroundImage: 'radial-gradient(rgba(63,53,46,0.05) 1px, transparent 1px)',
      backgroundSize: '30px 30px', opacity: 0.5,
    }} />
  </>
);

/* o arco de 180° — assinatura do produto (progresso, divisor, transição) */
export const Arco: React.FC<{
  progresso: number; largura?: number; espessura?: number; cor?: string; trilha?: string;
}> = ({ progresso, largura = 300, espessura = 3, cor = ROSA, trilha = LINHO }) => {
  const h = largura / 2 + espessura;
  const r = largura / 2 - espessura;
  const d = `M ${espessura} ${h - espessura} A ${r} ${r} 0 0 1 ${largura - espessura} ${h - espessura}`;
  const comp = Math.PI * r;
  return (
    <svg width={largura} height={h} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={trilha} strokeWidth={espessura} strokeLinecap="round" />
      <path d={d} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round"
        strokeDasharray={comp} strokeDashoffset={comp * (1 - clamp01(progresso))} />
    </svg>
  );
};

/* celular com a gravação real da plataforma (tela 430×932) */
export const Celular: React.FC<{
  take: string; from?: number; largura?: number; escala?: number; desloca?: number;
}> = ({ take, from = 0, largura = 640, escala = 1, desloca = 0 }) => {
  const h = largura * (932 / 430);
  const bezel = largura * 0.022;
  return (
    <div style={{
      width: largura, height: h, borderRadius: largura * 0.105, background: CAFE,
      padding: bezel, boxShadow: `0 2px 6px rgba(63,53,46,0.10), 0 40px 90px -24px rgba(63,53,46,0.45)`,
      transform: `scale(${escala}) translateY(${desloca}px)`,
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: largura * 0.085, overflow: 'hidden',
        background: AREIA, position: 'relative',
      }}>
        {/* o take grava 430×932 CSS no canto de um quadro 860×1864:
            ampliamos 2× e ancoramos no topo-esquerdo para preencher a tela */}
        <OffthreadVideo
          src={staticFile(`takes/${take}.webm`)} muted
          startFrom={Math.round(from * FPS)}
          style={{
            position: 'absolute', left: 0, top: 0,
            width: '200%', height: `${200 * (1864 / 860) * (430 / 932)}%`,
          }}
        />
      </div>
      {/* ilha da câmera */}
      <div style={{
        position: 'absolute', top: bezel * 1.4, left: '50%', transform: 'translateX(-50%)',
        width: largura * 0.22, height: largura * 0.05, borderRadius: 999, background: '#26201b',
      }} />
    </div>
  );
};

/* rótulo de seção no estilo do produto */
export const Eyebrow: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> =
  ({ children, style }) => (
    <div style={{
      fontFamily: SANS, fontSize: 25, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: TAUPE, fontWeight: 500, ...style,
    }}>{children}</div>
  );

export const Titulo: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> =
  ({ children, size = 74, style }) => (
    <div style={{
      fontFamily: DISPLAY, fontSize: size, lineHeight: 1.14, color: CAFE, letterSpacing: '-0.01em', ...style,
    }}>{children}</div>
  );

/* chip de apoio (porcelana, sombra única do produto) */
export const Chip: React.FC<{ t: number; at: number; ate?: number; children: React.ReactNode; bottom?: number }> =
  ({ t, at, ate = 1e9, children, bottom = 88 }) => {
    if (t < at || t > ate) return null;
    const p = outB(win(t, at, at + 0.5));
    const saida = ate < 1e9 ? 1 - outB(win(t, ate - 0.4, ate)) : 1;
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center',
        opacity: p * saida, transform: `translateY(${(1 - p) * 16}px)`, zIndex: 20,
      }}>
        <div style={{
          background: PORCELANA, color: CAFE, fontFamily: SANS, fontSize: 31, fontWeight: 600,
          borderRadius: 999, padding: '20px 40px', maxWidth: 940, textAlign: 'center',
          border: `1px solid ${LINHO}`,
          boxShadow: '0 1px 2px rgba(63,53,46,0.06), 0 8px 24px rgba(63,53,46,0.06)',
        }}>{children}</div>
      </div>
    );
  };

/* transição: o arco varre a tela em rosa-pó */
export const VarreduraArco: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  if (t < at || t > at + 1.0) return null;
  const p = suave(win(t, at, at + 1.0));
  const sobe = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
  const y = 1920 * (1 - p * 2 + (p > 0.5 ? (p - 0.5) * 2 : 0));
  return (
    <AbsoluteFill style={{ zIndex: 60, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: '-20%', width: '140%', height: 2400,
        top: (p < 0.5 ? 1920 - p * 2 * 1920 : -(p - 0.5) * 2 * 1920),
        background: `linear-gradient(180deg, ${ROSA_PO} 0%, ${AREIA} 55%, ${ROSA_PO} 100%)`,
        borderRadius: '50% 50% 0 0 / 12% 12% 0 0',
        opacity: 0.96,
      }} />
      <AbsoluteFill style={{ background: AREIA, opacity: sobe * 0.15 }} />
    </AbsoluteFill>
  );
};
