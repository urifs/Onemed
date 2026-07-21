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
