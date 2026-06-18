# MintAds — CLAUDE.md

## What This Project Is

MintAds is a 42-hour hackathon project that automates UGC-style video ad production for Headout. A Headout experience ID goes in; campaign-ready short-form video ads (9:16, 1:1, 16:9) come out. The unfair advantage: every on-screen claim traces to Headout's catalog data — no hallucinated facts.

**Team**: Rushi (backend + orchestrator + UI), Rohan (video + audio + assembly), Gokul (creative config + QA)

---

## Monorepo Structure

```
mintads/
├── backend/          # Express.js API + pipeline orchestrator
│   └── src/
│       ├── routes/           # Express routes (generate, status, output, config, runs)
│       ├── services/         # External API clients
│       │   ├── headout-client.ts      # Headout catalog API → facts.json
│       │   ├── claude-client.ts       # Claude API → script.json
│       │   ├── higgsfield-client.ts   # Higgsfield SDK → video clips
│       │   ├── elevenlabs-client.ts   # ElevenLabs SDK → VO audio
│       │   └── remotion-client.ts     # Remotion renderer → final MP4
│       ├── orchestrator.ts   # Pipeline runner (wires all stages)
│       ├── script-engine.ts  # Claude call + validator + retry
│       ├── cost-tracker.ts   # Per-call cost logging to stage_logs
│       └── db.ts             # PostgreSQL pool (raw pg, no ORM)
├── frontend/         # React + Vite
│   └── src/
│       ├── pages/    # Generate, Progress, Output, History
│       └── components/
├── remotion/         # Remotion compositions
│   └── src/
│       ├── AdComposition.tsx  # Main composition (clips + audio + overlays)
│       ├── EndCard.tsx        # Branded closing frame
│       └── index.ts           # Remotion entry point
├── scripts/
│   ├── schema.sql    # PostgreSQL schema (7 tables)
│   └── seed.sql      # Angles, hooks, personas, config seed data
├── docs/             # PRD, ERD, execution plan
├── data/
│   └── runs/         # Generated artifacts per run (gitignored)
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## Running Locally

### 1. Start the database

```bash
docker-compose up -d
# Postgres starts on localhost:5432
# DB: mintads | User: mintads | Password: mintads_dev
# Schema + seed auto-applied on first start
```

### 2. Environment setup

```bash
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, HIGGSFIELD_CREDENTIALS, ELEVENLABS_API_KEY
```

### 3. Backend

```bash
cd backend
npm install
npm run dev       # ts-node-dev, restarts on change, port 3000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server, port 5173
```

### 5. Test the pipeline (tracer bullet)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": "7148",
    "persona": "solo",
    "journey_type": "pre_trip",
    "brand": "headout",
    "angle": "A3",
    "hook": "problem",
    "video_format": "9:16"
  }'
```

Expected: `{ "ad_id": "...", "run_id": ... }` — then poll `GET /api/status/{ad_id}`.

---

## Pipeline Stages

```
User Input (POST /api/generate)
  → Stage 1: Content Ingestion   — Headout API → facts.json
  → Stage 2: Script Engine       — Claude claude-sonnet-4-6 → script.json (with validator + 1 retry)
  → Stage 3: Video Engine  ─┐    — Higgsfield Seedance 2.0 I2V, 3 clips in parallel
  → Stage 4: Audio Engine  ─┤    — ElevenLabs TTS, runs parallel with video
                            ↓
  → Stage 5: Assembly            — Remotion renderMedia() per aspect ratio
  → Stage 6: Export              — Save artifacts, update DB, return output
```

**Timing**: ~2–3 minutes total. Video is the bottleneck (60–120s per clip, but all 3 run in parallel).
**Cost**: ~$3–6 per variant. Video accounts for ~90% ($2.70–5.40).

---

## Database (PostgreSQL)

**Connection**: `postgresql://mintads:mintads_dev@localhost:5432/mintads`

**7 tables**:
- `runs` — one row per pipeline execution (status, facts, script, cost)
- `stage_logs` — per-stage cost + timing + result metadata
- `assets` — file paths for generated clips, audio, final videos
- `angles` — dropdown values for the creative angle selector
- `hooks` — dropdown values for the hook selector
- `personas` — dropdown values for the persona selector
- `config` — key-value store (brand assets, voice ID, cost rates)

Use raw `pg` client with parameterized queries — no ORM. See `backend/src/db.ts`.

---

## Key APIs

### Headout Catalog (no auth)

```
GET https://www.headout.com/api/v6/tour-groups/{id}/
GET https://www.headout.com/api/v2/review/tour-group/id/{id}?limit=10
```

**Gotchas**:
- `highlights` and `inclusions` are HTML strings — parse `<li>` tags
- `minDuration` / `maxDuration` are milliseconds — divide by 3,600,000 for hours
- Use `reviewCount` not `ratingCount` (ratingCount is always null)
- Use `finalPrice` not `finalListingPrice`
- Filter reviews to `sourceLanguage == "EN"`
- Reviews response key is `items`, not `reviews`

### Claude (script generation)

- Model: `claude-sonnet-4-6`
- One call per variant: ~1,600 input tokens + ~1,000 output tokens ≈ $0.02
- Output is raw JSON (no markdown, no backticks)
- Validator runs after every call; retries once on failure with violation list appended

### Higgsfield (video)

- SDK: `@higgsfield/client/v2`
- Credentials env var format: `KEY_ID:KEY_SECRET`
- Model: `seedance-v2.0-i2v` (image-to-video)
- Hook scene: `quality: "high"` — body/payoff: `quality: "basic"`
- `generate_audio: false` — ElevenLabs is the audio source
- Master aspect ratio: `9:16` — Remotion crops for 1:1 and 16:9

### ElevenLabs (audio)

- SDK: `@elevenlabs/elevenlabs-js`
- Default voice: `JBFqnCBsd6RMkjVDRZzb` (George — warm, conversational)
- Model: `eleven_multilingual_v2`
- Phase 1: one continuous VO from concatenated vo_segments

### Remotion (assembly)

- Bundle once at server startup (`bundle()`), reuse across renders
- `renderMedia()` per aspect ratio: `9:16` (1080×1920), `1:1` (1080×1080), `16:9` (1920×1080)
- Fallback: ffmpeg CLI concat if Remotion fails
- End card is a Remotion React component — NOT a Seedance clip

---

## Test Experience IDs

| ID | Experience | City |
|---|---|---|
| `7148` | Colosseum, Palatine Hill & Roman Forum Pass | Rome |
| `23604` | Eiffel Tower Guided Tour by Elevator | Paris |

Use `7148` for the tracer bullet.

---

## Ad Naming Convention

```
HDO_META_{POI}_{Angle}_{Hook}_UGC_{Lang}_{Version}

Example: HDO_META_Colosseum_A3_problem_UGC_EN_v01
```

---

## Filesystem Layout (per run, gitignored)

```
data/runs/{ad_id}/
  facts.json
  script.json
  claim_report.json
  cost_breakdown.json
  clips/
    clip_001.mp4    (hook)
    clip_002.mp4    (body)
    clip_003.mp4    (payoff)
  vo_audio.mp3
  output/
    9x16.mp4
    1x1.mp4
    16x9.mp4
```

---

## Script Validator (3 checks)

1. **Structural** — 3 scenes (hook/body/payoff), matching vo_segments, durations 15–23s, end_card fields present
2. **Claim completeness** — every `claim_sources` key resolves to an existing `facts.json` field
3. **Orphan detection** — regex scans all text for currency/rating/count patterns; each must appear in `claim_sources`

On failure: retry once with violations appended to prompt. After 2 failures: run marked `failed`.

---

## REST API Summary

```
POST   /api/generate              Start pipeline run
GET    /api/status/:ad_id         Poll progress (frontend polls every 2s)
GET    /api/output/:ad_id         Get final output after completion
GET    /api/config/angles         Dropdown data
GET    /api/config/hooks          Dropdown data
GET    /api/config/personas       Dropdown data
GET    /api/runs                  Run history list
GET    /api/runs/:ad_id/cost      Cost breakdown for one run
```

Static file serving: `GET /data/runs/:ad_id/output/:filename`

---

## Frontend Pages

1. **Generate** — form with all dropdowns + Experience ID + Generate button
2. **Progress** — per-stage tracker, running cost, polls every 2s
3. **Output** — video player (format tabs), cost breakdown, claim report, download links
4. **History** — table of all runs, click to view output

---

## Error Handling Rules

- Invalid experience ID → `failed` immediately, clear user message
- Headout API timeout → 1 retry after 3s, then fail
- Claude invalid JSON → 1 retry, then fail
- Script validation failure → 1 retry with violations, then fail
- Seedance scene failure → 1 retry; if 2+ scenes succeed, assembly continues; if 0 succeed, fail
- Remotion render failure → attempt ffmpeg fallback
- Cost > $10 → log warning, do not block

---

## Build Notes

- TypeScript end-to-end — no Python
- No ORM — raw `pg` with parameterized queries
- No auth — internal demo tool
- No WebSockets — frontend polls every 2s via REST
- ffprobe required for audio duration check (`npm run dev` assumes ffprobe in PATH)
- Remotion requires Node 16+ and headless Chrome (auto-installed by Remotion)
