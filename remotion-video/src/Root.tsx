import React from 'react';
import { Composition } from 'remotion';
import { OneMedVideo, TOTAL_FRAMES } from './OneMedVideo';
import { OneMedMockup, MOCKUP_DURATION } from './OneMedMockup';
import { OneMedHUD, HUD_DURATION } from './OneMedHUD';
import { OneMedMedical, MEDICAL_DURATION } from './OneMedMedical';
import { OneMedShowcase, SHOWCASE_DURATION } from './OneMedShowcase';
import { OneMedTiktok, TIKTOK_DURATION } from './OneMedTiktok';
import { C01_NovaEra, C01_DURATION } from './creatives/C01_NovaEra';
import { C02_Plantao, C02_DURATION } from './creatives/C02_Plantao';
import { C03_Streaming, C03_DURATION } from './creatives/C03_Streaming';
import { C04_Telas, C04_DURATION } from './creatives/C04_Telas';
import { C05_Chaos, C05_DURATION } from './creatives/C05_Chaos';
import { C06_Detalhes, C06_DURATION } from './creatives/C06_Detalhes';
import { C07_Player, C07_DURATION } from './creatives/C07_Player';
import { C08_Numeros, C08_DURATION } from './creatives/C08_Numeros';
import { C09_Login, C09_DURATION } from './creatives/C09_Login';
import { C10_Atualizado, C10_DURATION } from './creatives/C10_Atualizado';
import { C11_Ferramentas, C11_DURATION } from './creatives/C11_Ferramentas';
import { C12_Comunidade, C12_DURATION } from './creatives/C12_Comunidade';
import { C13_Organizacao, C13_DURATION } from './creatives/C13_Organizacao';
import { C14_Completo, C14_DURATION } from './creatives/C14_Completo';
import { C15_Historia, C15_DURATION } from './creatives/C15_Historia';
import { C16_Revalida, C16_DURATION } from './creatives/C16_Revalida';
import { C17_Turma, C17_DURATION } from './creatives/C17_Turma';
import { C18_Interno, C18_DURATION } from './creatives/C18_Interno';
import { C19_Conta, C19_DURATION } from './creatives/C19_Conta';
import { C20_Recomeco, C20_DURATION } from './creatives/C20_Recomeco';
import { M01_Meduf, M01_DURATION } from './creatives/M01_Meduf';
import { M02_Chat, M02_DURATION } from './creatives/M02_Chat';
import { M03_Diag, M03_DURATION } from './creatives/M03_Diag';
import { M04_Ecg, M04_DURATION } from './creatives/M04_Ecg';
import { M05_Lab, M05_DURATION } from './creatives/M05_Lab';
import { M06_Rx, M06_DURATION } from './creatives/M06_Rx';
import { M07_Duelo, M07_DURATION } from './creatives/M07_Duelo';
import { M08_Dia, M08_DURATION } from './creatives/M08_Dia';
import { M09_Paciente, M09_DURATION } from './creatives/M09_Paciente';
import { M10_Conta, M10_DURATION } from './creatives/M10_Conta';
import { M11_Objecao, M11_DURATION } from './creatives/M11_Objecao';
import { C21_Unboxing, C21_DURATION } from './creatives/C21_Unboxing';
import { C22_D7, C22_DURATION } from './creatives/C22_D7';
import { C23_Reler, C23_DURATION } from './creatives/C23_Reler';
import { C24_Comentario, C24_DURATION } from './creatives/C24_Comentario';
import { C25_OlhaIsso, C25_DURATION } from './creatives/C25_OlhaIsso';
import { C26_Desdobra, C26_DURATION } from './creatives/C26_Desdobra';
import { C27_Equacao, C27_DURATION } from './creatives/C27_Equacao';
import { C28_Verdades, C28_DURATION } from './creatives/C28_Verdades';
import { C29_Caderno, C29_DURATION } from './creatives/C29_Caderno';
import { C30_Rotina, C30_DURATION } from './creatives/C30_Rotina';
import { C31_Mapa, C31_DURATION } from './creatives/C31_Mapa';
import { C32_Mesa, C32_DURATION } from './creatives/C32_Mesa';
import { C33_Speedrun, C33_DURATION } from './creatives/C33_Speedrun';
import { C34_Acervo, C34_DURATION } from './creatives/C34_Acervo';
import { C35_Dueto, C35_DURATION } from './creatives/C35_Dueto';
import { C36_AZ, C36_DURATION } from './creatives/C36_AZ';
import { C37_Horas, C37_DURATION } from './creatives/C37_Horas';
import { C38_Toques, C38_DURATION } from './creatives/C38_Toques';
import { C39_Esquecer, C39_DURATION } from './creatives/C39_Esquecer';
import { C40_Tabuleiro, C40_DURATION } from './creatives/C40_Tabuleiro';
import { C41_Linhas, C41_DURATION } from './creatives/C41_Linhas';
import { C42_Pilha, C42_DURATION } from './creatives/C42_Pilha';
import { MB01_Linhas, MB01_DURATION } from './creatives/MB01_Linhas';
import { MB02_Pilha, MB02_DURATION } from './creatives/MB02_Pilha';
import { C43_Recibo, C43_DURATION } from './creatives/C43_Recibo';
import { C44_Zapping, C44_DURATION } from './creatives/C44_Zapping';
import { C45_ZoomInf, C45_DURATION } from './creatives/C45_ZoomInf';
import { C46_Cafe, C46_DURATION } from './creatives/C46_Cafe';
import { C47_DiaNoite, C47_DURATION } from './creatives/C47_DiaNoite';
import { C48_Perguntas, C48_DURATION } from './creatives/C48_Perguntas';
import { C49_Print, C49_DURATION } from './creatives/C49_Print';
import { C50_TesteCego, C50_DURATION } from './creatives/C50_TesteCego';
import { C51_Rebobinar, C51_DURATION } from './creatives/C51_Rebobinar';
import { C52_Dossie, C52_DURATION } from './creatives/C52_Dossie';
import { C53_Trailer, C53_DURATION } from './creatives/C53_Trailer';
import { C54_Top5, C54_DURATION } from './creatives/C54_Top5';
import { C55_Plano, C55_DURATION } from './creatives/C55_Plano';
import { C56_Documentario, C56_DURATION } from './creatives/C56_Documentario';
import { C57_Lofi, C57_DURATION } from './creatives/C57_Lofi';
import { C58_Vespera, C58_DURATION } from './creatives/C58_Vespera';
import { C59_Boot, C59_DURATION } from './creatives/C59_Boot';
import { C60_Numeros, C60_DURATION } from './creatives/C60_Numeros';
import { C61_Foco, C61_DURATION } from './creatives/C61_Foco';
import { C62_Finale, C62_DURATION } from './creatives/C62_Finale';
import { C63_Estante, C63_DURATION } from './creatives/C63_Estante';
import { C64_Creditos, C64_DURATION } from './creatives/C64_Creditos';
import { C65_Cardapio, C65_DURATION } from './creatives/C65_Cardapio';
import { C66_Trofeus, C66_DURATION } from './creatives/C66_Trofeus';
import { C67_Tesouro, C67_DURATION } from './creatives/C67_Tesouro';
import { C68_Luta, C68_DURATION } from './creatives/C68_Luta';
import { C69_Feira, C69_DURATION } from './creatives/C69_Feira';
import { C70_Observatorio, C70_DURATION } from './creatives/C70_Observatorio';
import { C71_Mudanca, C71_DURATION } from './creatives/C71_Mudanca';
import { C72_Leilao, C72_DURATION } from './creatives/C72_Leilao';
import { C83_Matriculas, C83_DURATION } from './creatives/C83_Matriculas';
import { C84_Digita, C84_DURATION } from './creatives/C84_Digita';
import { C85_Revista, C85_DURATION } from './creatives/C85_Revista';
import { C86_Manifesto, C86_DURATION } from './creatives/C86_Manifesto';
import { C87_Sete, C87_DURATION } from './creatives/C87_Sete';
import { C88_Erra, C88_DURATION } from './creatives/C88_Erra';
import { C89_Maquina, C89_DURATION } from './creatives/C89_Maquina';
import { C90_Extensivo, C90_DURATION } from './creatives/C90_Extensivo';
import { C91_Porta, C91_DURATION } from './creatives/C91_Porta';
import { C92_Terminal, C92_DURATION } from './creatives/C92_Terminal';
import { C93_Caderno, C93_DURATION } from './creatives/C93_Caderno';
import { C94_Conversa, C94_DURATION } from './creatives/C94_Conversa';
import { C95_Gabarito, C95_DURATION } from './creatives/C95_Gabarito';
import { C96_Neon, C96_DURATION } from './creatives/C96_Neon';
import { MD01_Monitor, MD01_DURATION } from './creatives/MD01_Monitor';
import { MD02_Prontuario, MD02_DURATION } from './creatives/MD02_Prontuario';
import { MD03_Negatoscopio, MD03_DURATION } from './creatives/MD03_Negatoscopio';
import { MD04_Rodada, MD04_DURATION } from './creatives/MD04_Rodada';
import { MD05_Relogio, MD05_DURATION } from './creatives/MD05_Relogio';
import { MDV11_Diagnostico, MDV11_DURATION } from './creatives/MDV11_Diagnostico';
import { MDV12_Ecg, MDV12_DURATION } from './creatives/MDV12_Ecg';
import { MDV13_Interacao, MDV13_DURATION } from './creatives/MDV13_Interacao';
import { MDV14_Laboratorio, MDV14_DURATION } from './creatives/MDV14_Laboratorio';
import { MDV15_Plataforma, MDV15_DURATION } from './creatives/MDV15_Plataforma';
import { MDN16_Plantao, MDN16_DURATION } from './creatives/MDN16_Plantao';
import { MDN17_Consultorio, MDN17_DURATION } from './creatives/MDN17_Consultorio';
import { MDN18_ChatVoz, MDN18_DURATION } from './creatives/MDN18_ChatVoz';
import { MDN19_Tox, MDN19_DURATION } from './creatives/MDN19_Tox';
import { MDN20_Passagem, MDN20_DURATION } from './creatives/MDN20_Passagem';
import { MDX21_Sessao, MDX21_DURATION } from './creatives/MDX21_Sessao';
import { MDX22_Handoff, MDX22_DURATION } from './creatives/MDX22_Handoff';
import { MDX23_Prescricao, MDX23_DURATION } from './creatives/MDX23_Prescricao';
import { MDX24_Imagem, MDX24_DURATION } from './creatives/MDX24_Imagem';
import { MDX25_Turno, MDX25_DURATION } from './creatives/MDX25_Turno';
import { V31_DiagReal, V31_DURATION } from './creatives/V31_DiagReal';
import { V32_InterReal, V32_DURATION } from './creatives/V32_InterReal';
import { V33_ToxReal, V33_DURATION } from './creatives/V33_ToxReal';
import { V34_CelReal, V34_DURATION } from './creatives/V34_CelReal';
import { V35_TourReal, V35_DURATION } from './creatives/V35_TourReal';
import { C73_Quiz, C73_DURATION, C74_Quiz, C74_DURATION, C75_Quiz, C75_DURATION, C76_Quiz, C76_DURATION, C77_Quiz, C77_DURATION, C78_Quiz, C78_DURATION, C79_Quiz, C79_DURATION, C80_Quiz, C80_DURATION, C81_Quiz, C81_DURATION, C82_Quiz, C82_DURATION } from './creatives/QuizComps';
import { AD01, AD02, AD03, AD04, AD05, AD06, AD07, AD08, AD09, AD10 } from './creatives/AdImages';
import { POSTS, makePostComp } from './creatives/PostImages';
import { PROMOS } from './creatives/PromoImages';
import { MEDUF_PROMOS, makeMedufPromo } from './creatives/MedufPromos';
import { MEDUF_X } from './creatives/MedufX';
import { MEDUF_POSTS, makeMedufPost } from './creatives/MedufPosts';
import { MEDUF_FEED2 } from './creatives/MedufFeed2';
import { MEDUF_FEED3 } from './creatives/MedufFeed3';

const ADS: Array<[string, React.FC]> = [
  ['AD01-Mapa', AD01], ['AD02-Mesa', AD02], ['AD03-Toques', AD03], ['AD04-Acervo', AD04],
  ['AD05-Horas', AD05], ['AD06-Curva', AD06], ['AD07-Tabuleiro', AD07], ['AD08-Speedrun', AD08],
  ['AD09-Numeros', AD09], ['AD10-Assistente', AD10],
];

const CREATIVES: Array<[string, React.FC, number]> = [
  ['C01-NovaEra', C01_NovaEra, C01_DURATION],
  ['C02-Plantao', C02_Plantao, C02_DURATION],
  ['C03-Streaming', C03_Streaming, C03_DURATION],
  ['C04-Telas', C04_Telas, C04_DURATION],
  ['C05-Chaos', C05_Chaos, C05_DURATION],
  ['C06-Detalhes', C06_Detalhes, C06_DURATION],
  ['C07-Player', C07_Player, C07_DURATION],
  ['C08-Numeros', C08_Numeros, C08_DURATION],
  ['C09-Login', C09_Login, C09_DURATION],
  ['C10-Atualizado', C10_Atualizado, C10_DURATION],
  ['C11-Ferramentas', C11_Ferramentas, C11_DURATION],
  ['C12-Comunidade', C12_Comunidade, C12_DURATION],
  ['C13-Organizacao', C13_Organizacao, C13_DURATION],
  ['C14-Completo', C14_Completo, C14_DURATION],
  ['C15-Historia', C15_Historia, C15_DURATION],
  ['C16-Revalida', C16_Revalida, C16_DURATION],
  ['C17-Turma', C17_Turma, C17_DURATION],
  ['C18-Interno', C18_Interno, C18_DURATION],
  ['C19-Conta', C19_Conta, C19_DURATION],
  ['C20-Recomeco', C20_Recomeco, C20_DURATION],
  ['M01-Meduf', M01_Meduf, M01_DURATION],
  ['M02-Chat', M02_Chat, M02_DURATION],
  ['M03-Diag', M03_Diag, M03_DURATION],
  ['M04-Ecg', M04_Ecg, M04_DURATION],
  ['M05-Lab', M05_Lab, M05_DURATION],
  ['M06-Rx', M06_Rx, M06_DURATION],
  ['M07-Duelo', M07_Duelo, M07_DURATION],
  ['M08-Dia', M08_Dia, M08_DURATION],
  ['M09-Paciente', M09_Paciente, M09_DURATION],
  ['M10-Conta', M10_Conta, M10_DURATION],
  ['M11-Objecao', M11_Objecao, M11_DURATION],
  ['C21-Unboxing', C21_Unboxing, C21_DURATION],
  ['C22-D7', C22_D7, C22_DURATION],
  ['C23-Reler', C23_Reler, C23_DURATION],
  ['C24-Comentario', C24_Comentario, C24_DURATION],
  ['C25-OlhaIsso', C25_OlhaIsso, C25_DURATION],
  ['C26-Desdobra', C26_Desdobra, C26_DURATION],
  ['C27-Equacao', C27_Equacao, C27_DURATION],
  ['C28-Verdades', C28_Verdades, C28_DURATION],
  ['C29-Caderno', C29_Caderno, C29_DURATION],
  ['C30-Rotina', C30_Rotina, C30_DURATION],
  ['C31-Mapa', C31_Mapa, C31_DURATION],
  ['C32-Mesa', C32_Mesa, C32_DURATION],
  ['C33-Speedrun', C33_Speedrun, C33_DURATION],
  ['C34-Acervo', C34_Acervo, C34_DURATION],
  ['C35-Dueto', C35_Dueto, C35_DURATION],
  ['C36-AZ', C36_AZ, C36_DURATION],
  ['C37-Horas', C37_Horas, C37_DURATION],
  ['C38-Toques', C38_Toques, C38_DURATION],
  ['C39-Esquecer', C39_Esquecer, C39_DURATION],
  ['C40-Tabuleiro', C40_Tabuleiro, C40_DURATION],
  ['C41-Linhas', C41_Linhas, C41_DURATION],
  ['C42-Pilha', C42_Pilha, C42_DURATION],
  ['MB01-Linhas', MB01_Linhas, MB01_DURATION],
  ['MB02-Pilha', MB02_Pilha, MB02_DURATION],
  ['C43-Recibo', C43_Recibo, C43_DURATION],
  ['C44-Zapping', C44_Zapping, C44_DURATION],
  ['C45-ZoomInf', C45_ZoomInf, C45_DURATION],
  ['C46-Cafe', C46_Cafe, C46_DURATION],
  ['C47-DiaNoite', C47_DiaNoite, C47_DURATION],
  ['C48-Perguntas', C48_Perguntas, C48_DURATION],
  ['C49-Print', C49_Print, C49_DURATION],
  ['C50-TesteCego', C50_TesteCego, C50_DURATION],
  ['C51-Rebobinar', C51_Rebobinar, C51_DURATION],
  ['C52-Dossie', C52_Dossie, C52_DURATION],
  ['C53-Trailer', C53_Trailer, C53_DURATION],
  ['C54-Top5', C54_Top5, C54_DURATION],
  ['C55-Plano', C55_Plano, C55_DURATION],
  ['C56-Documentario', C56_Documentario, C56_DURATION],
  ['C57-Lofi', C57_Lofi, C57_DURATION],
  ['C58-Vespera', C58_Vespera, C58_DURATION],
  ['C59-Boot', C59_Boot, C59_DURATION],
  ['C60-Numeros', C60_Numeros, C60_DURATION],
  ['C61-Foco', C61_Foco, C61_DURATION],
  ['C62-Finale', C62_Finale, C62_DURATION],
  ['C63-Estante', C63_Estante, C63_DURATION],
  ['C64-Creditos', C64_Creditos, C64_DURATION],
  ['C65-Cardapio', C65_Cardapio, C65_DURATION],
  ['C66-Trofeus', C66_Trofeus, C66_DURATION],
  ['C67-Tesouro', C67_Tesouro, C67_DURATION],
  ['C68-Luta', C68_Luta, C68_DURATION],
  ['C69-Feira', C69_Feira, C69_DURATION],
  ['C70-Observatorio', C70_Observatorio, C70_DURATION],
  ['C71-Mudanca', C71_Mudanca, C71_DURATION],
  ['C72-Leilao', C72_Leilao, C72_DURATION],
  ['C73-Quiz', C73_Quiz, C73_DURATION],
  ['C74-Quiz', C74_Quiz, C74_DURATION],
  ['C75-Quiz', C75_Quiz, C75_DURATION],
  ['C76-Quiz', C76_Quiz, C76_DURATION],
  ['C77-Quiz', C77_Quiz, C77_DURATION],
  ['C78-Quiz', C78_Quiz, C78_DURATION],
  ['C79-Quiz', C79_Quiz, C79_DURATION],
  ['C80-Quiz', C80_Quiz, C80_DURATION],
  ['C81-Quiz', C81_Quiz, C81_DURATION],
  ['C82-Quiz', C82_Quiz, C82_DURATION],
  ['C83-Matriculas', C83_Matriculas, C83_DURATION],
  ['C84-Digita', C84_Digita, C84_DURATION],
  ['C85-Revista', C85_Revista, C85_DURATION],
  ['C86-Manifesto', C86_Manifesto, C86_DURATION],
  ['C87-Sete', C87_Sete, C87_DURATION],
  ['C88-Erra', C88_Erra, C88_DURATION],
  ['C89-Maquina', C89_Maquina, C89_DURATION],
  ['C90-Extensivo', C90_Extensivo, C90_DURATION],
  ['C91-Porta', C91_Porta, C91_DURATION],
  ['C92-Terminal', C92_Terminal, C92_DURATION],
  ['C93-Caderno', C93_Caderno, C93_DURATION],
  ['C94-Conversa', C94_Conversa, C94_DURATION],
  ['C95-Gabarito', C95_Gabarito, C95_DURATION],
  ['C96-Neon', C96_Neon, C96_DURATION],
  ['MD01-Monitor', MD01_Monitor, MD01_DURATION],
  ['MD02-Prontuario', MD02_Prontuario, MD02_DURATION],
  ['MD03-Negatoscopio', MD03_Negatoscopio, MD03_DURATION],
  ['MD04-Rodada', MD04_Rodada, MD04_DURATION],
  ['MD05-Relogio', MD05_Relogio, MD05_DURATION],
  ['MDV11-Diagnostico', MDV11_Diagnostico, MDV11_DURATION],
  ['MDV12-Ecg', MDV12_Ecg, MDV12_DURATION],
  ['MDV13-Interacao', MDV13_Interacao, MDV13_DURATION],
  ['MDV14-Laboratorio', MDV14_Laboratorio, MDV14_DURATION],
  ['MDV15-Plataforma', MDV15_Plataforma, MDV15_DURATION],
  ['MDN16-Plantao', MDN16_Plantao, MDN16_DURATION],
  ['MDN17-Consultorio', MDN17_Consultorio, MDN17_DURATION],
  ['MDN18-ChatVoz', MDN18_ChatVoz, MDN18_DURATION],
  ['MDN19-Tox', MDN19_Tox, MDN19_DURATION],
  ['MDN20-Passagem', MDN20_Passagem, MDN20_DURATION],
  ['MDX21-Sessao', MDX21_Sessao, MDX21_DURATION],
  ['MDX22-Handoff', MDX22_Handoff, MDX22_DURATION],
  ['MDX23-Prescricao', MDX23_Prescricao, MDX23_DURATION],
  ['MDX24-Imagem', MDX24_Imagem, MDX24_DURATION],
  ['MDX25-Turno', MDX25_Turno, MDX25_DURATION],
  ['V31-DiagReal', V31_DiagReal, V31_DURATION],
  ['V32-InterReal', V32_InterReal, V32_DURATION],
  ['V33-ToxReal', V33_ToxReal, V33_DURATION],
  ['V34-CelReal', V34_CelReal, V34_DURATION],
  ['V35-TourReal', V35_TourReal, V35_DURATION],
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OneMedPromo"
        component={OneMedVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OneMedPromoWide"
        component={OneMedVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="OneMedMockup"
        component={OneMedMockup}
        durationInFrames={MOCKUP_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OneMedHUD"
        component={OneMedHUD}
        durationInFrames={HUD_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OneMedMedical"
        component={OneMedMedical}
        durationInFrames={MEDICAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OneMedShowcase"
        component={OneMedShowcase}
        durationInFrames={SHOWCASE_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OneMedTiktok"
        component={OneMedTiktok}
        durationInFrames={TIKTOK_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      {MEDUF_FEED3.map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
        />
      ))}
      {MEDUF_FEED2.map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
        />
      ))}
      {MEDUF_POSTS.map(post => (
        <Composition
          key={post.id}
          id={post.id}
          component={makeMedufPost(post)}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
        />
      ))}
      {MEDUF_X.map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
        />
      ))}
      {MEDUF_PROMOS.map(p => (
        <Composition
          key={p.id}
          id={p.id}
          component={makeMedufPromo(p)}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
        />
      ))}
      {PROMOS.map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1920}
        />
      ))}
      {POSTS.map(post => (
        <Composition
          key={post.id}
          id={`POST-${post.id}`}
          component={makePostComp(post)}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1920}
        />
      ))}
      {ADS.map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
        />
      ))}
      {CREATIVES.map(([id, component, duration]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={duration}
          fps={30}
          width={1080}
          height={1920}
        />
      ))}
    </>
  );
};
