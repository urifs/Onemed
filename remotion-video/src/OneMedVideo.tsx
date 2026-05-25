import React from 'react';
import { AbsoluteFill, Series, interpolate, useCurrentFrame } from 'remotion';
import { SceneIntro } from './scenes/SceneIntro';
import { SceneHeadline } from './scenes/SceneHeadline';
import { SceneStats } from './scenes/SceneStats';
import { ScenePlatforms } from './scenes/ScenePlatforms';
import { SceneBenefits } from './scenes/SceneBenefits';
import { SceneCTA } from './scenes/SceneCTA';
import { theme } from './theme';

// Durations in frames (30fps)
export const SCENE_DURATIONS = {
  intro: 90,       // 3s
  headline: 150,   // 5s
  stats: 150,      // 5s
  platforms: 150,  // 5s
  benefits: 150,   // 5s
  cta: 180,        // 6s
};

export const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0); // 870 = 29s

function SceneWrapper({ children, transitionFrames = 15 }: { children: React.ReactNode; transitionFrames?: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, transitionFrames], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity, background: theme.bg }}>
      {children}
    </AbsoluteFill>
  );
}

export const OneMedVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.fontBody }}>
      <Series>
        <Series.Sequence durationInFrames={SCENE_DURATIONS.intro}>
          <SceneWrapper>
            <SceneIntro />
          </SceneWrapper>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.headline}>
          <SceneWrapper>
            <SceneHeadline />
          </SceneWrapper>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.stats}>
          <SceneWrapper>
            <SceneStats />
          </SceneWrapper>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.platforms}>
          <SceneWrapper>
            <ScenePlatforms />
          </SceneWrapper>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.benefits}>
          <SceneWrapper>
            <SceneBenefits />
          </SceneWrapper>
        </Series.Sequence>

        <Series.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <SceneWrapper>
            <SceneCTA />
          </SceneWrapper>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
