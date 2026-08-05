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
      <div style={{ width: '100%', paddingLeft: 20, paddingRight: 20 }}>
        {it.map((x, i) => {
          const [emoji, ...rest] = x.split('|');
          return <Row key={i} p={p}><span style={{ fontSize: 34 }}>{emoji.trim()}</span>{rest.join('|').trim()}</Row>;
        })}
      </div>
    );
  }
  if (post.layout === 'checklist') {
    return (
      <div style={{ width: '100%', paddingLeft: 20, paddingRight: 20 }}>
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
      <div style={{ width: '100%', paddingLeft: 20, paddingRight: 20 }}>
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
      <div style={{ width: '100%' }}>
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
      <div style={{ width: '100%', paddingLeft: 50, paddingRight: 50 }}>
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
    <div style={{ width: '100%', paddingLeft: 20, paddingRight: 20, textAlign: 'center' }}>
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
      <div style={{ position: 'absolute', top: 100, left: 0, right: 0 }}>
        <Logo dark={post.theme === 'dark'} />
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 240 }}>
        <Hl text={post.headline} color={p.ink} />
        {post.sub && (
          <div style={{ fontFamily: BODY, fontSize: 27, color: p.mut, textAlign: 'center', marginTop: 16, lineHeight: 1.4 }}>
            {post.sub}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 440, bottom: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Body post={post} />
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, bottom: 200 }}>
        <div style={{
          background: O_RED, borderRadius: 20, padding: '22px 30px', textAlign: 'center',
          boxShadow: '0 18px 46px -14px rgba(224,45,45,0.5)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE, lineHeight: 1.35,
        }}>{post.takeaway}</div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 120, textAlign: 'center',
        fontFamily: MONO, fontWeight: 700, fontSize: 22, color: post.theme === 'dark' ? '#98a1b0' : '#6b7280',
      }}>
        onemedcursos.com.br · teste grátis
      </div>
    </AbsoluteFill>
  );
};

/* dados preenchidos a partir do júri (workflow) */
export const POSTS: Post[] = [
  {
    "id": "P01",
    "theme": "light",
    "layout": "diagrama",
    "headline": "A curva do *esquecimento* em 3 fatos",
    "sub": "Por que a aula de ontem já sumiu",
    "items": [
      "Fato 1: você esquece mais nas primeiras horas",
      "Fato 2: reler não segura a memória",
      "Fato 3: revisão espaçada achata a curva"
    ],
    "takeaway": "Na OneMed, flashcards gerados por IA do seu próprio material fazem a revisão espaçada por você."
  },
  {
    "id": "P02",
    "theme": "dark",
    "layout": "duascolunas",
    "headline": "Revisão passiva × revisão *ativa*",
    "sub": "Mesmo tempo de estudo, resultado muito diferente",
    "items": [
      "Reler o resumo|Fechar e tentar lembrar",
      "Grifar o livro|Explicar em voz alta",
      "Assistir a aula de novo|Responder questões do tema",
      "Sensação de domínio|Prova real do que sabe"
    ],
    "takeaway": "Terminou a aula na OneMed? Um clique gera resumo, flashcards e questões pra revisar ativo."
  },
  {
    "id": "P03",
    "theme": "light",
    "layout": "passos",
    "headline": "Como dividir um bloco de *2h* de estudo",
    "sub": "120 minutos com começo, meio e fim",
    "items": [
      "🎯|5 min: defina o que quer sair sabendo",
      "📖|50 min: conteúdo novo, celular em outro cômodo",
      "☕|10 min: pausa de verdade, longe da tela",
      "✍️|40 min: questões e resumo ativo do tema",
      "🔁|15 min: revise os erros, anote as dúvidas"
    ],
    "takeaway": "Na OneMed o bloco fecha redondo: aula, resumo em 1 clique e questões comentadas no mesmo lugar."
  },
  {
    "id": "P04",
    "theme": "dark",
    "layout": "checklist",
    "headline": "Faltam 7 dias: o *checklist* final",
    "sub": "Semana final é pra consolidar, não descobrir",
    "items": [
      "📵|D-7: pare de caçar material novo",
      "❌|D-6: refaça só as questões que errou",
      "⚖️|D-5: priorize os temas de maior peso",
      "⏱️|D-3: simulado cronometrado, condição real de prova",
      "🃏|D-2: revisão leve — flashcards e resumos",
      "😴|D-1: logística pronta e sono cedo"
    ],
    "takeaway": "O cronograma por IA da OneMed já distribui esses 7 dias com marcos e checklist."
  },
  {
    "id": "P05",
    "theme": "light",
    "layout": "passos",
    "headline": "3 perguntas antes de montar o *cronograma*",
    "sub": "Responda antes de abrir a agenda",
    "items": [
      "🎯|Objetivo: qual prova e qual banca você mira",
      "⏰|Horas: quantas horas reais sobram por semana",
      "📅|Data: quantas semanas faltam até o dia D",
      "🧮|Divida o conteúdo pelo tempo — nunca o contrário"
    ],
    "takeaway": "Responda as 3 na OneMed e a IA monta o cronograma com mapa mental navegável."
  },
  {
    "id": "P06",
    "theme": "dark",
    "layout": "lista",
    "headline": "Pomodoro adaptado pra quem dá *plantão*",
    "sub": "A escala manda — o método se adapta",
    "items": [
      "⏱️|Troque 25/5 por ciclos de 45/10",
      "🌙|Pós-plantão: revisão leve, nunca conteúdo novo",
      "🃏|Fila do corredor vira ciclo curto de flashcards",
      "🗓️|Planeje pela escala do mês, não pelo relógio",
      "😴|Dormiu depois do plantão? Também é método"
    ],
    "takeaway": "Na OneMed o cronograma por IA aceita sua escala — e os flashcards cabem no corredor."
  },
  {
    "id": "P07",
    "theme": "light",
    "layout": "lista",
    "headline": "4 regras do *flashcard* bem feito",
    "sub": "Card ruim vira decoreba; card bom vira memória",
    "items": [
      "1️⃣|Uma pergunta, uma resposta — nunca duas ideias",
      "2️⃣|Pergunte 'por quê', não só 'o quê'",
      "3️⃣|Escreva com suas palavras, não copie o livro",
      "4️⃣|Card que você errou volta primeiro na fila"
    ],
    "takeaway": "Na OneMed os cards por IA já seguem as regras — e a fila prioriza o que você errou."
  },
  {
    "id": "P08",
    "theme": "dark",
    "layout": "passos",
    "headline": "*Anatomia* de uma questão: aprenda com o erro",
    "sub": "O erro certo ensina mais que o acerto por sorte",
    "items": [
      "🔍|Releia o enunciado: qual palavra te derrubou",
      "🏷️|Nomeie o erro: conteúdo, leitura ou pressa",
      "📖|Volte à fonte e feche a lacuna hoje",
      "🃏|Transforme o erro em flashcard ou nota",
      "🔁|Refaça a mesma questão em três dias"
    ],
    "takeaway": "No banco de questões da OneMed toda resposta vem comentada: o erro já sai explicado."
  },
  {
    "id": "P09",
    "theme": "light",
    "layout": "duascolunas",
    "headline": "O que rende quando você estuda *cansado*",
    "sub": "Com sono, escolha a coluna da esquerda",
    "items": [
      "Flashcards de temas vistos|Capítulo novo e denso",
      "Questões comentadas em dose curta|Videoaula de duas horas",
      "Organizar o dia seguinte|Decorar do zero",
      "Revisar seus próprios resumos|Texto novo e difícil"
    ],
    "takeaway": "Cansado? Abre a OneMed, roda flashcards prontos e fecha o dia sem culpa."
  },
  {
    "id": "P10",
    "theme": "dark",
    "layout": "lista",
    "headline": "5 sinais de que você só *relê*",
    "sub": "Reconhecer não é saber",
    "items": [
      "🚩|Reconhece a página, mas não explica sem olhar",
      "🚩|Grifou tanto que virou livro de colorir",
      "🚩|Nunca fecha o material pra se testar",
      "🚩|Questão nova do mesmo tema ainda te surpreende",
      "🚩|Sensação de 'já sei' sem nenhum erro registrado"
    ],
    "takeaway": "Prova real: gere questões do capítulo na OneMed e veja o placar honesto."
  },
  {
    "id": "P11",
    "theme": "light",
    "layout": "mito_verdade",
    "headline": "Estudar com *IA*: mito × verdade",
    "sub": "O que ela faz — e o que continua sendo com você",
    "items": [
      "IA estuda por você|IA acelera; quem aprende é você",
      "Resumo pronto basta|Resumo abre caminho, questão fixa o conteúdo",
      "Flashcard genérico serve|Flashcard do SEU material rende mais",
      "IA nunca erra|Confira no material: você é o filtro"
    ],
    "takeaway": "Na OneMed a IA encurta o caminho — responder, conferir e fixar segue sendo seu papel."
  },
  {
    "id": "P12",
    "theme": "dark",
    "layout": "bigstat",
    "headline": "As *168h* que você já tem",
    "sub": "Não falta tempo, falta mapa",
    "items": [
      "168",
      "horas na sua semana, todas as semanas",
      "mapeie as fixas: o que sobrar é estudo"
    ],
    "takeaway": "Ache seus blocos livres e trave-os no cronograma gerado por IA da OneMed."
  },
  {
    "id": "P13",
    "theme": "light",
    "layout": "passos",
    "headline": "O método dos 3 *toques*",
    "sub": "Fricção pequena mata sessão de estudo grande",
    "items": [
      "📌|Liste o que você abre todo dia",
      "⭐|Favorite: aula, livro e banco de questões",
      "🔍|Busque o tema: um toque, sem menus",
      "✂️|Mais de 3 toques? Corte o caminho"
    ],
    "takeaway": "Na OneMed, busca unificada + favoritos deixam qualquer material a até 3 toques."
  },
  {
    "id": "P14",
    "theme": "dark",
    "layout": "passos",
    "headline": "Acervo Público explicado em 4 *passos*",
    "sub": "Materiais compartilhados entre +10.000 médicos e estudantes",
    "items": [
      "🌐|Abra o Acervo Público no menu",
      "🔍|Busque o tema: acha arquivos DENTRO dos materiais",
      "⭐|Salve nos favoritos o que servir",
      "🤝|Suba seu material e ajude o próximo"
    ],
    "takeaway": "O resumo que você procura talvez já exista — busque no Acervo antes de garimpar fora."
  },
  {
    "id": "P15",
    "theme": "light",
    "layout": "lista",
    "headline": "3 usos da IA que *lê* sua tela",
    "sub": "O assistente enxerga a aula que está aberta",
    "items": [
      "❓|Travou num termo? Pergunte sem pausar a aula",
      "🗣️|Peça: explica mais simples, com exemplo clínico",
      "📝|Peça perguntas sobre a tela pra se testar"
    ],
    "takeaway": "Na OneMed, o assistente responde no contexto do que você está vendo — dúvida morre na hora."
  },
  {
    "id": "P16",
    "theme": "dark",
    "layout": "diagrama",
    "headline": "Do material ao *baralho* em minutos",
    "sub": "Nada de flashcard genérico de internet",
    "items": [
      "Seu material aberto",
      "IA extrai os pontos-chave",
      "Flashcards prontos pra revisar",
      "Questões com resposta comentada",
      "Você responde e fixa"
    ],
    "takeaway": "Esse fluxo inteiro é 1 clique na OneMed — sem montar card, sem sair da aula."
  },
  {
    "id": "P17",
    "theme": "light",
    "layout": "checklist",
    "headline": "Checklist do seu *primeiro* dia",
    "sub": "Meia hora que organiza todo o resto",
    "items": [
      "🎯|Defina sua prova-alvo antes de abrir cursos",
      "🔍|Teste a busca com um tema que domina",
      "⭐|Favorite 1 curso, 1 livro, 1 banco",
      "🗓️|Gere seu cronograma por IA com prazo real",
      "👥|Entre na comunidade e se apresente"
    ],
    "takeaway": "Comece pelo teste grátis da OneMed e rode esse checklist ainda hoje."
  },
  {
    "id": "P18",
    "theme": "dark",
    "layout": "diagrama",
    "headline": "Revisar em *24h* muda tudo",
    "sub": "O calendário de revisões que segura o conteúdo",
    "items": [
      "Aula hoje",
      "Revisão rápida em 24h",
      "Questões do tema em 3 dias",
      "Flashcards na semana",
      "Revisão leve antes da prova",
      "Memória de longo prazo"
    ],
    "takeaway": "Feche o dia respondendo os flashcards que a IA gerou da aula de hoje."
  },
  {
    "id": "P19",
    "theme": "light",
    "layout": "lista",
    "headline": "+530 cursos: 3 jeitos de não se *perder*",
    "sub": "+9.000 livros também moram aqui",
    "items": [
      "🔍|Comece pela busca unificada: aula, livro e questão",
      "⭐|Favoritos: sua estante enxuta da semana",
      "🗓️|Deixe o cronograma dizer o que abrir hoje"
    ],
    "takeaway": "Acervo grande sem método vira ansiedade; com busca, favoritos e cronograma vira arsenal."
  },
  {
    "id": "P20",
    "theme": "dark",
    "layout": "bigstat",
    "headline": "A pergunta que organiza *tudo*",
    "sub": "Antes do cronograma, antes de qualquer curso",
    "items": [
      "1 pergunta",
      "o que cai na SUA prova?",
      "ela decide curso, livro, questão e ordem"
    ],
    "takeaway": "Definiu a prova? Na busca unificada da OneMed, ache só o que cai nela — aula, livro e questão."
  }
];

export const makePostComp = (post: Post): React.FC => {
  const C: React.FC = () => <PostImage post={post} />;
  return C;
};
