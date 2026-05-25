import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  OffthreadVideo,
  staticFile,
  Series,
} from 'remotion';

export const TIKTOK_DURATION = 810; // 27 s @ 30 fps

// ── Constants ─────────────────────────────────────────────────────────────
const BLACK = '#050505';
const RED   = '#ef4444';
const WHITE = '#ffffff';

// Drive video (576×1280) scaled to fill 1080px wide
const VID_W = 1080;
const VID_H = Math.round(1280 * (1080 / 576)); // 2400
// We show the top CLIP_H pixels of the scaled video
const CLIP_H = 960; // top 50% of 1920

// Caption vertical center
const CAP_Y = 1080;

// TikTok-style caption shadow (thick black outline)
const OUTLINE = [
  '-4px -4px 0 #000', '4px -4px 0 #000', '-4px 4px 0 #000', '4px 4px 0 #000',
  '-4px 0 0 #000', '4px 0 0 #000', '0 -4px 0 #000', '0 4px 0 #000',
  '-2px -2px 0 #000', '2px -2px 0 #000', '-2px 2px 0 #000', '2px 2px 0 #000',
].join(',');

function c01(x: number) { return Math.max(0, Math.min(1, x)); }
function easeOut(t: number) { return 1 - (1 - t) * (1 - t); }

// ── Caption component ─────────────────────────────────────────────────────
// Bold uppercase white text with thick black outline — reels/TikTok style
const Cap: React.FC<{
  lines: string[];
  frame: number;
  inF?: number;
  outF?: number;
  totalF?: number;
  size?: number;
}> = ({ lines, frame, inF = 0, outF, totalF, size = 56 }) => {
  const end = outF ?? totalF ?? 9999;
  const op = interpolate(frame, [inF, inF + 10, end - 10, end], [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute',
      top: CAP_Y - (lines.length * size * 1.2) / 2,
      left: 52, right: 52,
      textAlign: 'center',
      opacity: op,
    }}>
      {lines.map((line, i) => (
        <p key={i} style={{
          fontFamily: "'Outfit','Arial Black',Arial,sans-serif",
          fontSize: size,
          fontWeight: 900,
          color: WHITE,
          textTransform: 'uppercase',
          margin: '0 0 6px',
          lineHeight: 1.15,
          letterSpacing: '1.5px',
          textShadow: OUTLINE,
        }}>{line}</p>
      ))}
    </div>
  );
};

// ── Course cards for the hook scene ──────────────────────────────────────
const CARDS = [
  { title: 'Estratégia Med',    sub: '20 cursos · Residência',    x: 48,  y: 48,  rot: -9,  dir: 'top'   },
  { title: 'PS Zerado',         sub: 'Emergência e Trauma',       x: 110, y: 195, rot: 14,  dir: 'right' },
  { title: 'HardWork Medicina', sub: 'Revalida INEP Sprint',      x: 24,  y: 342, rot: -16, dir: 'left'  },
  { title: 'Medway',            sub: 'Residência médica',         x: 146, y: 486, rot: 8,   dir: 'right' },
  { title: 'MedGrupo / Afya',  sub: 'Questões e simulados',      x: 60,  y: 628, rot: -6,  dir: 'left'  },
  { title: 'Livros (5.000+)',   sub: 'Medicina · Especialidades', x: 115, y: 770, rot: 19,  dir: 'bottom'},
];

const CourseCard: React.FC<{
  title: string; sub: string; x: number; y: number; rot: number; dir: string;
  frame: number; delay: number; fps: number;
}> = ({ title, sub, x, y, rot, dir, frame, delay, fps }) => {
  const sc  = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 85 }, from: 0, to: 1 });
  const op  = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const OFFSETS: Record<string, [number, number]> = {
    top: [0, -180], bottom: [0, 140], left: [-200, 0], right: [200, 0],
  };
  const [dx, dy] = OFFSETS[dir] ?? [0, -120];
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width: 448, height: 76,
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'rgba(16,16,16,0.94)',
      border: '1px solid rgba(239,68,68,0.28)',
      borderRadius: 14,
      padding: '0 18px',
      opacity: op,
      transform: `translateX(${dx * (1 - sc)}px) translateY(${dy * (1 - sc)}px) rotate(${rot}deg)`,
      boxShadow: '0 12px 40px rgba(0,0,0,0.85), 0 0 0 0.5px rgba(255,255,255,0.06)',
    }}>
      {/* Red icon */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {/* Graduation cap */}
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill={RED} opacity="0.9"/>
          <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill={RED}/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 19, fontWeight: 700, color: WHITE, lineHeight: 1 }}>{title}</div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.48)', marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1 — Hook / Problem  (local 0–150 f)
// Scattered course cards + question caption
// ═══════════════════════════════════════════════════════════════════════════
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {/* Cards */}
      {CARDS.map((c, i) => (
        <CourseCard key={c.title} {...c} frame={frame} delay={i * 9} fps={fps} />
      ))}

      {/* Question caption — appears after cards settle */}
      <Cap
        lines={['Você ainda busca', 'conteúdo médico', 'em vários lugares?']}
        frame={frame}
        inF={72}
        outF={150}
        size={52}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2 — Reveal  (local 0–120 f)
// ═══════════════════════════════════════════════════════════════════════════
const SceneReveal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Cap
      lines={['Olha só o que', 'o OneMed reuniu', 'pra você']}
      frame={frame}
      inF={18}
      outF={120}
      size={56}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3 — Courses  (local 0–150 f) — two caption slots
// ═══════════════════════════════════════════════════════════════════════════
const SceneCourses: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Cap lines={['+530 cursos', 'completos']}            frame={frame} inF={6}  outF={80}  size={64} />
      <Cap lines={['das maiores', 'plataformas do Brasil']} frame={frame} inF={85} outF={150} size={56} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4 — Library  (local 0–150 f)
// ═══════════════════════════════════════════════════════════════════════════
const SceneLibrary: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Cap lines={['Residência · Revalida', 'Internato · Básico']} frame={frame} inF={6}  outF={80}  size={52} />
      <Cap lines={['Tudo no', 'seu Google Drive']}                  frame={frame} inF={85} outF={150} size={60} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5 — Social proof  (local 0–120 f)
// ═══════════════════════════════════════════════════════════════════════════
const SceneSocial: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Cap lines={['+10.000 médicos', 'já acessam']}         frame={frame} inF={8}  outF={65}  size={58} />
      <Cap lines={['sem aplicativo,', 'sem mensalidade']}    frame={frame} inF={70} outF={120} size={52} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 6 — CTA  (local 0–120 f)
// ═══════════════════════════════════════════════════════════════════════════
const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Red animated background pulse
  const pulse = Math.sin(frame * 0.10) * 0.08 + 0.16;

  const ctaOp  = interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOp  = interpolate(frame, [50, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const trialOp = interpolate(frame, [30, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <>
      {/* Radial red glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 900px 600px at 50% 55%, rgba(239,68,68,0.22) 0%, transparent 65%)',
        opacity: pulse,
      }} />

      {/* "EXPERIMENTE 30 MIN GRÁTIS" */}
      <div style={{
        position: 'absolute', top: CAP_Y - 130, left: 52, right: 52,
        textAlign: 'center', opacity: ctaOp,
      }}>
        <p style={{
          fontFamily: "'Outfit','Arial Black',Arial,sans-serif",
          fontSize: 62, fontWeight: 900, color: WHITE,
          textTransform: 'uppercase', margin: 0, lineHeight: 1.1,
          letterSpacing: '1px', textShadow: OUTLINE,
        }}>
          Experimente
        </p>
        <p style={{
          fontFamily: "'Outfit','Arial Black',Arial,sans-serif",
          fontSize: 62, fontWeight: 900, color: RED,
          textTransform: 'uppercase', margin: '4px 0 0',
          lineHeight: 1.1, letterSpacing: '1px', textShadow: OUTLINE,
        }}>
          30 min grátis
        </p>
      </div>

      {/* Trial badge */}
      <div style={{
        position: 'absolute', top: CAP_Y + 120, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: trialOp,
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1.5px solid rgba(239,68,68,0.45)',
          borderRadius: 100, padding: '12px 44px',
        }}>
          <span style={{
            fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 700, color: RED,
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}>
            Sem cartão · Acesso imediato
          </span>
        </div>
      </div>

      {/* URL */}
      <div style={{
        position: 'absolute', top: CAP_Y + 240, left: 0, right: 0,
        textAlign: 'center', opacity: urlOp,
      }}>
        <p style={{
          fontFamily: "'Outfit',monospace,sans-serif",
          fontSize: 32, fontWeight: 700, color: WHITE,
          textShadow: OUTLINE, margin: 0, letterSpacing: '1.5px',
        }}>
          onemedcursos.com.br
        </p>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT — drive video fills top CLIP_H px, black below; dark overlay
// controlled per scene so video reveals/hides smoothly
// ═══════════════════════════════════════════════════════════════════════════
export const OneMedTiktok: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene boundaries (global frames):
  // 0-150:   SceneHook   (no video)
  // 150-270: SceneReveal (video fades in)
  // 270-420: SceneCourses
  // 420-570: SceneLibrary
  // 570-690: SceneSocial
  // 690-810: SceneCTA     (no video)
  const darkOverlayOp = interpolate(
    frame,
    [0, 148, 168, 682, 700, 810],
    [1.0, 1.0, 0.08, 0.08, 1.0, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Slow vertical scroll of drive video (drift down 40px over 27s)
  const videoScrollY = interpolate(frame, [150, 690], [0, 40], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BLACK, overflow: 'hidden' }}>

      {/* ── Drive video — clipped to top CLIP_H pixels ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CLIP_H, overflow: 'hidden' }}>
        <OffthreadVideo
          src={staticFile('drive-preview.mp4')}
          style={{
            position: 'absolute',
            width: VID_W,
            height: VID_H,
            top: -videoScrollY,
            left: 0,
          }}
        />
      </div>

      {/* ── Gradient: content area fades to black ── */}
      <div style={{
        position: 'absolute',
        top: CLIP_H - 240,
        left: 0, right: 0, height: 240,
        background: `linear-gradient(to bottom, transparent, ${BLACK})`,
        pointerEvents: 'none',
      }} />

      {/* ── Dark overlay — hides video during hook/CTA scenes ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: CLIP_H,
        background: BLACK,
        opacity: darkOverlayOp,
      }} />

      {/* ── Red top accent bar (always visible) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: RED,
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }} />

      {/* ── Scene content via Series ── */}
      <Series>
        <Series.Sequence durationInFrames={150}>
          <SceneHook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <SceneReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneCourses />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneLibrary />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <SceneSocial />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <SceneCTA />
        </Series.Sequence>
      </Series>

    </AbsoluteFill>
  );
};
