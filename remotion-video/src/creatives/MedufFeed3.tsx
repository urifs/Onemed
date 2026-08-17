import React from 'react';
import { AbsoluteFill } from 'remotion';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_BG, M_GREEN, M_RED, WHITE } from './meduf';
import {
  MChip, Cartao, Rank, Refs, Alerta, Linha, AZUL_SOFT, AMBAR, AMBAR_BG, VERM_BG, FERRAMENTAS,
} from './medufui';

/* ============================================================
   MG01–MG10 — feed MEDUF refeito (1080×1350, CLARO)
   O produto em primeiro plano: telas reais das ferramentas,
   consenso das 3 IAs, fontes científicas e números.
   ============================================================ */

const T9 = 999; /* stills: tudo assentado */

const Fundo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: M_BG }}>
    <AbsoluteFill style={{
      backgroundImage: 'radial-gradient(rgba(21,96,232,0.05) 1.4px, transparent 1.4px)',
      backgroundSize: '40px 40px',
    }} />
    {children}
  </AbsoluteFill>
);

const Topo: React.FC<{ pill?: string }> = ({ pill }) => (
  <div style={{ position: 'absolute', top: 56, left: 64, right: 64, display: 'flex', alignItems: 'center', gap: 18 }}>
    <MChip size={62} />
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: M_NAVY }}>
      MEDUF <span style={{ color: M_BLUE }}>AI</span>
    </span>
    {pill && (
      <span style={{
        marginLeft: 'auto', fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: M_BLUE,
        background: AZUL_SOFT, borderRadius: 999, padding: '10px 22px',
      }}>{pill}</span>
    )}
  </div>
);

const Base: React.FC<{ clinico?: boolean }> = ({ clinico }) => (
  <div style={{ position: 'absolute', left: 64, right: 64, bottom: 44 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: M_NAVY }}>
        meduf<span style={{ color: M_BLUE }}>.com.br</span>
      </span>
      <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 25, color: M_GREEN }}>
        teste grátis por 30 minutos
      </span>
    </div>
    {clinico && (
      <div style={{ fontFamily: HEAD, fontSize: 20, color: 'rgba(14,27,51,0.4)', marginTop: 12 }}>
        apoio à decisão clínica — a decisão final é sempre do médico
      </div>
    )}
  </div>
);

const ChipIA: React.FC<{ nome: string }> = ({ nome }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, background: WHITE,
    border: `2px solid ${M_GREEN}`, borderRadius: 999, padding: '14px 26px',
  }}>
    <span style={{
      width: 26, height: 26, borderRadius: 13, background: M_GREEN, color: WHITE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 900, fontFamily: HEAD,
    }}>✓</span>
    <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: M_NAVY }}>{nome}</span>
  </div>
);

/* ---------- MG01: hero ---------- */
const MG01: React.FC = () => (
  <Fundo>
    <Topo />
    <div style={{ position: 'absolute', left: 64, top: 190 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: M_NAVY, lineHeight: 1.12, letterSpacing: -1.5 }}>
        o assistente clínico<br /><span style={{ color: M_BLUE }}>ao lado do médico.</span>
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 34, color: M_MUT, marginTop: 26, lineHeight: 1.5 }}>
        diagnóstico, exames, imagens e prescrição —<br />com 3 IAs em consenso e referência científica.
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 560 }}>
      <Cartao>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 12, letterSpacing: '0.06em' }}>
          QUADRO CLÍNICO
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 32, color: M_NAVY }}>
          febre há 5 dias, petéquias, plaquetas em queda...
        </div>
      </Cartao>
      <div style={{ display: 'flex', gap: 14, marginTop: 22 }}>
        <ChipIA nome="GPT" /><ChipIA nome="Claude" /><ChipIA nome="Gemini" />
      </div>
      <div style={{
        marginTop: 22, display: 'inline-block',
        background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`, borderRadius: 999,
        padding: '16px 32px', boxShadow: '0 16px 44px rgba(21,96,232,0.35)',
      }}>
        <span style={{ color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 30 }}>
          → consenso das 3 IAs
        </span>
      </div>
      <Cartao style={{ marginTop: 22 }}>
        <Rank t={T9} at={0} rotulo="Dengue com sinais de alarme" frac={0.88} tag="alta probabilidade" />
        <Refs t={T9} at={0} itens={['PubMed', 'PCDT — SUS']} />
      </Cartao>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG02: consenso ---------- */
const MG02: React.FC = () => (
  <Fundo>
    <Topo />
    <div style={{ position: 'absolute', left: 64, top: 210 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: M_NAVY, lineHeight: 1.1, letterSpacing: -2 }}>
        três IAs.<br /><span style={{ color: M_BLUE }}>um consenso.</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
      <div style={{ display: 'flex', gap: 18 }}>
        {['GPT', 'Claude', 'Gemini'].map(n => <ChipIA key={n} nome={n} />)}
      </div>
      <div style={{ fontSize: 52, color: M_MUT }}>↓</div>
      <div style={{
        background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`, borderRadius: 26,
        padding: '34px 60px', boxShadow: '0 26px 70px rgba(21,96,232,0.4)',
      }}>
        <div style={{ color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 46 }}>
          consenso consolidado
        </div>
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 32, color: M_MUT, textAlign: 'center', lineHeight: 1.55, maxWidth: 860 }}>
        o mesmo caso, analisado por GPT, Claude e Gemini ao mesmo tempo.<br />
        divergência vira verificação — e o que chega até você já vem<br />
        consolidado, com as referências junto.
      </div>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG03: as 17 ferramentas ---------- */
const MG03: React.FC = () => (
  <Fundo>
    <Topo />
    <div style={{ position: 'absolute', left: 64, top: 178 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: M_NAVY, letterSpacing: -1 }}>
        <span style={{ color: M_BLUE }}>17 ferramentas</span> de apoio à decisão
      </div>
    </div>
    <div style={{
      position: 'absolute', left: 64, right: 64, top: 280,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
    }}>
      {FERRAMENTAS.map((f, i) => (
        <div key={f} style={{
          background: WHITE, border: '1.5px solid rgba(14,27,51,0.08)', borderRadius: 14,
          padding: '17px 20px', display: 'flex', alignItems: 'center', gap: 13,
          boxShadow: '0 8px 22px rgba(14,27,51,0.05)',
        }}>
          <span style={{
            width: 37, height: 37, borderRadius: 10, background: AZUL_SOFT, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 19, color: M_BLUE,
          }}>{i + 1}</span>
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 23.5, color: M_NAVY }}>{f}</span>
        </div>
      ))}
    </div>
    <Base />
  </Fundo>
);

/* ---------- MG04: diagnóstico detalhado ---------- */
const MG04: React.FC = () => (
  <Fundo>
    <Topo pill="Diagnóstico Detalhado" />
    <div style={{ position: 'absolute', left: 64, top: 180 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: M_NAVY, lineHeight: 1.15, letterSpacing: -1 }}>
        do quadro clínico ao<br /><span style={{ color: M_BLUE }}>diferencial ranqueado</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 400 }}>
      <Cartao>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 12, letterSpacing: '0.06em' }}>
          VOCÊ INSERE
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 31, color: M_NAVY, lineHeight: 1.45 }}>
          febre há 5 dias · petéquias · plaquetas 92 mil · retorno de área endêmica
        </div>
      </Cartao>
      <Cartao style={{ marginTop: 22 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, marginBottom: 20 }}>
          a MEDUF devolve
        </div>
        <Rank t={T9} at={0} rotulo="Dengue com sinais de alarme" frac={0.88} tag="alta probabilidade" />
        <Rank t={T9} at={0} rotulo="Outras arboviroses" frac={0.44} tag="considerar" />
        <Rank t={T9} at={0} rotulo="Púrpura trombocitopênica" frac={0.28} tag="diferencial" />
        <div style={{ marginTop: 8 }}>
          <Refs t={T9} at={0} itens={['PubMed · revisões', 'PCDT Dengue — SUS', 'conduta sugerida']} />
        </div>
      </Cartao>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG05: ECG ---------- */
const MG05: React.FC = () => (
  <Fundo>
    <Topo pill="Análise de ECG" />
    <div style={{ position: 'absolute', left: 64, top: 180 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: M_NAVY, lineHeight: 1.15, letterSpacing: -1 }}>
        envia o traçado.<br /><span style={{ color: M_BLUE }}>recebe a análise.</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 410 }}>
      <Cartao>
        <div style={{
          background: '#fdf6f4', borderRadius: 14, border: '1.5px solid rgba(224,36,36,0.15)',
          overflow: 'hidden', height: 180,
          backgroundImage: 'linear-gradient(rgba(224,36,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(224,36,36,0.08) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}>
          <svg width={880} height={180} viewBox="0 0 880 170">
            <path d="M0,80 l60,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l88,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l52,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l120,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l70,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l100,0"
              fill="none" stroke="#c2382e" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" transform="translate(0,10)" />
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          {[['ritmo', 'irregularmente irregular'], ['FC', '~142 bpm'], ['onda P', 'ausente']].map(([r, v]) => (
            <div key={r} style={{ background: AZUL_SOFT, borderRadius: 14, padding: '14px 20px' }}>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 20, color: M_MUT }}>{r}</div>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: M_NAVY }}>{v}</div>
            </div>
          ))}
        </div>
      </Cartao>
      <div style={{ marginTop: 20 }}>
        <Alerta t={T9} at={0} titulo="Achado que pede atenção">
          padrão compatível com FA de alta resposta — correlacionar com a clínica
        </Alerta>
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 27, color: M_MUT, marginTop: 22 }}>
        também: radiografia · TC, RM e ultrassom · sugestão de exames
      </div>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG06: interação medicamentosa ---------- */
const MG06: React.FC = () => (
  <Fundo>
    <Topo pill="Interação Medicamentosa" />
    <div style={{ position: 'absolute', left: 64, top: 180 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: M_NAVY, lineHeight: 1.15, letterSpacing: -1 }}>
        a prescrição, conferida<br /><span style={{ color: M_BLUE }}>antes de sair da tela</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 400 }}>
      <Cartao>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Varfarina 5 mg', 'Amiodarona 200 mg', 'Ibuprofeno 600 mg'].map(n => (
            <span key={n} style={{
              fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: M_NAVY,
              background: AZUL_SOFT, border: '2px solid rgba(21,96,232,0.25)',
              borderRadius: 999, padding: '13px 24px',
            }}>{n}</span>
          ))}
        </div>
      </Cartao>
      <div style={{ marginTop: 20 }}>
        <Alerta t={T9} at={0} grave titulo="Interação GRAVE detectada">
          varfarina + amiodarona — potencialização do efeito anticoagulante
        </Alerta>
      </div>
      <Cartao style={{ marginTop: 20 }}>
        <Linha t={T9} at={0} cor={M_BLUE}>mecanismo explicado (CYP2C9)</Linha>
        <Linha t={T9} at={0} cor={M_BLUE}>o que fazer: ajustar dose e monitorar INR</Linha>
        <Linha t={T9} at={0} cor={M_BLUE}>alerta extra: AINE + anticoagulante</Linha>
      </Cartao>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG07: laboratório ---------- */
const MG07: React.FC = () => (
  <Fundo>
    <Topo pill="Análise de Exames Laboratoriais" />
    <div style={{ position: 'absolute', left: 64, top: 180 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: M_NAVY, lineHeight: 1.15, letterSpacing: -1 }}>
        20 resultados →<br /><span style={{ color: M_BLUE }}>uma leitura clara</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 400 }}>
      <Cartao>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {([['Potássio', '6,1', 'alto'], ['Creatinina', '2,4', 'alto'], ['Hemoglobina', '9,8', 'baixo'], ['Sódio', '138', 'ok']] as const).map(([nome, v, st]) => (
            <div key={nome} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: st === 'ok' ? '#f6f8fc' : st === 'alto' ? VERM_BG : AMBAR_BG,
              border: `2px solid ${st === 'ok' ? 'rgba(14,27,51,0.1)' : st === 'alto' ? M_RED : AMBAR}`,
              borderRadius: 14, padding: '16px 20px',
            }}>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: M_NAVY }}>{nome}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: st === 'ok' ? M_NAVY : st === 'alto' ? M_RED : AMBAR }}>
                {v}{st !== 'ok' ? (st === 'alto' ? ' ↑' : ' ↓') : ''}
              </span>
            </div>
          ))}
        </div>
      </Cartao>
      <Cartao style={{ marginTop: 20 }}>
        <Linha t={T9} at={0} cor={M_RED}>hipercalemia + disfunção renal — padrão de lesão renal aguda</Linha>
        <Linha t={T9} at={0} cor={AMBAR}>anemia associada: investigar no mesmo contexto</Linha>
        <div style={{ marginTop: 12 }}>
          <Refs t={T9} at={0} itens={['próximos exames sugeridos', 'gasometria · ECG · USG']} />
        </div>
      </Cartao>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG08: fontes ---------- */
const MG08: React.FC = () => (
  <Fundo>
    <Topo />
    <div style={{ position: 'absolute', left: 64, top: 190 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 72, color: M_NAVY, lineHeight: 1.12, letterSpacing: -1.5 }}>
        base científica<br /><span style={{ color: M_BLUE }}>de verdade.</span>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 64, right: 64, top: 470 }}>
      {[
        ['PubMed', '+35 milhões de artigos científicos'],
        ['Protocolos do SUS · PCDT', 'as diretrizes oficiais brasileiras'],
        ['RENAME', 'relação nacional de medicamentos'],
        ['Cadernos de Atenção Básica', 'a prática da atenção primária'],
      ].map(([titulo, sub]) => (
        <Cartao key={titulo} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: M_NAVY }}>{titulo}</div>
          <div style={{ fontFamily: HEAD, fontSize: 28, color: M_MUT, marginTop: 6 }}>{sub}</div>
        </Cartao>
      ))}
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 28, color: M_MUT, marginTop: 8 }}>
        toda resposta sai com a referência junto.
      </div>
    </div>
    <Base clinico />
  </Fundo>
);

/* ---------- MG09: números ---------- */
const MG09: React.FC = () => (
  <Fundo>
    <Topo />
    <div style={{ position: 'absolute', left: 64, right: 64, top: 230 }}>
      {[
        ['+10.000', 'médicos usando'],
        ['27', 'estados do Brasil'],
        ['+90 mil', 'consultas realizadas'],
        ['4.9/5', 'avaliação dos usuários'],
      ].map(([num, sub]) => (
        <div key={num} style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 52 }}>
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 118, color: M_BLUE, letterSpacing: -3, minWidth: 480 }}>
            {num}
          </span>
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 38, color: M_NAVY }}>{sub}</span>
        </div>
      ))}
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: M_NAVY, marginTop: 10 }}>
        o assistente clínico <span style={{ color: M_BLUE }}>ao lado do médico.</span>
      </div>
    </div>
    <Base />
  </Fundo>
);

/* ---------- MG10: CTA ---------- */
const MG10: React.FC = () => (
  <Fundo>
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 250,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 38,
    }}>
      <MChip size={170} />
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: M_NAVY, textAlign: 'center', lineHeight: 1.16, letterSpacing: -1.5 }}>
        teste o assistente<br />clínico <span style={{ color: M_BLUE }}>agora.</span>
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 34, color: M_MUT, textAlign: 'center', lineHeight: 1.55 }}>
        17 ferramentas · 3 IAs em consenso<br />referências do PubMed e protocolos do SUS
      </div>
      <div style={{
        background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`, borderRadius: 999,
        padding: '28px 64px', boxShadow: '0 26px 70px rgba(21,96,232,0.45)',
      }}>
        <span style={{ color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 46 }}>
          teste grátis por 30 minutos
        </span>
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: M_NAVY }}>
        meduf<span style={{ color: M_BLUE }}>.com.br</span>
      </div>
    </div>
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center',
      fontFamily: HEAD, fontSize: 21, color: 'rgba(14,27,51,0.4)',
    }}>
      apoio à decisão clínica — a decisão final é sempre do médico
    </div>
  </Fundo>
);

export const MEDUF_FEED3: Array<[string, React.FC]> = [
  ['MG01-Hero', MG01],
  ['MG02-Consenso', MG02],
  ['MG03-Ferramentas', MG03],
  ['MG04-Diagnostico', MG04],
  ['MG05-Ecg', MG05],
  ['MG06-Interacao', MG06],
  ['MG07-Laboratorio', MG07],
  ['MG08-Fontes', MG08],
  ['MG09-Numeros', MG09],
  ['MG10-Cta', MG10],
];
