import React from 'react';
import { AbsoluteFill } from 'remotion';
import { HEAD, BODY, MONO } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';

/* ===== N01–N20: posts informativos de feed MEDUF 1080×1350 — sem emojis ===== */

export type MPost = {
  id: string;
  theme: 'light' | 'dark';
  layout: 'lista' | 'passos' | 'duascolunas' | 'checklist' | 'fluxo' | 'bigstat' | 'mito_verdade';
  kicker: string;
  headline: string;
  sub: string;
  items: string[];
  takeaway: string;
};

const PAL = {
  light: { bg: '#f6f8fc', ink: '#0e1b33', mut: '#5b6b85', card: '#ffffff', line: 'rgba(14,27,51,0.12)', shadow: 'rgba(14,27,51,0.16)', soft: '#e8f0fe' },
  dark: { bg: '#0a1122', ink: '#eaf0fb', mut: '#8ea0bd', card: '#131c31', line: 'rgba(255,255,255,0.12)', shadow: 'rgba(0,0,0,0.55)', soft: '#16233d' },
};

const Bg: React.FC<{ t: 'light' | 'dark' }> = ({ t }) => {
  const p = PAL[t];
  return (
    <div style={{ position: 'absolute', inset: 0, background: p.bg }}>
      <div style={{
        position: 'absolute', width: 1100, height: 1100, borderRadius: 999, top: -380, right: -320,
        background: `radial-gradient(circle, rgba(21,96,232,${t === 'dark' ? 0.20 : 0.12}), transparent 63%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: t === 'dark' ? 0.4 : 0.55,
        backgroundImage: `radial-gradient(${t === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(14,27,51,0.07)'} 1.4px, transparent 1.4px)`,
        backgroundSize: '46px 46px',
      }} />
    </div>
  );
};

const Hl: React.FC<{ text: string; color: string; size: number }> = ({ text, color, size }) => (
  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color, letterSpacing: -2, lineHeight: 1.14 }}>
    {text.split(/(\*[^*]+\*)/g).map((s, i) => s.startsWith('*')
      ? <span key={i} style={{ color: M_BLUE }}>{s.slice(1, -1)}</span>
      : <span key={i}>{s}</span>)}
  </div>
);

const Card: React.FC<{ p: typeof PAL.light; children: React.ReactNode; pad?: string }> = ({ p, children, pad = '22px 28px' }) => (
  <div style={{
    background: p.card, border: `1.5px solid ${p.line}`, borderRadius: 18, padding: pad,
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 20,
    boxShadow: `0 12px 30px -14px ${p.shadow}`,
    fontFamily: HEAD, fontWeight: 700, fontSize: 28, color: p.ink, lineHeight: 1.32,
  }}>{children}</div>
);

const Body: React.FC<{ post: MPost }> = ({ post }) => {
  const p = PAL[post.theme];
  const it = post.items;

  if (post.layout === 'lista') {
    return (
      <>{it.map((x, i) => (
        <Card key={i} p={p}>
          <span style={{
            width: 12, height: 12, borderRadius: 3, background: M_BLUE, flexShrink: 0,
            transform: 'rotate(45deg)',
          }} />
          {x.replace(/^[^|]*\|/, '').trim()}
        </Card>
      ))}</>
    );
  }

  if (post.layout === 'passos') {
    return (
      <>{it.map((x, i) => (
        <Card key={i} p={p}>
          <span style={{
            width: 46, height: 46, borderRadius: 12, background: M_BLUE, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 24, color: WHITE,
          }}>{i + 1}</span>
          {x.replace(/^[^|]*\|/, '').trim()}
        </Card>
      ))}</>
    );
  }

  if (post.layout === 'checklist') {
    return (
      <>{it.map((x, i) => (
        <Card key={i} p={p}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, border: `3px solid ${M_BLUE}`, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path d="M4 12.5l5.5 5.5L20 7" stroke={M_BLUE} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {x.replace(/^[^|]*\|/, '').trim()}
        </Card>
      ))}</>
    );
  }

  if (post.layout === 'fluxo') {
    return (
      <div style={{ paddingLeft: 30, paddingRight: 30 }}>
        {it.map((x, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
                <svg width={22} height={30} viewBox="0 0 22 30" fill="none">
                  <path d="M11 1v22M4 17l7 7 7-7" stroke={M_BLUE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div style={{
              background: i === it.length - 1 ? M_BLUE : p.card,
              border: `1.5px solid ${i === it.length - 1 ? M_BLUE : p.line}`, borderRadius: 18,
              padding: '22px 28px', textAlign: 'center',
              boxShadow: i === it.length - 1 ? '0 16px 40px -14px rgba(21,96,232,0.5)' : `0 12px 30px -14px ${p.shadow}`,
              fontFamily: HEAD, fontWeight: 800, fontSize: 27,
              color: i === it.length - 1 ? WHITE : p.ink, lineHeight: 1.3,
            }}>{x.replace(/^[^|]*\|/, '').trim()}</div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (post.layout === 'duascolunas' || post.layout === 'mito_verdade') {
    const mv = post.layout === 'mito_verdade';
    const heads = mv ? ['MITO', 'VERDADE'] : (it[0].includes('|') ? it[0].split('|') : ['ANTES', 'COM A MEDUF']);
    const rows = mv || !it[0].includes('|') ? it : it.slice(1);
    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {heads.map((h, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 26,
              color: i === 0 ? p.mut : M_BLUE, letterSpacing: 2.5, textTransform: 'uppercase',
            }}>{h.trim()}</div>
          ))}
        </div>
        {rows.map((x, i) => {
          const [a, b] = x.split('|');
          return (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'stretch' }}>
              <div style={{
                flex: 1, background: p.card, border: `1.5px solid ${p.line}`, borderRadius: 16,
                padding: '20px 22px', fontFamily: HEAD, fontWeight: 700, fontSize: 24,
                color: p.mut, lineHeight: 1.32, boxShadow: `0 10px 26px -14px ${p.shadow}`,
              }}>{(a || '').trim()}</div>
              <div style={{
                flex: 1, background: p.card, border: `2px solid ${M_BLUE}`, borderRadius: 16,
                padding: '20px 22px', fontFamily: HEAD, fontWeight: 700, fontSize: 24,
                color: p.ink, lineHeight: 1.32, boxShadow: '0 12px 30px -14px rgba(21,96,232,0.4)',
              }}>{(b || '').trim()}</div>
            </div>
          );
        })}
      </div>
    );
  }

  /* bigstat */
  const [num, leg, ...apoio] = it;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 210, color: p.ink, letterSpacing: -9, lineHeight: 1 }}>{num}</div>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 27, color: p.mut, letterSpacing: 4, textTransform: 'uppercase', marginTop: 10 }}>{leg}</div>
      <div style={{ marginTop: 46 }}>
        {apoio.map((x, i) => (
          <div key={i} style={{
            background: p.card, border: `1.5px solid ${p.line}`, borderRadius: 18, padding: '22px 30px',
            marginBottom: 14, boxShadow: `0 12px 30px -14px ${p.shadow}`,
            fontFamily: HEAD, fontWeight: 700, fontSize: 28, color: p.ink, lineHeight: 1.35,
          }}>{x}</div>
        ))}
      </div>
    </div>
  );
};

export const MedufPost: React.FC<{ post: MPost }> = ({ post }) => {
  const p = PAL[post.theme];
  const dark = post.theme === 'dark';
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Bg t={post.theme} />

      {/* topo: logo + kicker */}
      <div style={{ position: 'absolute', left: 70, right: 70, top: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: M_BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 22, color: WHITE,
          }}>M</div>
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, letterSpacing: -0.5 }}>
            <span style={{ color: dark ? WHITE : M_NAVY }}>MEDUF</span> <span style={{ color: dark ? '#6ea8ff' : M_BLUE }}>AI</span>
          </span>
        </div>
        <span style={{
          fontFamily: BODY, fontWeight: 700, fontSize: 19, letterSpacing: 3.5,
          color: dark ? '#6ea8ff' : M_BLUE, textTransform: 'uppercase',
          border: `1.5px solid ${dark ? 'rgba(110,168,255,0.4)' : 'rgba(21,96,232,0.35)'}`,
          borderRadius: 999, padding: '8px 18px',
        }}>{post.kicker}</span>
      </div>

      {/* headline */}
      <div style={{ position: 'absolute', left: 70, right: 70, top: 150 }}>
        <Hl text={post.headline} color={p.ink} size={post.headline.length > 42 ? 56 : 64} />
        <div style={{ fontFamily: BODY, fontSize: 26, color: p.mut, marginTop: 14, lineHeight: 1.42 }}>{post.sub}</div>
        <div style={{ width: 96, height: 5, borderRadius: 3, background: M_BLUE, marginTop: 26 }} />
      </div>

      {/* corpo centralizado na área livre */}
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 400, bottom: 250,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <Body post={post} />
      </div>

      {/* fecho */}
      <div style={{ position: 'absolute', left: 70, right: 70, bottom: 128 }}>
        <div style={{
          background: M_BLUE, borderRadius: 20, padding: '24px 32px', textAlign: 'center',
          boxShadow: '0 20px 50px -16px rgba(21,96,232,0.55)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE, lineHeight: 1.35,
        }}>{post.takeaway}</div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 58, textAlign: 'center',
        fontFamily: MONO, fontWeight: 700, fontSize: 22, color: dark ? '#8ea0bd' : '#5b6b85',
      }}>
        meduf.com.br · teste grátis 30 min
      </div>
    </AbsoluteFill>
  );
};

export const MEDUF_POSTS: MPost[] = [];

export const makeMedufPost = (post: MPost): React.FC => {
  const C: React.FC = () => <MedufPost post={post} />;
  return C;
};
