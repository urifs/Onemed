import React from 'react';
import { AbsoluteFill } from 'remotion';
import {
  FontesPrism, AREIA, PORCELANA, LINHO, ROSA_PO, ROSA, CAFE, TAUPE, SALVIA, AMBAR,
  DISPLAY, SANS,
} from './prismkit';

/* ============================================================
   Posts de feed da prism.face — 1080×1350 (4:5), estáticos.
   Conteúdo que se salva: o que a pele faz, por que o ritual é
   nessa ordem, o que esperar e quando. Sistema visual do produto
   (areia · Prata · Figtree · arco de 180°).
   ============================================================ */

const SOMBRA = '0 1px 2px rgba(63,53,46,0.06), 0 8px 24px rgba(63,53,46,0.06)';
const W = 1080, H = 1350;

/* ---------- peças ---------- */

const Fundo: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: AREIA }} />
    <AbsoluteFill style={{
      background: `radial-gradient(58% 34% at 16% 8%, ${ROSA_PO}90, transparent 70%),
                   radial-gradient(52% 30% at 86% 94%, ${LINHO}b0, transparent 70%)`,
    }} />
    <AbsoluteFill style={{
      backgroundImage: 'radial-gradient(rgba(63,53,46,0.05) 1px, transparent 1px)',
      backgroundSize: '26px 26px', opacity: 0.5,
    }} />
  </>
);

const Arco: React.FC<{ largura?: number; espessura?: number; cor?: string; parcial?: number }> =
  ({ largura = 190, espessura = 3, cor = ROSA, parcial = 1 }) => {
    const h = largura / 2 + espessura;
    const r = largura / 2 - espessura;
    const d = `M ${espessura} ${h - espessura} A ${r} ${r} 0 0 1 ${largura - espessura} ${h - espessura}`;
    const comp = Math.PI * r;
    return (
      <svg width={largura} height={h} style={{ overflow: 'visible', display: 'block' }}>
        <path d={d} fill="none" stroke={LINHO} strokeWidth={espessura} strokeLinecap="round" />
        <path d={d} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round"
          strokeDasharray={comp} strokeDashoffset={comp * (1 - parcial)} />
      </svg>
    );
  };

const Marca: React.FC = () => (
  <div style={{
    position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center',
    fontFamily: DISPLAY, fontSize: 40, color: CAFE, letterSpacing: '-0.01em',
  }}>prism.face</div>
);

const Rodape: React.FC<{ texto?: string }> = ({ texto = 'prismface.com.br' }) => (
  <div style={{
    position: 'absolute', bottom: 46, left: 0, right: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  }}>
    <Arco largura={140} espessura={2.5} />
    <div style={{
      fontFamily: SANS, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: TAUPE, marginTop: -4,
    }}>{texto}</div>
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontFamily: SANS, fontSize: 23, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: TAUPE, fontWeight: 500, textAlign: 'center',
  }}>{children}</div>
);

const Titulo: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> =
  ({ children, size = 66, style }) => (
    <div style={{
      fontFamily: DISPLAY, fontSize: size, lineHeight: 1.15, color: CAFE,
      letterSpacing: '-0.01em', textAlign: 'center', ...style,
    }}>{children}</div>
  );

const Corpo: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> =
  ({ children, size = 27, style }) => (
    <div style={{
      fontFamily: SANS, fontSize: size, lineHeight: 1.5, color: `${CAFE}dd`, ...style,
    }}>{children}</div>
  );

const Cartao: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> =
  ({ children, style }) => (
    <div style={{
      background: PORCELANA, borderRadius: 14, boxShadow: SOMBRA,
      border: `1px solid ${LINHO}`, padding: '26px 30px', ...style,
    }}>{children}</div>
  );

const Cabecalho: React.FC<{ eyebrow: string; titulo: React.ReactNode; size?: number; top?: number }> =
  ({ eyebrow, titulo, size = 66, top = 148 }) => (
    <div style={{ position: 'absolute', top, left: 70, right: 70 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Titulo size={size} style={{ marginTop: 16 }}>{titulo}</Titulo>
    </div>
  );

/* rostinho do sistema (o mesmo desenho do app), virado para um lado */
const Rostinho: React.FC<{ dir: 'frente' | 'esq' | 'dir' | 'cima' | 'baixo'; tam?: number }> =
  ({ dir, tam = 92 }) => {
    const dx = dir === 'esq' ? -9 : dir === 'dir' ? 9 : 0;
    const dy = dir === 'cima' ? -7 : dir === 'baixo' ? 7 : 0;
    return (
      <svg width={tam} height={tam * 1.22} viewBox="0 0 60 73">
        <ellipse cx="30" cy="34" rx="21" ry="27" fill="none" stroke={CAFE} strokeWidth="1.6" />
        <circle cx={22 + dx * 0.5} cy={30 + dy} r="1.9" fill={CAFE} />
        <circle cx={38 + dx * 0.5} cy={30 + dy} r="1.9" fill={CAFE} />
        <path d={`M ${30 + dx} ${36 + dy} q 2 4 -1 6`} fill="none" stroke={CAFE} strokeWidth="1.6" strokeLinecap="round" />
        <path d={`M ${24 + dx * 0.6} ${46 + dy} q 6 3 12 0`} fill="none" stroke={ROSA} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  };

const Barra: React.FC<{ p: number; cor?: string; largura?: number }> =
  ({ p, cor = ROSA, largura = 250 }) => (
    <div style={{ width: largura, height: 7, borderRadius: 999, background: LINHO, overflow: 'hidden' }}>
      <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 999, background: cor }} />
    </div>
  );

const Passo: React.FC<{ n: string; titulo: string; texto: string; cor?: string }> =
  ({ n, titulo, texto, cor = ROSA }) => (
    <Cartao style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{
        fontFamily: DISPLAY, fontSize: 44, color: cor, lineHeight: 1, minWidth: 54, textAlign: 'center',
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 31, color: CAFE }}>{titulo}</div>
        <Corpo size={25} style={{ marginTop: 7, color: `${CAFE}c0` }}>{texto}</Corpo>
      </div>
    </Cartao>
  );

const Base: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ width: W, height: H }}>
    <FontesPrism />
    <Fundo />
    <Marca />
    {children}
    <Rodape />
  </AbsoluteFill>
);

/* ============================================================
   P01 — a ordem do ritual
   ============================================================ */
export const PP01: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="por que nesta ordem"
      titulo={<>Limpar, tratar,<br />hidratar, proteger</>}
    />
    <div style={{ position: 'absolute', top: 392, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Passo n="01" titulo="Limpar" texto="Sem tirar a oleosidade do dia, o ativo do próximo passo nem encosta na pele." />
      <Passo n="02" titulo="Tratar" texto="O ativo vai na pele limpa e seca — é onde ele funciona, e onde irrita menos." />
      <Passo n="03" titulo="Hidratar" texto="Repõe a barreira que o ativo mexeu. É o que deixa continuar amanhã." />
      <Passo n="04" titulo="Proteger" texto="De manhã, sem filtro o resto não se sustenta: o sol desfaz o que foi feito." />
    </div>
    <div style={{ position: 'absolute', bottom: 176, left: 90, right: 90 }}>
      <Corpo size={26} style={{ textAlign: 'center', color: TAUPE }}>
        Na prism.face o seu ritual já vem nessa ordem — com a quantidade e o
        tempo de espera de cada passo.
      </Corpo>
    </div>
  </Base>
);

/* ============================================================
   P02 — leve, moderada, intensa
   ============================================================ */
export const PP02: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="sem jargão"
      titulo={<>Leve, moderada,<br />intensa</>}
    />
    <div style={{ position: 'absolute', top: 400, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[
        ['Oleosidade', 'testa, nariz e queixo', 'intensa', 0.86, ROSA],
        ['Poros dilatados', 'testa e bochechas', 'moderada', 0.58, AMBAR],
        ['Marcas pós-acne', 'bochechas', 'leve', 0.3, SALVIA],
      ].map(([nome, onde, nivel, p, cor]) => (
        <Cartao key={nome as string} style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 31, color: CAFE }}>{nome}</div>
            <Corpo size={23} style={{ marginTop: 5, color: TAUPE }}>{onde}</Corpo>
            <div style={{ marginTop: 14 }}><Barra p={p as number} cor={cor as string} largura={430} /></div>
          </div>
          <div style={{
            fontFamily: SANS, fontSize: 24, fontWeight: 600, color: cor as string,
            letterSpacing: '0.04em', minWidth: 130, textAlign: 'right',
          }}>{nivel}</div>
        </Cartao>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 172, left: 84, right: 84 }}>
      <Corpo size={27} style={{ textAlign: 'center' }}>
        A sua leitura não devolve nome de laudo. Devolve <b>o que é</b>,
        <b> onde está</b> e <b>o quanto</b> — que é o que decide o ritual.
      </Corpo>
    </div>
  </Base>
);

/* ============================================================
   P03 — por que cinco poses
   ============================================================ */
export const PP03: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="a captura"
      titulo={<>Cinco poses.<br />Cada uma mostra<br />uma coisa.</>}
      size={60}
    />
    <div style={{
      position: 'absolute', top: 430, left: 70, right: 70,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    }}>
      {(['esq', 'cima', 'frente', 'baixo', 'dir'] as const).map((d, i) => (
        <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ transform: `translateY(${i === 2 ? -14 : 0}px)` }}>
            <Rostinho dir={d} tam={i === 2 ? 104 : 88} />
          </div>
          <div style={{ fontFamily: SANS, fontSize: 22, color: TAUPE, letterSpacing: '0.06em' }}>
            {['esquerda', 'cima', 'frente', 'baixo', 'direita'][i]}
          </div>
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', top: 660, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[
        ['De frente', 'zona T, poros do nariz, o tom geral do rosto'],
        ['De lado', 'a mandíbula e a lateral da bochecha — onde a acne hormonal costuma ficar'],
        ['Queixo para cima', 'a linha do maxilar e o pescoço, que quase ninguém fotografa'],
        ['Queixo para baixo', 'a testa inteira e a linha do cabelo'],
      ].map(([t, d]) => (
        <div key={t}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: CAFE }}>{t}</div>
          <Corpo size={25} style={{ marginTop: 4, color: `${CAFE}bb` }}>{d}</Corpo>
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 178, left: 76, right: 76 }}>
      <Cartao style={{ background: `${ROSA_PO}66` }}>
        <Corpo size={26} style={{ textAlign: 'center' }}>
          A voz pede cada pose e um aviso sonoro confirma a foto — você não
          precisa olhar para a tela.
        </Corpo>
      </Cartao>
    </div>
  </Base>
);

/* ============================================================
   P04 — o mesmo rosto tem peles diferentes
   ============================================================ */
export const PP04: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="região por região"
      titulo={<>O mesmo rosto tem<br />peles diferentes</>}
      size={60}
    />
    <div style={{ position: 'absolute', top: 388, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <svg width={392} height={488} viewBox="0 0 196 244">
        <defs>
          <clipPath id="rosto">
            <path d="M 98 12 c 40 0 62 26 62 68 c 0 46 -12 76 -30 100 c -12 16 -20 24 -32 24 s -20 -8 -32 -24 c -18 -24 -30 -54 -30 -100 c 0 -42 22 -68 62 -68 z" />
          </clipPath>
        </defs>
        <g clipPath="url(#rosto)">
          <rect x="0" y="0" width="196" height="244" fill={PORCELANA} />
          {/* zona T */}
          <rect x="50" y="38" width="96" height="36" rx="18" fill={ROSA_PO} />
          <rect x="85" y="62" width="26" height="80" rx="13" fill={ROSA_PO} />
          {/* bochechas */}
          <ellipse cx="54" cy="116" rx="27" ry="32" fill={SALVIA} opacity="0.34" />
          <ellipse cx="142" cy="116" rx="27" ry="32" fill={SALVIA} opacity="0.34" />
          {/* mandíbula */}
          <path d="M 0 166 q 98 26 196 0 v 78 h -196 z" fill={AMBAR} opacity="0.28" />
        </g>
        <path d="M 98 12 c 40 0 62 26 62 68 c 0 46 -12 76 -30 100 c -12 16 -20 24 -32 24 s -20 -8 -32 -24 c -18 -24 -30 -54 -30 -100 c 0 -42 22 -68 62 -68 z"
          fill="none" stroke={CAFE} strokeWidth="2" />
        <path d="M 62 62 q 14 -8 28 -1" fill="none" stroke={CAFE} strokeWidth="2" strokeLinecap="round" />
        <path d="M 106 61 q 14 -7 28 1" fill="none" stroke={CAFE} strokeWidth="2" strokeLinecap="round" />
        <circle cx="76" cy="82" r="3.4" fill={CAFE} />
        <circle cx="120" cy="82" r="3.4" fill={CAFE} />
        <path d="M 98 92 q 5 20 -3 26" fill="none" stroke={CAFE} strokeWidth="2" strokeLinecap="round" />
        <path d="M 82 146 q 16 9 32 0" fill="none" stroke={ROSA} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
    <div style={{ position: 'absolute', top: 906, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 15 }}>
      {[
        [ROSA_PO, 'Zona T', 'mais glândula: brilho, poro e cravo aparecem primeiro aqui'],
        [`${SALVIA}59`, 'Bochechas', 'mais fina e mais seca: é onde o ativo forte costuma irritar'],
        [`${AMBAR}4d`, 'Mandíbula', 'responde a hormônio: a acne aqui vai e volta em ciclo'],
      ].map(([cor, nome, texto]) => (
        <div key={nome} style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: cor, border: `1px solid ${LINHO}`, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 27, color: CAFE }}>{nome} · </span>
            <span style={{ fontFamily: SANS, fontSize: 25, color: `${CAFE}bb`, lineHeight: 1.45 }}>{texto}</span>
          </div>
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 176, left: 76, right: 76 }}>
      <Cartao style={{ background: `${ROSA_PO}66` }}>
        <Corpo size={26} style={{ textAlign: 'center' }}>
          Um produto só para o rosto inteiro trata uma região e castiga a outra.
          Por isso a leitura é feita região por região.
        </Corpo>
      </Cartao>
    </div>
  </Base>
);

/* ============================================================
   P05 — o tempo de espera
   ============================================================ */
export const PP05: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="entre um passo e outro"
      titulo={<>Espere 1 minuto.<br />Faz diferença.</>}
      size={62}
    />
    <div style={{ position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Arco largura={300} espessura={5} parcial={0.62} />
        <div style={{ fontFamily: DISPLAY, fontSize: 74, color: CAFE, lineHeight: 1 }}>1 min</div>
      </div>
    </div>
    <div style={{ position: 'absolute', top: 690, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Cartao style={{ padding: '22px 28px' }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 29, color: CAFE }}>Pele molhada absorve diferente</div>
        <Corpo size={24} style={{ marginTop: 6, color: `${CAFE}bb` }}>
          O ativo entra mais rápido do que devia — e passa a arder.
        </Corpo>
      </Cartao>
      <Cartao style={{ padding: '22px 28px' }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 29, color: CAFE }}>Uma camada por vez</div>
        <Corpo size={24} style={{ marginTop: 6, color: `${CAFE}bb` }}>
          Produto úmido mistura fórmulas: some o efeito, sobra a irritação.
        </Corpo>
      </Cartao>
      <Cartao style={{ padding: '22px 28px' }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 29, color: CAFE }}>É o passo que ninguém cumpre</div>
        <Corpo size={24} style={{ marginTop: 6, color: `${CAFE}bb` }}>
          E é de graça. Nenhum produto compra o que a espera entrega.
        </Corpo>
      </Cartao>
    </div>
    <div style={{ position: 'absolute', bottom: 172, left: 90, right: 90 }}>
      <Corpo size={26} style={{ textAlign: 'center', color: TAUPE }}>
        No ritual guiado da prism.face, o tempo de espera de cada passo aparece
        na tela.
      </Corpo>
    </div>
  </Base>
);

/* ============================================================
   P06 — purga: normal x não normal
   ============================================================ */
export const PP06: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="primeiras semanas"
      titulo={<>O que é normal sentir<br />— e o que não é</>}
      size={58}
    />
    <div style={{ position: 'absolute', top: 400, left: 70, right: 70, display: 'flex', gap: 20 }}>
      {[
        {
          cor: SALVIA, rot: 'normal', itens: [
            'Descamação leve nas primeiras 2 a 4 semanas',
            'Algumas espinhas surgindo onde já havia cravo',
            'Leve ardência de segundos ao aplicar',
            'Pele mais sensível ao sol',
          ],
        },
        {
          cor: ROSA, rot: 'pare e reveja', itens: [
            'Ardência que continua depois de enxaguar',
            'Vermelhidão com inchaço ou calor',
            'Descamação em placas, com fissura',
            'Coceira que não passa em um dia',
          ],
        },
      ].map(({ cor, rot, itens }) => (
        <Cartao key={rot} style={{ flex: 1, padding: '28px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: cor }} />
            <div style={{
              fontFamily: SANS, fontSize: 22, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: cor, fontWeight: 600,
            }}>{rot}</div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {itens.map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 7, height: 7, borderRadius: 999, background: LINHO, marginTop: 12 }} />
                <Corpo size={24} style={{ flex: 1, color: `${CAFE}cc` }}>{i}</Corpo>
              </div>
            ))}
          </div>
        </Cartao>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 200, left: 76, right: 76 }}>
      <Cartao style={{ background: `${ROSA_PO}66` }}>
        <Corpo size={26} style={{ textAlign: 'center' }}>
          A regra é a frequência, não a coragem: <b>espaçar</b> o ativo por alguns
          dias resolve quase toda irritação de começo — parar de vez costuma
          jogar fora o progresso.
        </Corpo>
      </Cartao>
    </div>
  </Base>
);

/* ============================================================
   P07 — sem filtro, a mancha escurece
   ============================================================ */
export const PP07: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="mancha de acne"
      titulo={<>A espinha sai<br />em dias. A mancha,<br />em meses.</>}
      size={58}
    />
    <div style={{ position: 'absolute', top: 500, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <svg width={880} height={330} viewBox="0 0 880 330">
        <line x1="60" y1="290" x2="850" y2="290" stroke={LINHO} strokeWidth="2" />
        <line x1="60" y1="30" x2="60" y2="290" stroke={LINHO} strokeWidth="2" />
        {/* com filtro */}
        <path d="M 60 70 C 240 92, 420 168, 850 262" fill="none" stroke={SALVIA} strokeWidth="6" strokeLinecap="round" />
        {/* sem filtro */}
        <path d="M 60 70 C 240 66, 430 82, 850 96" fill="none" stroke={ROSA} strokeWidth="6" strokeLinecap="round"
          strokeDasharray="14 12" />
        <text x="560" y="216" fontFamily={SANS} fontSize="26" fill={SALVIA} fontWeight="600">com filtro</text>
        <text x="640" y="66" fontFamily={SANS} fontSize="26" fill={ROSA} fontWeight="600">sem filtro</text>
        <text x="52" y="322" fontFamily={SANS} fontSize="22" fill={TAUPE}>hoje</text>
        <text x="850" y="322" textAnchor="end" fontFamily={SANS} fontSize="22" fill={TAUPE}>12 semanas</text>
        <text x="60" y="20" fontFamily={SANS} fontSize="22" fill={TAUPE}>quanto a mancha ainda aparece</text>
      </svg>
    </div>
    <div style={{ position: 'absolute', top: 880, left: 80, right: 80 }}>
      <Corpo size={28} style={{ textAlign: 'center' }}>
        A marca escura que fica depois da acne é pigmento. Cada dia de sol sem
        filtro devolve o pigmento que o tratamento tirou — e é por isso que
        parece que <b>nada funciona</b>.
      </Corpo>
    </div>
    <div style={{ position: 'absolute', bottom: 170, left: 76, right: 76 }}>
      <Cartao style={{ background: `${ROSA_PO}66` }}>
        <Corpo size={26} style={{ textAlign: 'center' }}>
          Filtro de manhã não é o passo bonito do ritual. É o que segura o
          resultado dos outros três.
        </Corpo>
      </Cartao>
    </div>
  </Base>
);

/* ============================================================
   P08 — o que muda em 4, 8 e 12 semanas
   ============================================================ */
export const PP08: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="o caminho pela frente"
      titulo={<>O que muda em<br />4, 8 e 12 semanas</>}
      size={60}
    />
    <div style={{ position: 'absolute', top: 400, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[
        ['4', 'Oleosidade e textura', 'A pele começa a firmar o brilho ao longo do dia. Pode haver descamação leve — é o ativo agindo.'],
        ['8', 'Cravos e espinhas', 'A inflamação cede e os poros aparecem menos. As marcas começam a clarear, devagar.'],
        ['12', 'Tom mais uniforme', 'É aqui que a foto de hoje comparada com a do começo mostra a diferença que o espelho esconde.'],
      ].map(([n, tit, txt]) => (
        <Cartao key={n} style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 108, textAlign: 'center' }}>
            <div style={{
              fontFamily: SANS, fontSize: 19, letterSpacing: '0.14em', textTransform: 'uppercase', color: TAUPE,
            }}>semana</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 62, color: ROSA, lineHeight: 1.05 }}>{n}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: CAFE }}>{tit}</div>
            <Corpo size={25} style={{ marginTop: 8, color: `${CAFE}bb` }}>{txt}</Corpo>
          </div>
        </Cartao>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 168, left: 84, right: 84 }}>
      <Corpo size={26} style={{ textAlign: 'center', color: TAUPE }}>
        Pele responde em ciclo de semanas, não de dias. Quem troca de rotina toda
        semana nunca chega à semana 8.
      </Corpo>
    </div>
  </Base>
);

/* ============================================================
   P09 — suas fotos são dado biométrico
   ============================================================ */
export const PP09: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="privacidade"
      titulo={<>Foto de rosto é<br />dado biométrico</>}
      size={62}
    />
    <div style={{ position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <svg width={200} height={210} viewBox="0 0 100 105">
        <rect x="22" y="44" width="56" height="46" rx="10" fill={PORCELANA} stroke={CAFE} strokeWidth="2.4" />
        <path d="M 34 44 v -12 a 16 16 0 0 1 32 0 v 12" fill="none" stroke={CAFE} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="50" cy="66" r="5.5" fill={ROSA} />
        <path d="M 50 71 v 8" stroke={ROSA} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </div>
    <div style={{ position: 'absolute', top: 660, left: 76, right: 76, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        ['Consentimento próprio', 'A permissão para tratar as imagens do rosto é separada — e reversível.'],
        ['Área privada', 'As fotos ficam num espaço que só a sua conta abre.'],
        ['Você apaga quando quiser', 'Apagar a conta apaga fotos, leituras e cronograma — sem pedido por e-mail.'],
      ].map(([t, d]) => (
        <Cartao key={t} style={{ padding: '22px 28px' }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: CAFE }}>{t}</div>
          <Corpo size={24} style={{ marginTop: 6, color: `${CAFE}bb` }}>{d}</Corpo>
        </Cartao>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 180, left: 82, right: 82 }}>
      <Corpo size={26} style={{ textAlign: 'center', color: TAUPE }}>
        Antes de mandar o seu rosto para qualquer aplicativo, procure estas três
        respostas.
      </Corpo>
    </div>
  </Base>
);

/* ============================================================
   P10 — o que não deu para ver, a gente não afirma
   ============================================================ */
export const PP10: React.FC = () => (
  <Base>
    <Cabecalho
      eyebrow="honestidade"
      titulo={<>O que não deu<br />para ver, a gente<br />não afirma</>}
      size={60}
    />
    <div style={{ position: 'absolute', top: 560, left: 76, right: 76 }}>
      <Cartao style={{ background: `${ROSA_PO}80`, padding: '34px 36px' }}>
        <Corpo size={29} style={{ textAlign: 'center', lineHeight: 1.45 }}>
          “Faltou o lado esquerdo nesta captura — o que não deu para ver, a gente
          não afirma. Na próxima, a leitura fica mais precisa.”
        </Corpo>
        <div style={{
          marginTop: 18, textAlign: 'center', fontFamily: SANS, fontSize: 22,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: TAUPE,
        }}>aviso real da leitura</div>
      </Cartao>
    </div>
    <div style={{ position: 'absolute', top: 860, left: 80, right: 80 }}>
      <Corpo size={28} style={{ textAlign: 'center' }}>
        É mais fácil preencher o buraco com uma frase genérica e entregar um
        relatório bonito. A leitura prefere dizer que faltou ângulo — porque
        o ritual que vem depois é montado em cima disso.
      </Corpo>
    </div>
    <div style={{ position: 'absolute', bottom: 168, left: 88, right: 88 }}>
      <Corpo size={26} style={{ textAlign: 'center', color: TAUPE }}>
        Cada achado vem com a região onde foi visto. O que ficou de fora aparece
        como o que é: de fora.
      </Corpo>
    </div>
  </Base>
);

export const PRISM_POSTS: Array<[string, React.FC]> = [
  ['PP01-Ordem', PP01], ['PP02-Intensidade', PP02], ['PP03-Poses', PP03],
  ['PP04-Regioes', PP04], ['PP05-Espera', PP05], ['PP06-Purga', PP06],
  ['PP07-Filtro', PP07], ['PP08-Semanas', PP08], ['PP09-Privacidade', PP09],
  ['PP10-Honestidade', PP10],
];
