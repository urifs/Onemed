import React from 'react';
import { AbsoluteFill } from 'remotion';
import { HEAD, BODY, MONO } from './theme';
import { OLightBg, O_RED, O_GREEN, WHITE } from './olight';

/* ============ 20 posts informativos de feed 1080×1350 — claro e escuro ============ */

export type Post = {
  id: string;
  theme: 'light' | 'dark';
  layout: 'lista' | 'duascolunas' | 'passos' | 'diagrama' | 'bigstat' | 'checklist' | 'mito_verdade';
  headline: string;
  sub: string;
  items: string[];
  takeaway: string;
};

/* paleta por tema */
const PAL = {
  light: { ink: '#16181d', mut: '#6b7280', card: '#ffffff', line: 'rgba(22,24,29,0.11)', shadow: 'rgba(22,24,29,0.16)' },
  dark: { ink: '#f2f4f8', mut: '#98a1b0', card: '#14161c', line: 'rgba(255,255,255,0.11)', shadow: 'rgba(0,0,0,0.55)' },
};

const DarkBg: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#0a0b0e' }}>
    <div style={{
      position: 'absolute', width: 1100, height: 1100, borderRadius: 999,
      background: 'radial-gradient(circle, rgba(224,45,45,0.16), transparent 64%)',
      top: -340, right: -300,
    }} />
    <div style={{
      position: 'absolute', width: 900, height: 900, borderRadius: 999,
      background: 'radial-gradient(circle, rgba(224,45,45,0.09), transparent 64%)',
      bottom: -260, left: -240,
    }} />
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.5,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1.4px, transparent 1.4px)',
      backgroundSize: '46px 46px',
    }} />
  </div>
);

const Logo: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
    <div style={{
      width: 52, height: 52, borderRadius: 14,
      background: `linear-gradient(135deg, ${O_RED}, #b91c1c)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 12px 30px -8px rgba(224,45,45,0.5)',
    }}>
      <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <path d="M6 3v5a4 4 0 0 0 8 0V3" stroke={WHITE} strokeWidth={2.1} strokeLinecap="round" />
        <path d="M10 14v2.5a4.5 4.5 0 0 0 9 0V13" stroke={WHITE} strokeWidth={2.1} strokeLinecap="round" />
        <circle cx={19} cy={10.5} r={2.2} stroke={WHITE} strokeWidth={2.1} />
      </svg>
    </div>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 33, letterSpacing: -1 }}>
      <span style={{ color: dark ? WHITE : '#16181d' }}>One</span><span style={{ color: O_RED }}>Med</span>
    </span>
  </div>
);

/* headline: *palavra* vira vermelho */
const Hl: React.FC<{ text: string; color: string; size?: number }> = ({ text, color, size = 66 }) => {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color, letterSpacing: -2, lineHeight: 1.16, textAlign: 'center' }}>
      {parts.map((p, i) => p.startsWith('*')
        ? <span key={i} style={{ color: O_RED }}>{p.slice(1, -1)}</span>
        : <span key={i}>{p}</span>)}
    </div>
  );
};

const Row: React.FC<{ p: typeof PAL.light; children: React.ReactNode; accent?: boolean }> = ({ p, children, accent }) => (
  <div style={{
    background: p.card, border: `1.5px solid ${accent ? O_RED : p.line}`, borderRadius: 18,
    padding: '20px 26px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18,
    boxShadow: `0 10px 26px -12px ${p.shadow}`,
    fontFamily: HEAD, fontWeight: 700, fontSize: 27, color: p.ink, lineHeight: 1.3,
  }}>{children}</div>
);

/* corpo por layout */
const Body: React.FC<{ post: Post }> = ({ post }) => {
  const p = PAL[post.theme];
  const it = post.items;
  if (post.layout === 'lista') {
    return (
      <div style={{ position: 'absolute', left: 90, right: 90, top: 385 }}>
        {it.map((x, i) => {
          const [emoji, ...rest] = x.split('|');
          return <Row key={i} p={p}><span style={{ fontSize: 34 }}>{emoji.trim()}</span>{rest.join('|').trim()}</Row>;
        })}
      </div>
    );
  }
  if (post.layout === 'checklist') {
    return (
      <div style={{ position: 'absolute', left: 90, right: 90, top: 385 }}>
        {it.map((x, i) => {
          const t = x.includes('|') ? x.split('|').slice(1).join('|').trim() : x;
          return (
            <Row key={i} p={p}>
              <span style={{
                width: 38, height: 38, borderRadius: 999, background: O_GREEN, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: WHITE, fontWeight: 900, fontSize: 22,
              }}>✓</span>
              {t}
            </Row>
          );
        })}
      </div>
    );
  }
  if (post.layout === 'passos') {
    return (
      <div style={{ position: 'absolute', left: 90, right: 90, top: 385 }}>
        {it.map((x, i) => {
          const t = x.includes('|') ? x.split('|').slice(1).join('|').trim() : x;
          return (
            <Row key={i} p={p}>
              <span style={{
                width: 44, height: 44, borderRadius: 999, background: O_RED, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 24,
              }}>{i + 1}</span>
              {t}
            </Row>
          );
        })}
      </div>
    );
  }
  if (post.layout === 'duascolunas' || post.layout === 'mito_verdade') {
    const [hA, hB] = (post.layout === 'mito_verdade' ? 'MITO|VERDADE' : it[0]).split('|');
    const rows = post.layout === 'mito_verdade' ? it : it.slice(1);
    return (
      <div style={{ position: 'absolute', left: 70, right: 70, top: 385 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {[[hA, post.layout === 'mito_verdade' ? '#8a8f98' : p.mut], [hB, O_RED]].map(([h, c], i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 30,
              color: c as string, letterSpacing: 0.5,
            }}>{(h as string).trim()}</div>
          ))}
        </div>
        {rows.map((x, i) => {
          const [a, b] = x.split('|');
          return (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <div style={{
                flex: 1, background: p.card, border: `1.5px solid ${p.line}`, borderRadius: 16,
                padding: '18px 20px', fontFamily: HEAD, fontWeight: 700, fontSize: 24,
                color: p.mut, lineHeight: 1.3, boxShadow: `0 8px 22px -12px ${p.shadow}`,
              }}>{post.layout === 'mito_verdade' ? '❌ ' : ''}{(a || '').trim()}</div>
              <div style={{
                flex: 1, background: p.card, border: `2px solid ${O_RED}`, borderRadius: 16,
                padding: '18px 20px', fontFamily: HEAD, fontWeight: 700, fontSize: 24,
                color: p.ink, lineHeight: 1.3, boxShadow: '0 10px 28px -12px rgba(224,45,45,0.35)',
              }}>{post.layout === 'mito_verdade' ? '✅ ' : ''}{(b || '').trim()}</div>
            </div>
          );
        })}
      </div>
    );
  }
  if (post.layout === 'diagrama') {
    return (
      <div style={{ position: 'absolute', left: 120, right: 120, top: 385 }}>
        {it.map((x, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div style={{ textAlign: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: O_RED, margin: '4px 0' }}>↓</div>
            )}
            <div style={{
              background: i === it.length - 1 ? O_RED : p.card,
              border: `1.5px solid ${i === it.length - 1 ? O_RED : p.line}`, borderRadius: 18,
              padding: '20px 26px', textAlign: 'center',
              boxShadow: i === it.length - 1 ? '0 14px 36px -10px rgba(224,45,45,0.45)' : `0 10px 26px -12px ${p.shadow}`,
              fontFamily: HEAD, fontWeight: 800, fontSize: 26,
              color: i === it.length - 1 ? WHITE : p.ink, lineHeight: 1.3,
            }}>{x.includes('|') ? x.split('|').slice(1).join('|').trim() : x}</div>
          </React.Fragment>
        ))}
      </div>
    );
  }
  /* bigstat */
  const [num, leg, ...apoio] = it;
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: 400, textAlign: 'center' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 200, color: p.ink, letterSpacing: -8, lineHeight: 1 }}>
        {num}
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 36, color: p.mut, marginTop: 8 }}>{leg}</div>
      <div style={{ marginTop: 48 }}>
        {apoio.map((x, i) => (
          <div key={i} style={{
            background: p.card, border: `1.5px solid ${p.line}`, borderRadius: 18,
            padding: '20px 28px', marginBottom: 14,
            boxShadow: `0 10px 26px -12px ${p.shadow}`,
            fontFamily: HEAD, fontWeight: 700, fontSize: 27, color: p.ink, lineHeight: 1.35,
          }}>{x}</div>
        ))}
      </div>
    </div>
  );
};

export const PostImage: React.FC<{ post: Post }> = ({ post }) => {
  const p = PAL[post.theme];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {post.theme === 'light' ? <OLightBg /> : <DarkBg />}
      <div style={{ position: 'absolute', top: 48, left: 0, right: 0 }}>
        <Logo dark={post.theme === 'dark'} />
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 150 }}>
        <Hl text={post.headline} color={p.ink} />
        {post.sub && (
          <div style={{ fontFamily: BODY, fontSize: 27, color: p.mut, textAlign: 'center', marginTop: 16, lineHeight: 1.4 }}>
            {post.sub}
          </div>
        )}
      </div>
      <Body post={post} />
      <div style={{ position: 'absolute', left: 70, right: 70, bottom: 108 }}>
        <div style={{
          background: O_RED, borderRadius: 20, padding: '22px 30px', textAlign: 'center',
          boxShadow: '0 18px 46px -14px rgba(224,45,45,0.5)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE, lineHeight: 1.35,
        }}>{post.takeaway}</div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center',
        fontFamily: MONO, fontWeight: 700, fontSize: 22, color: post.theme === 'dark' ? '#98a1b0' : '#6b7280',
      }}>
        onemedcursos.com.br · teste grátis
      </div>
    </AbsoluteFill>
  );
};

/* dados preenchidos a partir do júri (workflow) */
export const POSTS: Post[] = [];

export const makePostComp = (post: Post): React.FC => {
  const C: React.FC = () => <PostImage post={post} />;
  return C;
};
