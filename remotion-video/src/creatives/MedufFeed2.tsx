import React from 'react';
import { AbsoluteFill } from 'remotion';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_GREEN, WHITE } from './meduf';

/* ============================================================
   MF01–MF10 — feed MEDUF, leva 2 (1080×1350)
   Direção nova: pôsteres autorais — gradientes profundos,
   tipografia grande, arte de linha (ECG, relógio, tórax),
   splits e mosaicos. Nada do motor de cards da leva 1.
   ============================================================ */

const AZUL_CLARO = '#6ea8ff';
const NOITE = '#060b18';

/* rodapé-assinatura padrão da leva */
const Assina: React.FC<{ claro?: boolean; nota?: string }> = ({ claro, nota }) => (
  <div style={{ position: 'absolute', left: 70, right: 70, bottom: 56 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 28, color: WHITE,
      }}>M</div>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: claro ? M_NAVY : WHITE }}>
        meduf<span style={{ color: claro ? M_BLUE : AZUL_CLARO }}>.com.br</span>
      </span>
      {nota && (
        <span style={{
          marginLeft: 'auto', fontFamily: HEAD, fontSize: 21,
          color: claro ? 'rgba(14,27,51,0.45)' : 'rgba(255,255,255,0.45)', textAlign: 'right', maxWidth: 480,
        }}>{nota}</span>
      )}
    </div>
  </div>
);

const OrbeAzul: React.FC<{ x: number; y: number; r: number; op?: number }> = ({ x, y, r, op = 0.35 }) => (
  <div style={{
    position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r,
    background: `radial-gradient(circle, rgba(21,96,232,${op}), transparent 65%)`,
  }} />
);

/* ---------- MF01: manifesto ---------- */
const MF01: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(165deg, #0a1430, ${NOITE} 70%)` }}>
    <OrbeAzul x={880} y={200} r={480} />
    <OrbeAzul x={120} y={1200} r={420} op={0.22} />
    <div style={{ position: 'absolute', left: 80, top: 150 }}>
      <div style={{
        fontFamily: MONO, fontSize: 28, color: AZUL_CLARO, letterSpacing: '0.3em', marginBottom: 40,
      }}>MEDUF AI</div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 104, color: WHITE, lineHeight: 1.08, letterSpacing: -2 }}>
        a IA que<br />estuda<br />medicina<br /><span style={{ color: AZUL_CLARO }}>com você.</span>
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 38, color: 'rgba(255,255,255,0.7)', marginTop: 48, lineHeight: 1.5, maxWidth: 820 }}>
        casos clínicos, eletro, laboratório e imagem —<br />discutidos como numa passagem de plantão.
      </div>
    </div>
    <Assina />
  </AbsoluteFill>
);

/* ---------- MF02: ECG hero ---------- */
const MF02: React.FC = () => (
  <AbsoluteFill style={{ background: NOITE }}>
    <OrbeAzul x={540} y={500} r={520} op={0.2} />
    <svg width={1080} height={420} style={{ position: 'absolute', top: 300 }}>
      <path
        d="M0,210 l150,0 l20,-28 l24,28 l30,0 l14,-150 l22,250 l16,-100 l50,0 l26,-36 l30,36 l180,0 l20,-28 l24,28 l30,0 l14,-150 l22,250 l16,-100 l50,0 l26,-36 l30,36 l336,0"
        fill="none" stroke={AZUL_CLARO} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 18px rgba(110,168,255,0.65))' }} />
    </svg>
    <div style={{ position: 'absolute', left: 80, top: 820 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 88, color: WHITE, lineHeight: 1.12, letterSpacing: -2 }}>
        cola o traçado.<br /><span style={{ color: AZUL_CLARO }}>discute o laudo.</span>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 40, flexWrap: 'wrap' }}>
        {['ritmo', 'eixo', 'intervalos', 'o que não pode passar'].map(s => (
          <span key={s} style={{
            fontFamily: HEAD, fontWeight: 700, fontSize: 28, color: WHITE,
            border: `2px solid ${M_BLUE}`, background: 'rgba(21,96,232,0.18)',
            borderRadius: 999, padding: '12px 24px',
          }}>{s}</span>
        ))}
      </div>
    </div>
    <Assina nota="apoio ao raciocínio clínico — a conduta é sempre do médico" />
  </AbsoluteFill>
);

/* ---------- MF03: diferencial ranqueado ---------- */
const MF03: React.FC = () => (
  <AbsoluteFill style={{ background: '#eef2f9' }}>
    <div style={{ position: 'absolute', left: 70, top: 110 }}>
      <div style={{ fontFamily: MONO, fontSize: 26, color: 'rgba(14,27,51,0.5)', marginBottom: 20 }}>
        você escreve o caso:
      </div>
      <div style={{
        background: WHITE, borderRadius: 18, borderLeft: `12px solid ${M_BLUE}`,
        padding: '30px 36px', width: 940, boxShadow: '0 20px 50px rgba(14,27,51,0.12)',
        fontFamily: MONO, fontSize: 36, color: '#22314f',
      }}>
        62 anos · dor torácica há 2h · sudorese
      </div>
    </div>
    <div style={{
      position: 'absolute', left: 70, top: 380, width: 940,
      background: M_NAVY, borderRadius: 24, padding: '44px 48px',
      boxShadow: '0 30px 80px rgba(14,27,51,0.35)',
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: WHITE, marginBottom: 34 }}>
        a MEDUF devolve o <span style={{ color: AZUL_CLARO }}>diferencial ranqueado</span>
      </div>
      {[['Síndrome coronariana aguda', 0.9, 'alta'], ['Dissecção de aorta', 0.52, 'não descartar'], ['Tromboembolismo pulmonar', 0.38, 'considerar']].map(([r, f, tag]) => (
        <div key={r as string} style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: WHITE }}>{r as string}</span>
            <span style={{
              fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: AZUL_CLARO,
              border: '2px solid rgba(110,168,255,0.4)', borderRadius: 999, padding: '5px 16px',
            }}>{tag as string}</span>
          </div>
          <div style={{ height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.12)' }}>
            <div style={{
              height: '100%', width: `${(f as number) * 100}%`, borderRadius: 10,
              background: `linear-gradient(90deg, ${M_BLUE}, ${AZUL_CLARO})`,
            }} />
          </div>
        </div>
      ))}
      <div style={{ fontFamily: HEAD, fontSize: 28, color: 'rgba(255,255,255,0.65)', marginTop: 8 }}>
        + o que perguntar na anamnese e quais exames pedir agora
      </div>
    </div>
    <Assina claro nota="apoio ao raciocínio clínico — a conduta é sempre do médico" />
  </AbsoluteFill>
);

/* ---------- MF04: 3h da manhã ---------- */
const MF04: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, #04070f, #0a1226)` }}>
    <svg width={460} height={460} viewBox="0 0 460 460" style={{ position: 'absolute', left: 310, top: 130, opacity: 0.9 }}>
      <circle cx={230} cy={230} r={205} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.5)" strokeWidth={6} />
      {[...Array(12)].map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <line key={i}
          x1={230 + Math.sin(a) * 178} y1={230 - Math.cos(a) * 178}
          x2={230 + Math.sin(a) * 196} y2={230 - Math.cos(a) * 196}
          stroke="rgba(255,255,255,0.5)" strokeWidth={i % 3 === 0 ? 8 : 4} />;
      })}
      <line x1={230} y1={230} x2={318} y2={155} stroke={WHITE} strokeWidth={13} strokeLinecap="round" />
      <line x1={230} y1={230} x2={230} y2={78} stroke="rgba(255,255,255,0.75)" strokeWidth={7} strokeLinecap="round" />
      <circle cx={230} cy={230} r={13} fill={WHITE} />
    </svg>
    <div style={{ position: 'absolute', left: 80, top: 680 }}>
      <div style={{ fontFamily: MONO, fontSize: 60, color: 'rgba(255,255,255,0.65)', marginBottom: 22 }}>03:00</div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 82, color: WHITE, lineHeight: 1.15, letterSpacing: -1 }}>
        com quem discutir<br />o caso <span style={{ color: AZUL_CLARO }}>às 3h?</span>
      </div>
      <div style={{
        display: 'inline-block', marginTop: 44, background: M_BLUE, color: WHITE,
        fontFamily: HEAD, fontWeight: 800, fontSize: 42, borderRadius: 999, padding: '20px 42px',
        boxShadow: '0 20px 60px rgba(21,96,232,0.45)',
      }}>
        com a MEDUF. ela não dorme.
      </div>
    </div>
    <Assina />
  </AbsoluteFill>
);

/* ---------- MF05: mosaico de ferramentas ---------- */
const MF05: React.FC = () => {
  const tiles = [
    ['casos clínicos', 'descreve e discute, como numa passagem'],
    ['eletro', 'cola o traçado, entende o laudo'],
    ['laboratório', 'exames interpretados no contexto'],
    ['imagem', 'leitura assistida, achado a achado'],
    ['conduta', 'o porquê de cada passo'],
  ];
  return (
    <AbsoluteFill style={{ background: '#eef2f9' }}>
      <div style={{ position: 'absolute', left: 70, top: 100 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: M_NAVY, letterSpacing: -1.5, lineHeight: 1.1 }}>
          uma dupla de estudos<br />pra <span style={{ color: M_BLUE }}>cada frente</span>
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 330,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
      }}>
        {tiles.map(([titulo, sub], i) => (
          <div key={titulo} style={{
            background: i === 4 ? M_NAVY : WHITE, borderRadius: 22, padding: '34px 32px',
            gridColumn: i === 4 ? '1 / -1' : undefined,
            boxShadow: '0 18px 44px rgba(14,27,51,0.10)',
            border: '1.5px solid rgba(14,27,51,0.08)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: i === 4 ? M_BLUE : 'rgba(21,96,232,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: i === 4 ? WHITE : M_BLUE,
            }}>{i + 1}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: i === 4 ? WHITE : M_NAVY }}>
              {titulo}
            </div>
            <div style={{
              fontFamily: HEAD, fontSize: 27, color: i === 4 ? 'rgba(255,255,255,0.7)' : 'rgba(14,27,51,0.6)',
              marginTop: 10, lineHeight: 1.4,
            }}>{sub}</div>
          </div>
        ))}
      </div>
      <Assina claro />
    </AbsoluteFill>
  );
};

/* ---------- MF06: pergunta como num plantão ---------- */
const MF06: React.FC = () => {
  const balas = [
    ['esse potássio de 6,1 muda minha conduta agora?', false],
    ['muda — e a MEDUF te mostra o passo a passo do manejo, com o porquê.', true],
    ['supra em V2 e V3: o que não posso deixar passar?', false],
  ];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, #0a1430, ${NOITE})` }}>
      <OrbeAzul x={900} y={220} r={420} op={0.25} />
      <div style={{ position: 'absolute', left: 70, top: 120 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 76, color: WHITE, lineHeight: 1.12, letterSpacing: -1 }}>
          pergunta como<br />perguntaria a um<br /><span style={{ color: AZUL_CLARO }}>preceptor.</span>
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 480,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {balas.map(([texto, ia], i) => (
          <div key={i} style={{
            alignSelf: ia ? 'flex-end' : 'flex-start', maxWidth: 800,
            background: ia ? M_BLUE : 'rgba(255,255,255,0.08)',
            border: ia ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 22, padding: '26px 32px',
            fontFamily: HEAD, fontWeight: 600, fontSize: 33, lineHeight: 1.4, color: WHITE,
          }}>
            {ia ? (
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HEAD, fontWeight: 900, fontSize: 22, flexShrink: 0,
                }}>M</span>
                <span>{texto as string}</span>
              </div>
            ) : texto as string}
          </div>
        ))}
      </div>
      <div style={{
        position: 'absolute', left: 70, bottom: 170, fontFamily: HEAD, fontSize: 32,
        color: 'rgba(255,255,255,0.6)',
      }}>
        sem fila, sem hora marcada, sem vergonha de perguntar.
      </div>
      <Assina />
    </AbsoluteFill>
  );
};

/* ---------- MF07: split sozinho × com a MEDUF ---------- */
const MF07: React.FC = () => (
  <AbsoluteFill style={{ background: '#eef2f9' }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ flex: 1, background: '#dde3ee', padding: '110px 50px 0 70px' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: '#5b6b85', marginBottom: 44 }}>
          estudar<br />sozinho
        </div>
        {['dúvida anotada pra depois', 'resposta que não chega', 'o caso esfria', 'a insegurança fica'].map(s => (
          <div key={s} style={{
            fontFamily: HEAD, fontWeight: 600, fontSize: 30, color: '#5b6b85',
            padding: '20px 0', borderBottom: '2px solid rgba(91,107,133,0.2)', lineHeight: 1.35,
          }}>{s}</div>
        ))}
      </div>
      <div style={{ flex: 1, background: M_NAVY, padding: '110px 70px 0 50px' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: WHITE, marginBottom: 44 }}>
          estudar<br /><span style={{ color: AZUL_CLARO }}>com a MEDUF</span>
        </div>
        {['pergunta na hora da dúvida', 'resposta em segundos', 'o caso vira aprendizado', 'o raciocínio fica'].map(s => (
          <div key={s} style={{
            fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: WHITE,
            padding: '20px 0', borderBottom: '2px solid rgba(255,255,255,0.15)', lineHeight: 1.35,
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <span style={{ color: '#37e39b', fontSize: 32 }}>✓</span>{s}
          </div>
        ))}
      </div>
    </div>
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 300, display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        background: M_BLUE, color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 46,
        borderRadius: 999, padding: '24px 52px', boxShadow: '0 24px 70px rgba(21,96,232,0.5)',
      }}>
        de que lado você estuda?
      </div>
    </div>
    <Assina />
  </AbsoluteFill>
);

/* ---------- MF08: antes do plantão ---------- */
const MF08: React.FC = () => (
  <AbsoluteFill style={{ background: NOITE }}>
    <OrbeAzul x={200} y={180} r={380} op={0.25} />
    <div style={{ position: 'absolute', left: 80, top: 120 }}>
      <div style={{ fontFamily: MONO, fontSize: 28, color: AZUL_CLARO, letterSpacing: '0.24em', marginBottom: 26 }}>
        CHECKLIST · 20 MIN ANTES DO PLANTÃO
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: WHITE, letterSpacing: -1.5, lineHeight: 1.1 }}>
        revisa com<br />a MEDUF:
      </div>
    </div>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 460 }}>
      {['as drogas da emergência que você menos usa', 'os ritmos de parada e o que fazer em cada um', 'o protocolo de dor torácica do começo ao fim', 'as doses pediátricas que sempre fogem'].map((s, i) => (
        <div key={s} style={{
          display: 'flex', alignItems: 'center', gap: 24, padding: '30px 34px',
          background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)',
          borderRadius: 20, marginBottom: 20,
        }}>
          <span style={{
            width: 52, height: 52, borderRadius: 14, border: `3px solid ${M_BLUE}`, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: AZUL_CLARO, fontSize: 30, fontFamily: HEAD, fontWeight: 900,
          }}>✓</span>
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34, color: WHITE, lineHeight: 1.35 }}>{s}</span>
        </div>
      ))}
    </div>
    <Assina nota="salva este post pro próximo plantão" />
  </AbsoluteFill>
);

/* ---------- MF09: segundos ---------- */
const MF09: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(160deg, ${M_BLUE}, #0a3d99 75%)` }}>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1.8px, transparent 1.8px)',
      backgroundSize: '52px 52px',
    }} />
    <div style={{ position: 'absolute', left: 80, top: 240 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 158, color: WHITE, letterSpacing: -4, lineHeight: 0.95 }}>
        segundos.
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 46, color: 'rgba(255,255,255,0.85)', marginTop: 50, lineHeight: 1.45, maxWidth: 860 }}>
        é o tempo entre a sua dúvida<br />e uma discussão de caso à altura dela.
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 60, flexWrap: 'wrap' }}>
        {['24h por dia', 'todos os dias', 'quantas vezes precisar'].map(s => (
          <span key={s} style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_NAVY,
            background: WHITE, borderRadius: 999, padding: '14px 28px',
          }}>{s}</span>
        ))}
      </div>
    </div>
    <Assina />
  </AbsoluteFill>
);

/* ---------- MF10: CTA ---------- */
const MF10: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, #0a1430, ${NOITE} 65%)` }}>
    <OrbeAzul x={540} y={420} r={560} op={0.3} />
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 250,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
    }}>
      <div style={{
        width: 190, height: 190, borderRadius: 52,
        background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: WHITE,
        boxShadow: '0 40px 110px rgba(21,96,232,0.55)',
      }}>M</div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 80, color: WHITE, textAlign: 'center', lineHeight: 1.15, letterSpacing: -1 }}>
        sua dupla de estudos<br /><span style={{ color: AZUL_CLARO }}>está acordada.</span>
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 38, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.5 }}>
        casos · eletro · laboratório · imagem · conduta
      </div>
      <div style={{
        background: M_BLUE, color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 52,
        borderRadius: 999, padding: '26px 60px', boxShadow: '0 24px 70px rgba(21,96,232,0.5)',
      }}>
        meduf.com.br
      </div>
    </div>
    <Assina nota="apoio ao raciocínio clínico — a conduta é sempre do médico" />
  </AbsoluteFill>
);

export const MEDUF_FEED2: Array<[string, React.FC]> = [
  ['MF01-Manifesto', MF01],
  ['MF02-Ecg', MF02],
  ['MF03-Diferencial', MF03],
  ['MF04-TresDaManha', MF04],
  ['MF05-Mosaico', MF05],
  ['MF06-Preceptor', MF06],
  ['MF07-Split', MF07],
  ['MF08-Checklist', MF08],
  ['MF09-Segundos', MF09],
  ['MF10-Cta', MF10],
];
