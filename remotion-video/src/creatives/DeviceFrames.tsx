import React from 'react';
import { OffthreadVideo, staticFile } from 'remotion';
import { BG } from './theme';

/** Barra de status iOS falsa (desenhada, sem marca). dark = ícones escuros p/ apps claros */
const StatusBar: React.FC<{ width: number; dark?: boolean }> = ({ width, dark }) => {
  const s = width / 390;
  const C = dark ? '#0e1b33' : '#fff';
  const C5 = dark ? 'rgba(14,27,51,.5)' : 'rgba(255,255,255,.5)';
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 44 * s,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `0 ${26 * s}px`, zIndex: 5, pointerEvents: 'none',
    }}>
      <span style={{
        fontFamily: "-apple-system,'Inter',sans-serif", fontWeight: 600,
        fontSize: 15 * s, color: C, letterSpacing: 0.2,
      }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s }}>
        {/* sinal */}
        <svg width={17 * s} height={11 * s} viewBox="0 0 17 11" fill={C}>
          <rect x="0" y="7" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
        </svg>
        {/* wifi */}
        <svg width={16 * s} height={11 * s} viewBox="0 0 16 11" fill={C}>
          <path d="M8 9.5 L9.8 7.6 A2.8 2.8 0 0 0 6.2 7.6 Z" />
          <path d="M4.2 5.6 A5.6 5.6 0 0 1 11.8 5.6 L10.4 7 A3.7 3.7 0 0 0 5.6 7 Z" opacity=".9" />
          <path d="M1.6 3 A9.2 9.2 0 0 1 14.4 3 L13 4.4 A7.2 7.2 0 0 0 3 4.4 Z" opacity=".8" />
        </svg>
        {/* bateria */}
        <svg width={25 * s} height={12 * s} viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke={C5} />
          <rect x="2" y="2" width="15" height="8" rx="1.6" fill={C} />
          <rect x="22.5" y="3.5" width="2" height="5" rx="1" fill={C5} />
        </svg>
      </div>
    </div>
  );
};

/**
 * iPhone com dynamic island. width = largura EXTERNA. Proporção de tela 390:844.
 * startFrom em frames do vídeo-fonte (30fps).
 */
export const PhoneFrame: React.FC<{
  src: string;
  width: number;
  startFrom?: number;
  muted?: boolean;
  style?: React.CSSProperties;
  statusDark?: boolean;
}> = ({ src, width, startFrom = 0, style, statusDark }) => {
  const bezel = width * 0.032;
  const screenW = width - bezel * 2;
  const screenH = screenW * (844 / 390);
  const r = width * 0.155;
  return (
    <div style={{
      position: 'relative', width, height: screenH + bezel * 2,
      background: 'linear-gradient(145deg,#3a3d44,#17181c 55%,#2b2d33)',
      borderRadius: r,
      boxShadow: '0 40px 90px -28px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 2px rgba(255,255,255,0.25)',
      ...style,
    }}>
      {/* botões laterais */}
      <div style={{ position: 'absolute', left: -width * 0.008, top: '22%', width: width * 0.008, height: '7%', background: '#2a2c31', borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: -width * 0.008, top: '31%', width: width * 0.008, height: '7%', background: '#2a2c31', borderRadius: 4 }} />
      <div style={{ position: 'absolute', right: -width * 0.008, top: '25%', width: width * 0.008, height: '11%', background: '#2a2c31', borderRadius: 4 }} />
      <div style={{
        position: 'absolute', left: bezel, top: bezel, width: screenW, height: screenH,
        borderRadius: r - bezel, overflow: 'hidden', background: BG,
      }}>
        <OffthreadVideo
          src={staticFile(src)}
          muted
          startFrom={startFrom}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <StatusBar width={screenW} dark={statusDark} />
        {/* dynamic island */}
        <div style={{
          position: 'absolute', top: screenW * 0.028, left: '50%', transform: 'translateX(-50%)',
          width: screenW * 0.30, height: screenW * 0.088, borderRadius: 999, background: '#000',
          zIndex: 6,
        }} />
        {/* home indicator */}
        <div style={{
          position: 'absolute', bottom: screenW * 0.02, left: '50%', transform: 'translateX(-50%)',
          width: screenW * 0.36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.8)',
          zIndex: 6,
        }} />
        {/* reflexo sutil */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none',
          background: 'linear-gradient(115deg, rgba(255,255,255,0.07) 0%, transparent 28%)',
        }} />
      </div>
    </div>
  );
};

/** MacBook-like. width = largura externa da tela; proporção 1512:850. */
export const LaptopFrame: React.FC<{
  src: string;
  width: number;
  startFrom?: number;
  style?: React.CSSProperties;
}> = ({ src, width, startFrom = 0, style }) => {
  const bezel = width * 0.018;
  const screenW = width - bezel * 2;
  const screenH = screenW * (850 / 1512);
  const deckH = width * 0.032;
  return (
    <div style={{ position: 'relative', width, ...style }}>
      <div style={{
        position: 'relative', width, height: screenH + bezel * 2,
        background: 'linear-gradient(160deg,#2c2e33,#101114)',
        borderRadius: width * 0.022,
        boxShadow: '0 46px 100px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        <div style={{
          position: 'absolute', left: bezel, top: bezel, width: screenW, height: screenH,
          borderRadius: width * 0.012, overflow: 'hidden', background: BG,
        }}>
          <OffthreadVideo
            src={staticFile(src)}
            muted
            startFrom={startFrom}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(115deg, rgba(255,255,255,0.06) 0%, transparent 30%)',
          }} />
        </div>
        {/* webcam */}
        <div style={{
          position: 'absolute', top: bezel * 0.32, left: '50%', transform: 'translateX(-50%)',
          width: 5, height: 5, borderRadius: '50%', background: '#0a0a0a',
          boxShadow: 'inset 0 0 1.5px rgba(90,140,255,0.8)',
        }} />
      </div>
      {/* base/teclado */}
      <div style={{
        width: width * 1.14, height: deckH, margin: `0 ${-width * 0.07}px`,
        background: 'linear-gradient(180deg,#3a3c42,#1b1c20 60%,#0c0d0f)',
        borderRadius: `0 0 ${deckH * 0.9}px ${deckH * 0.9}px`,
        boxShadow: '0 18px 40px -14px rgba(0,0,0,0.8)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: width * 0.135, height: deckH * 0.42,
          background: 'linear-gradient(180deg,#101114,#232529)',
          borderRadius: `0 0 ${deckH * 0.5}px ${deckH * 0.5}px`,
        }} />
      </div>
    </div>
  );
};

/** iPad-like retrato. width externa; proporção de tela 834:1112. */
export const TabletFrame: React.FC<{
  src: string;
  width: number;
  startFrom?: number;
  style?: React.CSSProperties;
}> = ({ src, width, startFrom = 0, style }) => {
  const bezel = width * 0.045;
  const screenW = width - bezel * 2;
  const screenH = screenW * (1112 / 834);
  return (
    <div style={{
      position: 'relative', width, height: screenH + bezel * 2,
      background: 'linear-gradient(150deg,#35373d,#141518 60%,#26282d)',
      borderRadius: width * 0.075,
      boxShadow: '0 40px 90px -28px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', left: bezel, top: bezel, width: screenW, height: screenH,
        borderRadius: width * 0.038, overflow: 'hidden', background: BG,
      }}>
        <OffthreadVideo
          src={staticFile(src)}
          muted
          startFrom={startFrom}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(115deg, rgba(255,255,255,0.06) 0%, transparent 30%)',
        }} />
      </div>
      <div style={{
        position: 'absolute', top: bezel * 0.4, left: '50%', transform: 'translateX(-50%)',
        width: 6, height: 6, borderRadius: '50%', background: '#0a0a0a',
        boxShadow: 'inset 0 0 1.5px rgba(90,140,255,0.7)',
      }} />
    </div>
  );
};
