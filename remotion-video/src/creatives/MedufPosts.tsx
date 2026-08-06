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

/* densidade: com poucos itens o card cresce para ocupar bem o quadro */
const dens = (n: number) => (n <= 3 ? { pad: '38px 34px', fs: 33, gap: 24, mb: 20 }
  : n === 4 ? { pad: '30px 30px', fs: 30, gap: 22, mb: 17 }
  : { pad: '22px 28px', fs: 28, gap: 20, mb: 14 });

const Card: React.FC<{ p: typeof PAL.light; children: React.ReactNode; n: number }> = ({ p, children, n }) => {
  const d = dens(n);
  return (
    <div style={{
      background: p.card, border: `1.5px solid ${p.line}`, borderRadius: 18, padding: d.pad,
      marginBottom: d.mb, display: 'flex', alignItems: 'center', gap: d.gap,
      boxShadow: `0 12px 30px -14px ${p.shadow}`,
      fontFamily: HEAD, fontWeight: 700, fontSize: d.fs, color: p.ink, lineHeight: 1.32,
    }}>{children}</div>
  );
};

const Body: React.FC<{ post: MPost }> = ({ post }) => {
  const p = PAL[post.theme];
  const it = post.items;

  if (post.layout === 'lista') {
    return (
      <>{it.map((x, i) => (
        <Card key={i} p={p} n={it.length}>
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
        <Card key={i} p={p} n={it.length}>
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
        <Card key={i} p={p} n={it.length}>
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
      <div style={{
        fontFamily: HEAD, fontWeight: 900,
        fontSize: num.length <= 4 ? 210 : num.length <= 7 ? 150 : 104,
        color: p.ink, letterSpacing: num.length <= 4 ? -9 : -4, lineHeight: 1.02,
      }}>{num}</div>
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

export const MEDUF_POSTS: MPost[] = [
  {
    "id": "N01",
    "theme": "light",
    "layout": "passos",
    "kicker": "METODO",
    "headline": "Descreva o caso *como no round*",
    "sub": "A qualidade da resposta começa na forma da pergunta.",
    "items": [
      "Comece por idade, sexo e tempo de evolução",
      "Descreva a queixa com início, ritmo e fatores",
      "Liste comorbidades, medicações em uso e alergias",
      "Informe sinais vitais e achados do exame físico",
      "Anexe os exames já feitos antes de perguntar",
      "Diga o que quer: diferencial, revisão ou registro"
    ],
    "takeaway": "No chat clínico da MEDUF, caso bem descrito rende resposta útil."
  },
  {
    "id": "N02",
    "theme": "dark",
    "layout": "lista",
    "kicker": "PRONTUARIO",
    "headline": "O que o prontuário longo *esconde*",
    "sub": "Paciente transferido chega com anos de registro para revisar.",
    "items": [
      "Medicações ativas repetidas com nomes comerciais diferentes",
      "Alergia anotada uma única vez, anos atrás",
      "Exame alterado que ninguém reavaliou depois"
    ],
    "takeaway": "A análise de prontuário da MEDUF destaca o que revisar; a conferência é sua."
  },
  {
    "id": "N03",
    "theme": "light",
    "layout": "checklist",
    "kicker": "ANAMNESE",
    "headline": "A anamnese que *sustenta a conduta*",
    "sub": "Roteiro que evita voltar ao leito por informação faltando.",
    "items": [
      "Queixa principal na fala do próprio paciente",
      "História atual com início, evolução e fatores",
      "Antecedentes pessoais, cirúrgicos e familiares relevantes",
      "Medicações em uso, doses e adesão real",
      "Alergias, hábitos, ocupação e contexto social",
      "Revisão de sistemas dirigida às hipóteses levantadas"
    ],
    "takeaway": "A estruturação de anamnese da MEDUF organiza; o registro final é seu."
  },
  {
    "id": "N04",
    "theme": "dark",
    "layout": "duascolunas",
    "kicker": "DIFERENCIAL",
    "headline": "Diferencial rápido ou *detalhado*: quando usar",
    "sub": "O mesmo paciente pede profundidades diferentes conforme a hora.",
    "items": [
      "Paciente instável, decisão em minutos|Caso ambulatorial que não fecha",
      "Poucas hipóteses, ordenadas por gravidade|Lista ampla, com prevalência e contexto",
      "Confirma o que não pode passar|Explora o que ainda não pensou",
      "À beira do leito, na emergência|Revisão do caso depois do plantão",
      "Serve para agir agora|Serve para destrinchar o caso"
    ],
    "takeaway": "Os dois modos existem na MEDUF; a hipótese que você segue é sua."
  },
  {
    "id": "N05",
    "theme": "light",
    "layout": "checklist",
    "kicker": "SEGURANCA",
    "headline": "Antes de prescrever ao *idoso polimedicado*",
    "sub": "Cada droga nova entra num sistema que já está cheio.",
    "items": [
      "Levantar tudo que ele usa, incluindo automedicação",
      "Rever função renal e hepática antes da dose",
      "Checar interações com o que já está prescrito",
      "Procurar cascata: sintoma que é efeito adverso",
      "Perguntar o que dá para suspender agora",
      "Simplificar a posologia para favorecer a adesão"
    ],
    "takeaway": "Interação medicamentosa e cálculo de dose na mesma tela da MEDUF; quem prescreve é você."
  },
  {
    "id": "N06",
    "theme": "dark",
    "layout": "fluxo",
    "kicker": "REAVALIACAO",
    "headline": "Não melhorou: *revise antes de trocar*",
    "sub": "Falha de tratamento raramente começa na escolha do fármaco.",
    "items": [
      "Confirme se o diagnóstico ainda explica tudo",
      "Cheque a adesão real ao que foi prescrito",
      "Revise dose, via e tempo de tratamento",
      "Procure interação que reduza o efeito esperado",
      "Considere complicação ou segunda doença associada",
      "Só então reveja a escolha terapêutica"
    ],
    "takeaway": "A MEDUF ajuda a revisar o caso inteiro; a troca de conduta é sua."
  },
  {
    "id": "N07",
    "theme": "light",
    "layout": "duascolunas",
    "kicker": "LIMITES",
    "headline": "O que a tela *não examina*",
    "sub": "Duas colunas para separar apoio de exame clínico.",
    "items": [
      "Organizar um diferencial amplo|Palpar o abdome e sentir a defesa",
      "Revisar interações da prescrição|Medir pressão e perfusão à beira do leito",
      "Recuperar evidência no PubMed|Perceber o paciente que mudou de aspecto",
      "Estruturar anamnese e registro|Ausculta, fundo de olho, exame neurológico",
      "Sugerir exames a considerar|Decidir urgência olhando para o paciente"
    ],
    "takeaway": "A MEDUF cobre a coluna da esquerda; a da direita é presencial e sua."
  },
  {
    "id": "N08",
    "theme": "dark",
    "layout": "lista",
    "kicker": "ALTA",
    "headline": "Antes da alta, *três perguntas*",
    "sub": "A porta de saída é onde o erro aparece depois.",
    "items": [
      "O que ainda pode piorar nas próximas horas",
      "As hipóteses graves foram afastadas ou apenas adiadas",
      "O paciente entendeu quando precisa retornar"
    ],
    "takeaway": "Na MEDUF você revisa sinais de alarme; a alta continua sendo decisão sua."
  },
  {
    "id": "N09",
    "theme": "light",
    "layout": "passos",
    "kicker": "FERRAMENTA",
    "headline": "Dite o caso de *mãos ocupadas*",
    "sub": "Consulta por voz para quem não pode parar de atender.",
    "items": [
      "Dite o caso como você passa no round",
      "Fale números e unidades com pausa",
      "Soletre nomes de medicações pouco comuns",
      "Peça o formato desejado antes de encerrar",
      "Revise a transcrição antes de usar qualquer trecho",
      "Leve o resumo revisado para o prontuário"
    ],
    "takeaway": "A consulta por voz da MEDUF escreve; a revisão final é sua."
  },
  {
    "id": "N10",
    "theme": "dark",
    "layout": "checklist",
    "kicker": "REVISAO",
    "headline": "Seis conferências antes de *aceitar a sugestão*",
    "sub": "O intervalo entre ler a sugestão e assumir a conduta.",
    "items": [
      "A sugestão bate com o paciente à sua frente",
      "Há fonte citada e ela sustenta aquilo",
      "Dose, via e intervalo conferem para este paciente",
      "Alergias, função renal e gestação foram considerados",
      "Algum sinal de alarme ficou sem resposta",
      "Você assinaria isso e defenderia depois"
    ],
    "takeaway": "A MEDUF entrega a sugestão organizada; a última checagem é do médico."
  },
  {
    "id": "N11",
    "theme": "light",
    "layout": "lista",
    "kicker": "ECG",
    "headline": "O ECG diz *mais que o ritmo*",
    "sub": "O que a análise devolve, ponto a ponto.",
    "items": [
      "Frequência, eixo e intervalos revisados um a um",
      "Sinais de sobrecarga e distúrbios de condução",
      "Alterações de repolarização destacadas para conferência",
      "Achados que pedem atenção imediata sinalizados",
      "Correlação com o quadro clínico que você informou"
    ],
    "takeaway": "A MEDUF organiza o que olhar no traçado; a leitura final é sua."
  },
  {
    "id": "N12",
    "theme": "dark",
    "layout": "fluxo",
    "kicker": "LABORATORIO",
    "headline": "Do resultado bruto ao *raciocínio organizado*",
    "sub": "O que entra e o que sai na análise laboratorial.",
    "items": [
      "Entra: o exame em foto, PDF ou texto",
      "Entra: idade, sexo, quadro clínico e medicações",
      "Sai: valores fora da faixa agrupados por eixo",
      "Sai: hipóteses que explicam o conjunto, não o isolado",
      "Sai: o que confirmar e o que repetir"
    ],
    "takeaway": "Na MEDUF o resultado é lido no contexto; a conduta continua sendo sua."
  },
  {
    "id": "N13",
    "theme": "light",
    "layout": "lista",
    "kicker": "DOSE",
    "headline": "Quando a dose *precisa de ajuste*",
    "sub": "Situações em que a conta padrão não serve.",
    "items": [
      "Função renal reduzida em fármaco de eliminação renal",
      "Peso extremo: neonato, criança, obesidade grave",
      "Hepatopatia em fármaco de metabolismo hepático",
      "Interação que altera o metabolismo do fármaco",
      "Janela terapêutica estreita, com pouca margem"
    ],
    "takeaway": "A calculadora de dose da MEDUF faz a conta; quem prescreve é o médico."
  },
  {
    "id": "N14",
    "theme": "dark",
    "layout": "passos",
    "kicker": "TOXICOLOGIA",
    "headline": "Intoxicação: os *primeiros minutos* mandam",
    "sub": "A sequência que a ferramenta ajuda a manter.",
    "items": [
      "Estabilize primeiro: via aérea, respiração e circulação",
      "Levante agente, dose estimada e tempo de exposição",
      "Reconheça a síndrome tóxica pelos sinais vitais e pupilas",
      "Revise antídoto e medidas de descontaminação cabíveis",
      "Acione o centro de informação toxicológica da região"
    ],
    "takeaway": "A MEDUF sustenta o roteiro enquanto você conduz o atendimento."
  },
  {
    "id": "N15",
    "theme": "light",
    "layout": "duascolunas",
    "kicker": "EXAMES",
    "headline": "Pedir *menos exames*, pedir melhor",
    "sub": "Pedido no automático de um lado, pedido com hipótese do outro.",
    "items": [
      "Painel amplo por reflexo|Exame guiado pela hipótese",
      "Resultado que não muda conduta|Resultado que confirma ou afasta",
      "Achado incidental sem contexto|Menos ruído, menos repetição",
      "Custo e tempo do paciente|Espera menor, resposta antes",
      "Lista decorada da residência|Racional revisado a cada caso"
    ],
    "takeaway": "A sugestão de exames da MEDUF vem fundamentada; quem assina o pedido é você."
  },
  {
    "id": "N16",
    "theme": "dark",
    "layout": "mito_verdade",
    "kicker": "GESTACAO",
    "headline": "Gestação: *suspender tudo* não é seguro",
    "sub": "O que se repete no corredor e o que se confere na fonte.",
    "items": [
      "Na dúvida, suspenda tudo|Doença materna sem tratamento também tem risco",
      "Nenhum fármaco é seguro na gestação|Muitos têm uso consolidado e bem estudado",
      "Amamentar impede qualquer tratamento|Boa parte dos fármacos é compatível",
      "A categoria de risco resolve sozinha|Trimestre, dose e alternativa também pesam",
      "Basta lembrar da faculdade|Recomendações mudam e precisam ser conferidas"
    ],
    "takeaway": "O guia de medicação da MEDUF mostra as opções; a escolha é sua."
  },
  {
    "id": "N17",
    "theme": "light",
    "layout": "lista",
    "kicker": "IMAGEM",
    "headline": "Imagem sem contexto rende *leitura pobre*",
    "sub": "O que enviar junto para a análise valer alguma coisa.",
    "items": [
      "Envie a imagem com a indicação do exame",
      "Diga o quadro clínico e o tempo de evolução",
      "Aponte a região que motivou o pedido",
      "Informe exames anteriores disponíveis para comparação",
      "Confronte os achados com o laudo do radiologista"
    ],
    "takeaway": "A análise de RX e tomografia da MEDUF apoia sua leitura; o laudo é do radiologista."
  },
  {
    "id": "N18",
    "theme": "dark",
    "layout": "fluxo",
    "kicker": "ENCAMINHAMENTO",
    "headline": "Do seu limite ao *encaminhamento certo*",
    "sub": "Encaminhar bem é entregar o caso já organizado.",
    "items": [
      "Defina a pergunta que motiva o encaminhamento",
      "Reúna história, exames e tratamentos já tentados",
      "Verifique o que o serviço de destino exige",
      "Registre a hipótese e o grau de urgência",
      "Oriente o paciente sobre prazo e sinais de alarme"
    ],
    "takeaway": "A MEDUF organiza o resumo do caso; o encaminhamento é decisão sua."
  },
  {
    "id": "N19",
    "theme": "light",
    "layout": "lista",
    "kicker": "ESTUDANTE",
    "headline": "Estude com IA sem *terceirizar o raciocínio*",
    "sub": "Como usar a ferramenta e continuar pensando.",
    "items": [
      "Formule sua hipótese antes de abrir o chat",
      "Peça o raciocínio, não só a resposta final",
      "Compare o que você pensou com o que veio",
      "Abra a referência citada e confira",
      "Leve ao caso real com supervisão do preceptor"
    ],
    "takeaway": "A MEDUF acelera o estudo; o raciocínio clínico continua sendo seu."
  },
  {
    "id": "N20",
    "theme": "dark",
    "layout": "bigstat",
    "kicker": "EVIDENCIA",
    "headline": "O que *nenhuma memória* comporta",
    "sub": "O tamanho real da literatura que sustenta a clínica.",
    "items": [
      "35 milhões+",
      "artigos indexados no PubMed",
      "Nenhuma memória guarda isso; a busca guarda"
    ],
    "takeaway": "Na MEDUF a pergunta em português chega ao PubMed; a leitura crítica é sua."
  }
];

export const makeMedufPost = (post: MPost): React.FC => {
  const C: React.FC = () => <MedufPost post={post} />;
  return C;
};
