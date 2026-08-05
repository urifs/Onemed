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
import { AD01, AD02, AD03, AD04, AD05, AD06, AD07, AD08, AD09, AD10 } from './creatives/AdImages';
import { POSTS, makePostComp } from './creatives/PostImages';

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
      {POSTS.map(post => (
        <Composition
          key={post.id}
          id={`POST-${post.id}`}
          component={makePostComp(post)}
          durationInFrames={1}
          fps={30}
          width={1080}
          height={1350}
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
