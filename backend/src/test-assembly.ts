/**
 * Assembly test: reads clips + VO from an existing pipeline run and renders via Remotion.
 *
 * Prerequisites: run test-e2e-pipeline.ts first to generate clips and VO files.
 *
 * Run: cd backend && npx ts-node --transpile-only src/test-assembly.ts [adId]
 *      Default adId: HDO_META_Rome_A3_problem_UGC_EN_v01
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs/promises';
import { db } from './db';
import { initRemotionBundle, assembleAd } from './services/remotion-client';
import type { VideoClipResult, VoSegmentResult, ScriptJson, UserInput } from './types';

const DATA_RUNS_DIR = path.resolve(__dirname, '../../data/runs');
const adId = process.argv[2] ?? 'HDO_META_Rome_A3_problem_UGC_EN_v01';

function elapsed(ms: number): string {
  return ms >= 60000 ? `${(ms / 60000).toFixed(1)}m` : `${(ms / 1000).toFixed(1)}s`;
}

function sep(label: string) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(64));
}

async function loadRunFromDisk(): Promise<{
  clips: VideoClipResult[];
  voSegments: VoSegmentResult[];
  script: ScriptJson;
  runId: number;
  userInput: UserInput;
}> {
  const runDir = path.join(DATA_RUNS_DIR, adId);

  const scriptRaw = await fs.readFile(path.join(runDir, 'script.json'), 'utf8');
  const script: ScriptJson = JSON.parse(scriptRaw);

  // Discover clip files (clip_001.mp4, clip_002.mp4, ...)
  const clipsDir = path.join(runDir, 'clips');
  let clipFiles: string[] = [];
  try {
    clipFiles = (await fs.readdir(clipsDir))
      .filter(f => f.startsWith('clip_') && f.endsWith('.mp4'))
      .sort();
  } catch {
    // clips/ may not exist — check for files directly in runDir
    const all = await fs.readdir(runDir);
    clipFiles = all.filter(f => f.startsWith('clip_') && f.endsWith('.mp4')).sort();
  }

  if (clipFiles.length === 0) {
    throw new Error(`No clip files found under ${clipsDir} — run test-e2e-pipeline.ts first`);
  }

  // Build VideoClipResult[] by parsing the scene number out of each filename
  // (clip_002.mp4 → scene index 2, 1-based). This is robust to partial failures
  // where a middle clip is missing — positional matching would mis-assign scene_ids.
  const contentScenes = script.video_script.scenes.filter(s => s.beat !== 'cta');
  const sceneByIndex = new Map(contentScenes.map((s, i) => [i, s]));

  const clips: VideoClipResult[] = clipFiles.map((filename) => {
    const m = filename.match(/clip_0*(\d+)\.mp4$/);
    if (!m) throw new Error(`Unparseable clip filename: ${filename}`);
    const idx = Number(m[1]) - 1; // 1-based filename → 0-based content scene
    const scene = sceneByIndex.get(idx);
    if (!scene) throw new Error(`No content scene for clip index ${idx + 1} (${filename})`);
    return {
      scene_id: scene.scene_id,
      beat: scene.beat,
      shot_type: scene.shot_type,
      file_path: path.join(clipsDir, filename),
      remote_url: '',
      duration_sec: scene.duration_sec,
    };
  });

  // Discover VO files (vo_001.mp3, vo_002.mp3, ...)
  const allFiles = await fs.readdir(runDir);
  const voFiles = allFiles.filter(f => f.startsWith('vo_') && f.endsWith('.mp3')).sort();

  if (voFiles.length === 0) {
    throw new Error(`No VO files found in ${runDir} — run test-e2e-pipeline.ts first`);
  }

  // Map VO files by parsed scene index (vo_002.mp3 → scene index 2, 1-based)
  const segByIndex = new Map(script.audio_script.vo_segments.map((s, i) => [i, s]));

  const voSegments: VoSegmentResult[] = voFiles.map((filename) => {
    const m = filename.match(/vo_0*(\d+)\.mp3$/);
    if (!m) throw new Error(`Unparseable VO filename: ${filename}`);
    const idx = Number(m[1]) - 1; // 1-based filename → 0-based segment
    const seg = segByIndex.get(idx);
    if (!seg) throw new Error(`No VO segment for vo index ${idx + 1} (${filename})`);
    return {
      scene_id: seg.scene_id,
      file_path: path.join(runDir, filename),
      duration_sec: seg.target_duration_sec, // fallback; actual duration needs ffprobe
      characters: seg.vo_text.length,
    };
  });

  // Fetch run_id from DB
  const row = await db.query('SELECT id FROM runs WHERE ad_id = $1', [adId]);
  if (!row.rows.length) throw new Error(`No DB row found for ad_id=${adId}`);
  const runId = row.rows[0].id as number;

  const userInput: UserInput = {
    experience_id: script.metadata.experience_id,
    persona: script.metadata.persona,
    journey_type: script.metadata.journey_type as 'pre_trip' | 'in_trip',
    brand: script.metadata.brand as 'headout' | 'non_headout',
    angle: script.metadata.angle,
    hook: script.metadata.hook,
    video_format: (script.metadata.video_format as UserInput['video_format']) ?? '9:16',
  };

  return { clips, voSegments, script, runId, userInput };
}

async function main() {
  sep(`ASSEMBLY TEST — ${adId}`);

  sep('STEP 1 — Loading clips + VO from disk');
  const { clips, voSegments, script, runId, userInput } = await loadRunFromDisk();

  console.log(`  run_id      : ${runId}`);
  console.log(`  clips       : ${clips.length}`);
  console.log(`  vo segments : ${voSegments.length}`);
  console.log(`  format      : ${userInput.video_format}`);

  console.log('\n  Clips:');
  for (const c of clips) {
    console.log(`    scene ${c.scene_id} [${c.beat}] ${c.shot_type} ${c.duration_sec}s → ${path.basename(c.file_path)}`);
  }
  console.log('\n  VO segments:');
  for (const v of voSegments) {
    console.log(`    scene ${v.scene_id} ${v.duration_sec}s → ${path.basename(v.file_path)}`);
  }

  sep('STEP 2 — Initializing Remotion bundle (first time: ~30–60s)');
  const tBundle = Date.now();
  await initRemotionBundle();
  console.log(`  Bundle ready in ${elapsed(Date.now() - tBundle)}`);

  sep('STEP 3 — Rendering via Remotion');
  const tRender = Date.now();
  const result = await assembleAd(clips, voSegments, script, userInput, runId, adId);
  console.log(`\n  Render complete in ${elapsed(Date.now() - tRender)}`);

  sep('DONE');
  for (const f of result.files) {
    const mb = (f.file_size / 1024 / 1024).toFixed(1);
    console.log(`  ${f.format.padEnd(6)} → ${path.basename(f.file_path)} (${mb} MB, ${f.duration_sec.toFixed(1)}s)`);
  }
  console.log(`\n  Artifacts at: data/runs/${adId}/output/`);
}

main()
  .catch(err => {
    console.error('\n✗ ASSEMBLY FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  })
  .finally(() => db.end());
