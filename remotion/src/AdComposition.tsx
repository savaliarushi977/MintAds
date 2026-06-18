import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { EndCard, EndCardProps } from './EndCard';

export interface AdProps {
  clips: Array<{ src: string; durationSec: number; beat: string }>;
  voAudioSrc: string;
  textOverlays: Array<{ text: string; startSec: number; durationSec: number }>;
  endCard: EndCardProps;
  fps: number;
}

export const AdComposition: React.FC<AdProps> = ({ clips, voAudioSrc, textOverlays, endCard, fps }) => {
  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {clips.map((clip, i) => {
        const from = currentFrame;
        const durationFrames = Math.round(clip.durationSec * fps);
        currentFrame += durationFrames;
        return (
          <Sequence from={from} durationInFrames={durationFrames} key={`clip-${i}`}>
            <OffthreadVideo src={clip.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Sequence>
        );
      })}

      <Sequence from={currentFrame} durationInFrames={Math.round(4 * fps)}>
        <EndCard {...endCard} />
      </Sequence>

      {voAudioSrc && <Audio src={voAudioSrc} />}

      {textOverlays.filter(o => o.text).map((overlay, i) => (
        <Sequence
          from={Math.round(overlay.startSec * fps)}
          durationInFrames={Math.round(overlay.durationSec * fps)}
          key={`text-${i}`}
        >
          <TextOverlay text={overlay.text} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const TextOverlay: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: '0 40px 120px 40px' }}>
      <div style={{
        color: 'white',
        fontSize: 52,
        fontWeight: 800,
        textAlign: 'center',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        opacity,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};
