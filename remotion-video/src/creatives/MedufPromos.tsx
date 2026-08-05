import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PhoneFrame, LaptopFrame } from './DeviceFrames';
import { HEAD, BODY, MONO } from './theme';
import { MedufBg, MLogo, M_BLUE, M_NAVY, M_MUT, WHITE } from './meduf';

/* ===== 20 imagens de feed MEDUF 1080×1350 — benefícios, telas reais, sem emojis ===== */

export type MPromo = {
  id: string;
  headline: string;           // *destaque* vira azul
  sub: string;
  device: 'phone' | 'laptop' | 'laptop+phone' | 'dualphone' | 'stat';
  take?: string; startFrom?: number;
  take2?: string; startFrom2?: number;
  stat?: { big: string; legend: string };
  selos?: Array<{ x: number; y: number; t: string }>;
  chips?: string[];
};

const Hl: React.FC<{ text: string; size?: number }> = ({ text, size = 64 }) => {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: M_NAVY, letterSpacing: -2, lineHeight: 1.15, textAlign: 'center' }}>
      {parts.map((p, i) => p.startsWith('*')
        ? <span key={i} style={{ color: M_BLUE }}>{p.slice(1, -1)}</span>
        : <span key={i}>{p}</span>)}
    </div>
  );
};

const Selo: React.FC<{ x: number; y: number; t: string }> = ({ x, y, t }) => (
  <div style={{
    position: 'absolute', left: x, top: y, zIndex: 9,
    background: WHITE, border: `2px solid ${M_BLUE}`, borderRadius: 14,
    padding: '11px 20px', boxShadow: '0 14px 36px -12px rgba(21,96,232,0.4)',
    fontFamily: HEAD, fontWeight: 800, fontSize: 23, color: M_BLUE, whiteSpace: 'nowrap',
  }}>{t}</div>
);

export const MedufPromo: React.FC<{ p: MPromo }> = ({ p }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <MedufBg />
    <div style={{ position: 'absolute', top: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <MLogo size={54} />
    </div>
    <div style={{ position: 'absolute', left: 56, right: 56, top: 140, zIndex: 8 }}>
      <Hl text={p.headline} />
      <div style={{ fontFamily: BODY, fontSize: 27, color: M_MUT, textAlign: 'center', marginTop: 16, lineHeight: 1.4 }}>
        {p.sub}
      </div>
    </div>

    {/* zona do dispositivo */}
    {p.device === 'phone' && p.take && (
      <div style={{ position: 'absolute', left: '50%', top: 388, transform: 'translateX(-50%)', zIndex: 4 }}>
        <PhoneFrame src={`rec/${p.take}.mp4`} width={455} startFrom={p.startFrom ?? 0} statusDark />
      </div>
    )}
    {p.device === 'laptop' && p.take && (
      <div style={{ position: 'absolute', left: '50%', top: 470, transform: 'translateX(-50%)', zIndex: 4 }}>
        <LaptopFrame src={`rec/${p.take}.mp4`} width={940} startFrom={p.startFrom ?? 0} />
      </div>
    )}
    {p.device === 'laptop+phone' && p.take && p.take2 && (
      <>
        <div style={{ position: 'absolute', left: '50%', top: 440, transform: 'translateX(-50%)', zIndex: 4 }}>
          <LaptopFrame src={`rec/${p.take}.mp4`} width={860} startFrom={p.startFrom ?? 0} />
        </div>
        <div style={{ position: 'absolute', right: 60, top: 620, zIndex: 6, transform: 'rotate(6deg)' }}>
          <PhoneFrame src={`rec/${p.take2}.mp4`} width={290} startFrom={p.startFrom2 ?? 0} statusDark />
        </div>
      </>
    )}
    {p.device === 'dualphone' && p.take && p.take2 && (
      <>
        <div style={{ position: 'absolute', left: 110, top: 430, transform: 'rotate(-5deg)', zIndex: 4 }}>
          <PhoneFrame src={`rec/${p.take}.mp4`} width={400} startFrom={p.startFrom ?? 0} statusDark />
        </div>
        <div style={{ position: 'absolute', right: 110, top: 480, transform: 'rotate(5deg)', zIndex: 5 }}>
          <PhoneFrame src={`rec/${p.take2}.mp4`} width={400} startFrom={p.startFrom2 ?? 0} statusDark />
        </div>
      </>
    )}
    {p.device === 'stat' && p.stat && (
      <>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', zIndex: 5 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 190, color: M_NAVY, letterSpacing: -7, lineHeight: 1 }}>
            {p.stat.big}
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34, color: M_MUT, marginTop: 6 }}>{p.stat.legend}</div>
        </div>
        {p.take && (
          <div style={{ position: 'absolute', left: '50%', top: 740, transform: 'translateX(-50%)', zIndex: 4 }}>
            <PhoneFrame src={`rec/${p.take}.mp4`} width={360} startFrom={p.startFrom ?? 0} statusDark />
          </div>
        )}
      </>
    )}

    {(p.selos || []).map((s, i) => <Selo key={i} {...s} />)}

    {p.chips && (
      <div style={{ position: 'absolute', left: 40, right: 40, bottom: 236, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', zIndex: 9 }}>
        {p.chips.map(c => (
          <div key={c} style={{
            background: WHITE, border: '1.5px solid rgba(14,27,51,0.14)', borderRadius: 999,
            padding: '11px 24px', boxShadow: '0 10px 26px -12px rgba(14,27,51,0.25)',
            fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_NAVY,
          }}>{c}</div>
        ))}
      </div>
    )}

    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 9 }}>
      <div style={{
        background: M_BLUE, borderRadius: 999, padding: '19px 50px',
        boxShadow: '0 18px 50px -12px rgba(21,96,232,0.55)',
        fontFamily: HEAD, fontWeight: 900, fontSize: 29, color: WHITE,
      }}>Teste grátis — 30 min, sem cartão</div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: M_BLUE }}>meduf.com.br</div>
    </div>
  </AbsoluteFill>
);

export const MEDUF_PROMOS: MPromo[] = [
  { id: 'MP01', headline: 'toda a medicina, numa *aba*.', sub: '17 ferramentas clínicas com IA — do plantão ao consultório',
    device: 'laptop+phone', take: 'mfd_home', startFrom: 200, take2: 'mg_chat', startFrom2: 640,
    chips: ['17 ferramentas', '3 IAs', '24/7'] },
  { id: 'MP02', headline: '17 ferramentas. um único *app*.', sub: 'diagnóstico, ECG, exames, radiografia, interações e mais',
    device: 'phone', take: 'mf_tools', startFrom: 220,
    selos: [{ x: 60, y: 520, t: 'tudo com IA' }, { x: 700, y: 900, t: 'um login só' }],
    chips: ['do plantão ao consultório'] },
  { id: 'MP03', headline: 'GPT, Claude e Gemini. no mesmo *chat*.', sub: 'três IAs respondem sua dúvida clínica — você compara e decide',
    device: 'phone', take: 'mg_chat', startFrom: 500,
    selos: [{ x: 60, y: 540, t: 'três respostas' }, { x: 690, y: 940, t: 'você compara' }],
    chips: ['a conduta final é sua'] },
  { id: 'MP04', headline: 'o ECG chega. a dúvida *vai embora*.', sub: 'envie o traçado e receba uma leitura estruturada em segundos',
    device: 'phone', take: 'mg_ecg', startFrom: 700,
    selos: [{ x: 60, y: 540, t: 'envie a foto do traçado' }, { x: 660, y: 950, t: 'leitura em segundos' }],
    chips: ['apoio à decisão — quem decide é você'] },
  { id: 'MP05', headline: 'uma segunda leitura da radiografia. *na hora*.', sub: 'descrição sistemática da imagem pra você conferir com o caso',
    device: 'phone', take: 'mg_rx', startFrom: 680,
    selos: [{ x: 60, y: 540, t: 'envie a imagem' }, { x: 680, y: 950, t: 'descrição sistemática' }],
    chips: ['radiografia, na palma da mão'] },
  { id: 'MP06', headline: 'o laudo inteiro, *interpretado*.', sub: 'cole os resultados — a MEDUF organiza alterações e próximos passos',
    device: 'phone', take: 'mg_lab', startFrom: 620,
    selos: [{ x: 60, y: 540, t: 'cole o laudo' }, { x: 690, y: 950, t: 'alterações em destaque' }],
    chips: ['exames laboratoriais'] },
  { id: 'MP07', headline: 'sintomas entram. *hipóteses* saem.', sub: 'diagnóstico diferencial organizado, com sinais de alarme',
    device: 'phone', take: 'mg_diag', startFrom: 700,
    selos: [{ x: 60, y: 540, t: 'descreva o quadro' }, { x: 680, y: 950, t: 'diferenciais ranqueados' }],
    chips: ['sinais de alarme sinalizados'] },
  { id: 'MP08', headline: '35 milhões de artigos. no seu *bolso*.', sub: 'PubMed integrado: a resposta vem com referência',
    device: 'phone', take: 'mg_chat', startFrom: 760,
    selos: [{ x: 60, y: 540, t: 'PubMed integrado' }, { x: 700, y: 950, t: 'resposta com fonte' }],
    chips: ['35.000.000+ artigos'] },
  { id: 'MP09', headline: 'cheque *interações* antes de assinar.', sub: 'verificador de interações medicamentosas em segundos',
    device: 'phone', take: 'mf_inter', startFrom: 900,
    selos: [{ x: 60, y: 540, t: 'liste os fármacos' }, { x: 690, y: 950, t: 'alertas na hora' }],
    chips: ['prescrição mais segura'] },
  { id: 'MP10', headline: '3h da manhã. plantão cheio. *dúvida agora*.', sub: 'a MEDUF responde no seu horário — 24 horas, 7 dias',
    device: 'phone', take: 'mg_chat', startFrom: 300,
    selos: [{ x: 60, y: 540, t: 'resposta em segundos' }, { x: 700, y: 950, t: 'a qualquer hora' }],
    chips: ['24/7'] },
  { id: 'MP11', headline: '10.000+ médicos. *27 estados*.', sub: 'a plataforma de IA clínica que o Brasil inteiro está usando',
    device: 'stat', stat: { big: '10.000+', legend: 'médicos, nos 27 estados' }, take: 'mf_home', startFrom: 200,
    chips: ['do interior à capital'] },
  { id: 'MP12', headline: 'avaliada em *4.9* por quem usa no plantão.', sub: 'nota dada por médicos, no uso real',
    device: 'stat', stat: { big: '4.9', legend: 'avaliação média dos usuários' }, take: 'mf_home', startFrom: 320,
    chips: ['10.000+ médicos', '27 estados'] },
  { id: 'MP13', headline: 'a prescrição alinhada ao *SUS*.', sub: 'PCDT e RENAME na consulta — conduta dentro do protocolo',
    device: 'phone', take: 'mf_tools', startFrom: 340,
    selos: [{ x: 60, y: 540, t: 'PCDT do SUS' }, { x: 720, y: 950, t: 'RENAME' }],
    chips: ['protocolos oficiais'] },
  { id: 'MP14', headline: 'da dúvida à conduta. em *segundos*.', sub: 'pergunta clínica de um lado, hipóteses organizadas do outro',
    device: 'dualphone', take: 'mg_diag', startFrom: 400, take2: 'mg_chat', startFrom2: 620,
    chips: ['diagnóstico diferencial', 'chat clínico'] },
  { id: 'MP15', headline: 'ninguém precisa decidir *sozinho*.', sub: 'apoio à decisão clínica no primeiro plantão e no milésimo',
    device: 'phone', take: 'mg_chat', startFrom: 560,
    selos: [{ x: 60, y: 540, t: 'segunda opinião em segundos' }, { x: 700, y: 950, t: 'você decide' }],
    chips: ['residentes e veteranos'] },
  { id: 'MP16', headline: 'a mochila ficou mais *leve*.', sub: 'as ferramentas que moravam em cinco lugares, num app só',
    device: 'phone', take: 'mf_tools', startFrom: 120,
    selos: [{ x: 60, y: 540, t: 'suas ferramentas de bolso' }, { x: 680, y: 950, t: 'tudo no mesmo lugar' }],
    chips: ['17 ferramentas clínicas'] },
  { id: 'MP17', headline: 'o colega que nunca *dorme*.', sub: 'tira dúvida às 15h da tarde e às 3h da manhã',
    device: 'phone', take: 'mg_chat', startFrom: 700,
    selos: [{ x: 60, y: 540, t: 'plantão noturno' }, { x: 720, y: 950, t: 'fim de semana' }],
    chips: ['sempre disponível'] },
  { id: 'MP18', headline: 'a IA sugere. *você* decide.', sub: 'apoio à decisão com transparência — a conduta final é sempre sua',
    device: 'phone', take: 'mg_diag', startFrom: 850,
    selos: [{ x: 60, y: 540, t: 'hipóteses justificadas' }, { x: 700, y: 950, t: 'médico no comando' }],
    chips: ['ferramenta, não substituto'] },
  { id: 'MP19', headline: '30 minutos grátis. *sem cartão*.', sub: 'teste todas as ferramentas antes de assinar qualquer coisa',
    device: 'phone', take: 'mf_home', startFrom: 150,
    selos: [{ x: 60, y: 540, t: 'acesso imediato' }, { x: 700, y: 950, t: 'sem compromisso' }],
    chips: ['17 ferramentas liberadas no teste'] },
  { id: 'MP20', headline: 'a medicina não espera. *você também não*.', sub: 'respostas clínicas em segundos, no plantão ou no consultório',
    device: 'laptop+phone', take: 'mfd_home', startFrom: 120, take2: 'mg_ecg', startFrom2: 750,
    chips: ['17 ferramentas', 'PubMed 35M+', 'SUS PCDT'] },
];

export const makeMedufPromo = (p: MPromo): React.FC => {
  const C: React.FC = () => <MedufPromo p={p} />;
  return C;
};
