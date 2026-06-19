import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { EndCard, EndCardProps } from './EndCard';

export interface VoSegmentDef {
  sceneId: number;
  filePath: string;    // file:// URL or remote URL
  durationSec: number; // actual ElevenLabs output duration (may differ from script target)
}

export interface ClipDef {
  src: string;         // file:// URL or remote URL
  durationSec: number;
  beat: string;
  sceneId: number;
}

export interface AdProps {
  clips: ClipDef[];
  voSegments: VoSegmentDef[]; // one per content scene (all non-cta scenes)
  bgMusicSrc?: string;
  bgMusicVolume?: number; // 0–1, default 0.12
  textOverlays: Array<{ text: string; startSec: number; durationSec: number }>;
  endCard: EndCardProps;
  fps: number;
}

export const AdComposition: React.FC<AdProps> = ({
  clips,
  voSegments,
  bgMusicSrc,
  bgMusicVolume = 0.12,
  textOverlays,
  endCard,
  fps,
}) => {
  // Pre-compute clip frame offsets — clips must arrive sorted by sceneId
  let acc = 0;
  const clipsWithOffsets = clips.map((clip) => {
    const startFrame = acc;
    const durationFrames = Math.round(clip.durationSec * fps);
    acc += durationFrames;
    return { ...clip, startFrame, durationFrames };
  });
  const endCardStartFrame = acc;
  const endCardDurationFrames = Math.round(4 * fps);

  // Map sceneId → clip startFrame and durationFrames for VO placement and bounding
  const sceneStartFrame = new Map<number, number>(
    clipsWithOffsets.map(c => [c.sceneId, c.startFrame]),
  );
  const sceneFrameCount = new Map<number, number>(
    clipsWithOffsets.map(c => [c.sceneId, c.durationFrames]),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Video clips — ALL muted (volume={0}).
          Lip-sync clips have mouth movements baked in by Seedance, but their
          embedded audio is discarded here. ElevenLabs VO is the only audio source. */}
      {clipsWithOffsets.map((clip, i) => (
        <Sequence
          from={clip.startFrame}
          durationInFrames={clip.durationFrames}
          key={`clip-${i}`}
        >
          <OffthreadVideo
            src={clip.src}
            volume={0}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Sequence>
      ))}

      {/* End card (Remotion React component — not a Seedance clip) */}
      <Sequence from={endCardStartFrame} durationInFrames={endCardDurationFrames}>
        <EndCard {...endCard} />
      </Sequence>

      {/* VO audio — one ElevenLabs segment per content scene.
          Each segment is anchored to its clip's start frame. If a clip is missing
          (partial failure) the VO for that scene is skipped via the null check. */}
      {voSegments.map((seg, i) => {
        const startFrame = sceneStartFrame.get(seg.sceneId);
        const durationFrames = sceneFrameCount.get(seg.sceneId);
        if (startFrame === undefined || durationFrames === undefined) return null;
        // Bound VO to its clip's frame window. Safe because the clip was requested at
        // ceil(voDurationSec), so durationFrames >= actual VO length — no truncation,
        // and the window prevents any bleed into the next scene's audio.
        return (
          <Sequence from={startFrame} durationInFrames={durationFrames} key={`vo-${i}`}>
            <Audio src={seg.filePath} volume={1} />
          </Sequence>
        );
      })}

      {/* Background music — plays throughout at low volume */}
      {bgMusicSrc && (
        <Audio src={bgMusicSrc} volume={bgMusicVolume} />
      )}

      {/* Text overlays — fade in over the first 8 frames */}
      {textOverlays.filter((o) => o.text).map((overlay, i) => (
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
