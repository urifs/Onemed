import React from 'react';
import { Composition } from 'remotion';
import { OneMedVideo, TOTAL_FRAMES } from './OneMedVideo';
import { OneMedMockup, MOCKUP_DURATION } from './OneMedMockup';
import { OneMedHUD, HUD_DURATION } from './OneMedHUD';
import { OneMedMedical, MEDICAL_DURATION } from './OneMedMedical';
import { OneMedShowcase, SHOWCASE_DURATION } from './OneMedShowcase';

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
    </>
  );
};
