import React from 'react';
import { Video, staticFile } from 'remotion';
import { theme } from '../theme';

interface PhoneMockupProps {
  width?: number;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ width = 340 }) => {
  const height = width * 2.1;
  const bezelH = width * 0.04;
  const bezelV = width * 0.07;
  const screenW = width - bezelH * 2;
  const screenH = height - bezelV * 2;
  const cornerR = width * 0.12;
  const innerR = cornerR * 0.6;

  return (
    <div style={{
      width,
      height,
      borderRadius: cornerR,
      background: 'linear-gradient(160deg, #2a2a2a 0%, #0f0f0f 60%, #1a1a1a 100%)',
      boxShadow: `
        0 0 0 1px rgba(255,255,255,0.08),
        0 40px 120px rgba(0,0,0,0.9),
        0 0 60px rgba(239,68,68,0.15),
        inset 0 1px 0 rgba(255,255,255,0.12)
      `,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Side buttons */}
      <div style={{
        position: 'absolute',
        left: -4,
        top: height * 0.22,
        width: 4,
        height: width * 0.08,
        borderRadius: '2px 0 0 2px',
        background: 'linear-gradient(to bottom, #333, #222)',
      }} />
      <div style={{
        position: 'absolute',
        left: -4,
        top: height * 0.32,
        width: 4,
        height: width * 0.12,
        borderRadius: '2px 0 0 2px',
        background: 'linear-gradient(to bottom, #333, #222)',
      }} />
      <div style={{
        position: 'absolute',
        left: -4,
        top: height * 0.46,
        width: 4,
        height: width * 0.12,
        borderRadius: '2px 0 0 2px',
        background: 'linear-gradient(to bottom, #333, #222)',
      }} />
      <div style={{
        position: 'absolute',
        right: -4,
        top: height * 0.32,
        width: 4,
        height: width * 0.18,
        borderRadius: '0 2px 2px 0',
        background: 'linear-gradient(to bottom, #333, #222)',
      }} />

      {/* Screen */}
      <div style={{
        width: screenW,
        height: screenH,
        borderRadius: innerR,
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
      }}>
        {/* Video inside screen */}
        <Video
          src={staticFile('drive-preview.mp4')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          volume={0}
          startFrom={0}
        />

        {/* Screen glare overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)`,
          pointerEvents: 'none',
          borderRadius: innerR,
        }} />

        {/* Top notch / Dynamic Island */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: screenW * 0.28,
          height: 28,
          borderRadius: 14,
          background: '#000',
          zIndex: 10,
        }} />
      </div>

      {/* Phone glow reflection on bottom */}
      <div style={{
        position: 'absolute',
        bottom: -2,
        left: '10%',
        right: '10%',
        height: 2,
        background: `linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)`,
        filter: 'blur(4px)',
      }} />
    </div>
  );
};
