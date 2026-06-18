# MintAds — Ad Factory Pipeline
## Product Requirement Document (v2)

**Team**: Rushi (Applied AI), Rohan (Applied AI), Gokul (Perf Marketing)
**Duration**: 42 hours (Thu 6PM → Sat 12PM)
**Platform**: Replit · TypeScript / Node.js · Remotion

---

## 1. Problem Statement

Headout sells 10,000+ experiences across hundreds of cities. Only a handful ever get dedicated ad creative — production costs $300–3,000 per asset and takes weeks per cycle. Paid marketing runs on a tiny set of generic brand ads while the long tail of experiences gets nothing.

Performance marketing is won on creative volume. UGC-style creative runs ~34% cheaper than brand-produced content. Meta and Google reward advertisers who feed more variants — their AI picks winners, but only from what you give it.

The bottleneck is not media buying. It's that creative is handmade in a catalog business.

**Updated creative direction**: The target output is **AI-based UGC ads** — content that looks and feels like influencer collaborations with a brand product. Not polished brand films. Not static banners. The aesthetic is a creator walking you through an experience, telling you why it's worth it, with the energy and authenticity of organic social content.

**The unfair advantage**: The catalog — verified facts, real pricing, thousands of reviews per experience. Off-the-shelf tools generate pretty videos that know nothing about Headout. This engine generates UGC-style ads that are *true*.

---

## 2. Goals

1. **Live**: Experience ID → finished UGC-style ad, end to end, under ~10 minutes, no hand-editing
2. **True**: Zero hallucinated claims — every price, USP, and review on screen traces to catalog data
3. **Cheap**: Demonstrated cost per finished variant under $10 (track every API call; show the receipt)
4. **Plausible**: At least one generated ad that a perf marketer would actually upload to Meta/Google

---

## 3. Non-Goals (Out of Scope for Hackathon)

- No media buying — nothing goes live on Meta/Google. Output is ready-to-upload assets
- No fine-tuning or model training — rent everything; the value is the pipeline
- No image generation step — product photos from catalog feed directly into video generation
- No intelligent angle/hook selection — Phase 1 uses user-selected values from dropdowns, not LLM-driven auto-selection
- No perfect UI — great ads beat a great dashboard
- No statics pipeline — video is the sole deliverable
- Synthetic human faces / AI-generated UGC creators ARE in scope — the target output is UGC-style influencer content

---

## 4. User Journey

### Stage 0: User Input Form

User opens the web UI and fills out the following form:

| Field | Type | Description | Required |
|---|---|---|---|
| **Experience ID** | Text input (open) | Any valid Headout experience ID. This is the only truly variable field — any experience in the catalog is fair game. | Yes |
| **Persona** | Dropdown | Who the ad is speaking to. Options: Solo Traveller, Couple, Art Enthusiast, Cultural Traveller, Family, Budget Traveller (configurable list). | Yes |
| **Journey Type** | Dropdown | When in the trip lifecycle. Options: Pre-Trip (before trip, inspiration/planning), In-Trip (during trip, cross-sell/urgency). | Yes |
| **Brand** | Dropdown | Whether the ad is Headout-branded or experience-focused. Options: Headout (platform sells, brand CTA, "Book on Headout"), Non-Headout (experience sells, generic CTA, brand stays background). | Yes |
| **Angle** | Dropdown | The strategic argument the ad lands. Options populated from the master angle library (A1–A15+). | Yes |
| **Hook** | Dropdown | The scroll-stopping opening line/mechanic. Options populated from the hook library, filtered or suggested based on selected angle. | Yes |
| **Video Format** | Dropdown | Output dimensions. Options: 9:16 (vertical/Reels), 1:1 (square/feed), 16:9 (landscape/YouTube), All (render all three). | Yes |
| **Additional Details** | Text box (free text) | Any extra context the user wants to inject into the creative — tone, specific USP to emphasize, a competitor reference, a seasonal hook, etc. Passed as-is into the script generation prompt. | No |

User clicks **"Start"** → pipeline begins.

**Key design decision**: Experience ID is open-ended (any ID), not restricted to a pre-loaded set. This means the catalog fetch must handle any valid experience and fail gracefully for invalid ones.

---

### Stage 1: Content Ingestion

**Trigger**: User clicks Start.

**What happens**: Pipeline calls Headout's public-facing API endpoints with the provided Experience ID and fetches data across the following critical fields:

| Field | Source | Example |
|---|---|---|
| Title, Short Title | API response | "Colosseum: Skip-the-Line Arena Floor Tour" |
| City, Country | API response | Rome, Italy |
| Category | API response | Tours & Attractions |
| Price (amount + currency) | API response | €45 EUR |
| Duration (min/max, in minutes) | API response | 120–180 min |
| Rating score | API response | 4.8 |
| Review count | API response | 12,450 |
| Full description | API response | Long-form text |
| USPs | API → `descriptors[]` | ["Skip-the-line access", "Arena floor included", ...] |
| Highlights | API → `highlights[]` | ["Walk onto the arena floor", "Expert English-speaking guide", ...] |
| Inclusions list | API response | ["Skip-the-line entry", "Guided tour", "Arena floor access"] |
| Product photos | API → `media.productImages[]` | [url1, url2, url3, ...] |
| Top 5 reviews | API → reviews endpoint | [{text, star_rating, reviewer_name}, ...] |

**Output**: `facts.json` — the single source of truth for all downstream claims.

```json
{
  "experience_id": "string",
  "title": "string",
  "short_title": "string",
  "city": "string",
  "country": "string",
  "category": "string",
  "price": {
    "amount": 45,
    "currency": "EUR",
    "display": "€45"
  },
  "duration": {
    "min_minutes": 120,
    "max_minutes": 180,
    "display": "2–3 hours"
  },
  "rating": 4.8,
  "review_count": 12450,
  "description": "string (full text)",
  "usps": ["string array from descriptors[]"],
  "highlights": ["string array from highlights[]"],
  "inclusions": ["string array"],
  "photos": [
    { "url": "string", "alt": "string" }
  ],
  "top_reviews": [
    {
      "text": "string",
      "star_rating": 5,
      "reviewer_name": "string"
    }
  ]
}
```

**Error handling**:
- Invalid Experience ID → return clear error to UI: "Experience not found"
- API timeout → retry once, then fail with message
- Missing critical fields (no price, no photos) → fail with specific field-level errors; don't proceed with incomplete data

---

### Stage 2: Script Engine

**Inputs**:
- `facts.json` (from Stage 1)
- User form inputs: persona, journey type, brand, angle, hook, additional details
- System prompt: instructions defining how the script should be structured for the video + audio engines downstream

**What happens**: An LLM call (Claude) takes all inputs and produces a structured script that serves as the creative blueprint for both the video engine and the audio engine.

**System prompt responsibilities**:
- Enforce UGC tone: conversational, first-person, influencer-style energy
- Enforce claim tracing: every factual claim must come from facts.json
- Apply persona lens (solo = personal discovery, couple = shared moment, etc.)
- Apply journey modifier (pre-trip = aspirational/dreamy, in-trip = urgent/actionable)
- Apply brand mode (headout = "Book on Headout" CTA, non-headout = experience-led CTA)
- Apply the selected angle's strategic argument
- Apply the selected hook as the opening mechanic
- Incorporate additional details if provided
- Structure output for downstream consumption by video and audio engines separately

**Output**: `script.json`

```json
{
  "ad_id": "HDO_META_Colosseum_A3_problem_UGC_EN_v01",
  "metadata": {
    "experience_id": "string",
    "persona": "solo",
    "journey_type": "pre_trip",
    "brand": "headout",
    "angle": "A3",
    "hook": "problem",
    "video_format": "9:16"
  },

  "video_script": {
    "scenes": [
      {
        "scene_id": 1,
        "beat": "hook",
        "duration_sec": 3,
        "visual_direction": "Close-up of a massive tourist queue outside the Colosseum, heat haze, frustrated faces. Camera: handheld, slightly shaky, UGC feel.",
        "text_overlay": "They waited 3 hours.",
        "photo_reference_index": 0
      },
      {
        "scene_id": 2,
        "beat": "body",
        "duration_sec": 8,
        "visual_direction": "Creator walks confidently past the queue, phone in hand showing Headout app. Cut to walking through the entrance, sunlight streaming through arches. Energy: excited, authentic.",
        "text_overlay": null,
        "photo_reference_index": 1
      },
      {
        "scene_id": 3,
        "beat": "payoff",
        "duration_sec": 5,
        "visual_direction": "Wide shot of the arena floor, golden morning light. Creator turns to camera with genuine awe. Slow push-in.",
        "text_overlay": "We walked straight in.",
        "photo_reference_index": 2
      },
      {
        "scene_id": 4,
        "beat": "cta",
        "duration_sec": 4,
        "visual_direction": "Branded end card: Headout logo, price, rating, CTA button.",
        "text_overlay": "Skip the line on Headout · Free cancellation",
        "photo_reference_index": null
      }
    ],
    "total_duration_sec": 20,
    "video_generation_prompt": "Full prompt string for Higgsfield/fal.ai combining all scene directions into a cohesive video generation instruction"
  },

  "audio_script": {
    "vo_segments": [
      {
        "scene_id": 1,
        "beat": "hook",
        "vo_text": "You did NOT fly to Rome to stand in line for three hours.",
        "target_duration_sec": 3,
        "pacing": "fast, punchy"
      },
      {
        "scene_id": 2,
        "beat": "body",
        "vo_text": "Look at this queue. I walked straight past all of them. Headout skip-the-line — forty-five euros, you're on the arena floor in minutes.",
        "target_duration_sec": 8,
        "pacing": "energetic, building"
      },
      {
        "scene_id": 3,
        "beat": "payoff",
        "vo_text": "And if plans change? Free cancellation. Link's right there.",
        "target_duration_sec": 5,
        "pacing": "confident, slower on payoff"
      }
    ],
    "tone": "energetic, conversational, UGC creator voice",
    "total_duration_target_sec": 16
  },

  "end_card": {
    "price_display": "€45",
    "rating_display": "4.8★",
    "review_count_display": "12,450+ reviews",
    "cta_text": "Skip the Line Now",
    "brand_logo": true,
    "cancellation_text": "Free cancellation"
  },

  "claim_sources": {
    "3 hours": "known queue time for Colosseum (config)",
    "€45": "facts.price.display",
    "4.8★": "facts.rating",
    "12,450+ reviews": "facts.review_count",
    "Free cancellation": "facts — inferred from inclusions/policy",
    "arena floor": "facts.highlights"
  }
}
```

**Hard rule**: The `claim_sources` object is mandatory. Every factual claim in `vo_text`, `text_overlay`, and `end_card` must map to a field in facts.json or a config value. The script engine prompt must enforce this — no orphan claims.

#### Script Engine Validator (Automated Eval)

A programmatic validator runs automatically after every script generation, **before** anything is sent to video or audio engines. This is the pipeline's primary quality gate — catching errors here costs one Claude retry (~$0.003); catching them at assembly costs a full pipeline re-run (~$3–5 and 8 minutes).

**Check 1: Claim Completeness**
Every key in `claim_sources` must reference a field that exists in `facts.json`, and the values must match.

```
Validation logic:
- For each entry in script.claim_sources:
  - Parse the source_field path (e.g., "facts.price.display")
  - Resolve against facts.json
  - If field doesn't exist → FAIL: "Claim '{claim_text}' references non-existent field '{source_field}'"
  - If field value doesn't match claim → FAIL: "Claim '{claim_text}' says '{claimed_value}' but facts.json has '{actual_value}'"
```

Implementation: JSON path lookup. ~15 lines of code.

**Check 2: Structural Validity**
Script.json must have all required fields and internal references must be consistent.

```
Validation logic:
- video_script.scenes[] is non-empty
- Every scene has: scene_id, beat, duration_sec, visual_direction
- audio_script.vo_segments[] is non-empty
- Every vo_segment has: scene_id, vo_text, target_duration_sec
- Every vo_segment.scene_id matches a scene in video_script.scenes[]
- Sum of scene durations is between 15–30 seconds
- Sum of vo_segment target durations is between 12–28 seconds (VO is shorter than total video due to end card)
- end_card has: price_display, rating_display, cta_text
- ad_id follows naming convention pattern
```

Implementation: Schema validation. ~25 lines of code.

**Check 3: No Orphan Claims**
Scan all text outputs for factual claims (numbers, prices, ratings, percentages) and verify each appears in `claim_sources`.

```
Validation logic:
- Extract all numbers/prices/ratings from: vo_segments[].vo_text, scenes[].text_overlay, end_card fields
- Regex patterns: currency amounts (€45, $68, £30), ratings (4.8★, 4.8/5), counts (12,450+), durations (3 hours, 2-3 hours), percentages
- For each extracted value:
  - Check if it appears as a key or value in claim_sources
  - If not → FAIL: "Unclaimed factual assertion '{value}' found in {location}"
```

Implementation: Regex extraction + set lookup. ~20 lines of code.

**On failure — auto-retry logic:**
```
1. Run validator on script.json
2. If PASS → proceed to Stage 3 + 4
3. If FAIL →
   a. Collect all violation messages
   b. Re-call Claude with original prompt + appended correction:
      "Your previous script had these violations: {violations}. 
       Regenerate with all claims strictly from facts.json."
   c. Run validator on retry output
   d. If PASS → proceed
   e. If FAIL again → surface errors to UI, stop pipeline for this variant
      "Script validation failed after retry: {violations}. Please adjust inputs and try again."
```

Max retries: 1 (two total attempts). Cost of retry: ~$0.003. Time: ~3 seconds. Worth it every time versus a $3+ downstream failure.

**Validator output — the Claim Report:**
On success, the validator produces the `claim_report.json` entity (defined in Section 5). This report is displayed in the frontend and is a key demo artifact for the "true" judging criterion — it visually proves that every on-screen claim traces to the catalog.

---

### Stage 3: Video Engine

**Inputs**:
- `script.json → video_script.scenes[]` (individual scene-by-scene visual directions)
- `facts.json → photos[]` (product photo URLs as source/seed images)
- System prompt specific to Higgsfield (UGC aesthetic, camera style, aspect ratio)

**What happens**: Each scene in the video script is sent as a separate generation call to Higgsfield. This gives granular control over each beat (hook, body, payoff) and allows retrying or swapping individual scenes without regenerating the entire video.

**Approach: Option B — Individual clips per scene, stitched in assembly.**

For a typical 20-second ad with 4 scenes:
- Scene 1 (hook, 3s): Separate Higgsfield call with scene-specific prompt + reference photo
- Scene 2 (body, 8s): Separate call
- Scene 3 (payoff, 5s): Separate call
- Scene 4 (CTA/end card, 4s): Generated in Remotion (no Higgsfield call — this is a branded template)

Each call receives:
- The scene's `visual_direction` from script.json
- A reference product photo from `facts.json.photos[scene.photo_reference_index]`
- Global style parameters: UGC / handheld / authentic aesthetic
- Duration target for that specific scene
- Aspect ratio as selected by user

**Synthetic human faces are in scope.** The UGC creative direction means Higgsfield should generate creator-style talent — a person walking through the experience, reacting, speaking to camera. This is the core differentiator of UGC-style output versus faceless b-roll.

**Output**: Array of raw video clips — one per scene, unassembled, no audio, no text overlays.

```json
{
  "clips": [
    { "scene_id": 1, "beat": "hook", "file_path": "/tmp/clip_001.mp4", "duration_sec": 3.2 },
    { "scene_id": 2, "beat": "body", "file_path": "/tmp/clip_002.mp4", "duration_sec": 8.1 },
    { "scene_id": 3, "beat": "payoff", "file_path": "/tmp/clip_003.mp4", "duration_sec": 5.4 }
  ],
  "total_raw_duration_sec": 16.7
}
```

**Cost logging**: Every Higgsfield API call logged with scene_id, model, duration, and cost.

**Error handling per clip**: If a scene generation fails or returns low quality, retry that scene once. If it fails again, log the error and skip — assembly can work with fewer clips (degraded but functional).

**Sanity check (automated)**: For each generated clip — verify file exists, is non-zero bytes, and duration is within ±2 seconds of target. Catches API failures without judging aesthetics. Aesthetic QA is Gokul's job during the Friday evening review pass.

---

### Stage 4: Audio Engine

**Inputs**:
- `script.json → audio_script` (vo_text, tone, pacing, duration target)
- `script.json → video_script.scenes[]` (scene sequence, durations, and beat descriptions — needed so the VO pacing aligns with visual beats)
- System prompt for ElevenLabs (voice selection, speed, style)

**What happens**: The VO text from the script is sent to ElevenLabs. The audio engine receives the full video scene context so the VO is structured to match the visual beat sequence — the hook line paces with the hook clip, the body narration covers the body clip duration, the payoff line lands with the visual reveal.

**Critical sync design**: The script engine (Stage 2) is responsible for writing the `audio_script.vo_text` with awareness of the `video_script.scenes[]` structure. The VO text is segmented to match scene beats:

```json
{
  "audio_script": {
    "vo_segments": [
      {
        "scene_id": 1,
        "beat": "hook",
        "vo_text": "You did NOT fly to Rome to stand in line for three hours.",
        "target_duration_sec": 3,
        "pacing": "fast, punchy"
      },
      {
        "scene_id": 2,
        "beat": "body",
        "vo_text": "Look at this queue. I walked straight past all of them. Headout skip-the-line — forty-five euros, you're on the arena floor in minutes.",
        "target_duration_sec": 8,
        "pacing": "energetic, building"
      },
      {
        "scene_id": 3,
        "beat": "payoff",
        "vo_text": "And if plans change? Free cancellation. Link's right there.",
        "target_duration_sec": 5,
        "pacing": "confident, slower on payoff"
      }
    ],
    "tone": "energetic, conversational, UGC creator voice",
    "total_duration_target_sec": 16
  }
}
```

**Two generation approaches** (to be validated by Rohan/Gokul during manual testing):
- **Approach A**: Generate one continuous VO from the full concatenated text, relying on punctuation and script pacing to approximate beat alignment. Simpler, fewer API calls.
- **Approach B**: Generate separate VO clips per segment, stitch in assembly for precise beat-level sync. More control, more API calls.

Start with Approach A; move to B if sync quality demands it.

**Runs in parallel with Stage 3** — both consume script.json independently. Assembly (Stage 5) waits for both.

**Output**: VO audio file(s) (mp3/wav) + actual duration(s) in seconds.

**Key parameters**:
- Voice ID: hardcoded for hackathon (energetic, UGC creator tone — not polished narrator)
- Speed: slightly fast (~1.1x) for ad pacing
- Style: conversational, authentic, like a real person talking to camera

**Note**: The final audio duration(s) become the master clock for assembly. If video clips and VO segments don't perfectly match, assembly handles fine-tuning the sync (trim/pad per segment).

**Sanity check (automated)**: Verify audio file exists, is non-zero bytes, and total duration is within ±3 seconds of `total_duration_target_sec`. Catches API failures and grossly mis-paced VO. Tone/pronunciation QA is Gokul's job during Friday evening review.

---

### Stage 5: Assembly Line

**Inputs**:
- Raw video clips[] from Stage 3 (one per scene, each with scene_id and duration)
- VO audio file(s) from Stage 4 (either one continuous file or per-segment files)
- `script.json → video_script.scenes[].text_overlay` (text content + timing per scene)
- `script.json → end_card` (price, rating, CTA, brand logo)
- Video format selection from user form (9:16, 1:1, 16:9, or all)
- Brand assets (logo, fonts, colors — static files in repo)

**What happens**: Remotion (or ffmpeg fallback) composites all elements into the final ad:

1. Sequence the raw video clips in scene_id order (hook → body → payoff)
2. Layer the VO audio aligned per scene — each VO segment starts when its corresponding video clip starts
3. Handle duration mismatches per scene:
   - If video clip is longer than VO segment → trim video to VO duration
   - If video clip is shorter than VO segment → hold last frame or slow the clip
   - VO segments are the per-scene clock; total VO duration is the master clock
4. Add text overlays at the start of their corresponding scenes
5. Generate and append the branded end card (final 3–5 seconds):
   - Headout logo (if brand = "headout")
   - Price from facts.json
   - Rating + review count
   - CTA text
   - "Free cancellation" badge
6. Render in the selected video format(s):
   - If "9:16" → render one vertical video
   - If "1:1" → render one square video (center crop from 9:16 or dedicated render)
   - If "16:9" → render one landscape video (center crop or pillarbox)
   - If "All" → render all three sequentially

**Output**: Final rendered video file(s) — the finished UGC ad creative(s).

**Sanity check (automated)**: Verify each rendered file exists, is non-zero bytes, and duration is within ±2 seconds of expected (sum of scene durations + end card). Visual/audio sync QA is a human spot-check — play the video once before marking it complete.

---

### Stage 6: Storage & Display

**What happens**:
1. Final video(s) saved to the output database/storage
2. Cost ledger updated with total cost for this generation run
3. Claim report generated (every on-screen claim → source mapping)
4. Frontend updated to show:
   - The finished video(s) with inline playback
   - The cost breakdown
   - The claim-tracing report
   - Download links for all rendered formats
   - Ad ID / naming convention applied

**Naming convention**:
```
HDO_[Channel]_[POI]_[Angle]_[Hook]_[Format]_[Lang]_[Version]

Example: HDO_META_Colosseum_A3_problem_UGC_EN_v01
```

**Storage structure**:
```
output/
  {experience_id}/
    {ad_id}/
      9x16.mp4
      1x1.mp4
      16x9.mp4
      script.json
      facts.json
      cost_breakdown.json
      claim_report.json
```

---

## 5. Entities & Data Schemas

### Entity 1: User Input

```json
{
  "experience_id": "string (open — any valid Headout ID)",
  "persona": "enum: solo | couple | art_enthusiast | cultural | family | budget",
  "journey_type": "enum: pre_trip | in_trip",
  "brand": "enum: headout | non_headout",
  "angle": "enum: A1 | A2 | A3 | ... | A15+",
  "hook": "enum: problem | outcome | transformation | fomo | enemy | mistake | social_proof | curiosity | listicle | relatable_pov | authority | visual_interrupt",
  "video_format": "enum: 9:16 | 1:1 | 16:9 | all",
  "additional_details": "string | null (free text, optional)"
}
```

### Entity 2: Facts (Catalog Data)

See `facts.json` schema in Stage 1 above.

### Entity 3: Script

See `script.json` schema in Stage 2 above.

### Entity 4: Generated Assets

```json
{
  "ad_id": "string",
  "experience_id": "string",
  "raw_video_url": "string (from Stage 3)",
  "raw_audio_url": "string (from Stage 4)",
  "final_videos": [
    { "format": "9:16", "url": "string", "duration_sec": 20 },
    { "format": "1:1", "url": "string", "duration_sec": 20 },
    { "format": "16:9", "url": "string", "duration_sec": 20 }
  ],
  "status": "enum: generating | completed | failed",
  "created_at": "timestamp"
}
```

### Entity 5: Cost Ledger

```json
{
  "ad_id": "string",
  "total_cost_usd": 0.00,
  "breakdown": [
    { "stage": "content_ingestion", "service": "headout_api", "cost_usd": 0.00 },
    { "stage": "script_engine", "service": "claude-sonnet-4-6", "tokens_used": 2500, "cost_usd": 0.003 },
    { "stage": "video_engine", "service": "seedance-2.0-fast", "duration_sec": 20, "cost_usd": 0.45 },
    { "stage": "audio_engine", "service": "elevenlabs", "characters": 450, "cost_usd": 0.03 },
    { "stage": "assembly", "service": "remotion", "renders": 3, "cost_usd": 0.00 }
  ]
}
```

### Entity 6: Claim Report

```json
{
  "ad_id": "string",
  "claims": [
    {
      "claim_text": "€45",
      "appears_in": ["vo_text", "end_card"],
      "source_field": "facts.price.display",
      "source_value": "€45",
      "verified": true
    },
    {
      "claim_text": "4.8 stars",
      "appears_in": ["end_card"],
      "source_field": "facts.rating",
      "source_value": 4.8,
      "verified": true
    }
  ],
  "total_claims": 6,
  "verified_claims": 6,
  "unverified_claims": 0
}
```

---

## 6. Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  STAGE 0: USER INPUT FORM                                    │
│                                                              │
│  Experience ID (open text)                                   │
│  Persona (dropdown) · Journey (dropdown) · Brand (dropdown)  │
│  Angle (dropdown) · Hook (dropdown) · Video Format (dropdown)│
│  Additional Details (text box, optional)                     │
│                                                              │
│  [ Start ] ─────────────────────────────────────────────┐    │
└─────────────────────────────────────────────────────────┼────┘
                                                          │
                                                          ▼
┌──────────────────────────────────────────────────────────────┐
│  STAGE 1: CONTENT INGESTION                                  │
│  Experience ID → Headout Public API → facts.json             │
│  14 critical fields fetched and validated                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  STAGE 2: SCRIPT ENGINE                                      │
│  facts.json + user inputs + system prompt → Claude API       │
│  Output: script.json (video_script + audio_script + claims)  │
│  Claim tracing enforced: every fact → facts.json field       │
└──────────────────────────┬───────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│  STAGE 3: VIDEO ENGINE  │ │  STAGE 4: AUDIO ENGINE  │
│                         │ │                         │
│  video_script +         │ │  audio_script →         │
│  product photos →       │ │  ElevenLabs →           │
│  Higgsfield/fal.ai →    │ │  vo_audio.mp3           │
│  raw video clip(s)      │ │                         │
│                         │ │  (master clock)         │
│  PARALLEL ──────────────┼─┤  PARALLEL               │
└────────────┬────────────┘ └────────────┬────────────┘
             │                           │
             └──────────┬────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  STAGE 5: ASSEMBLY LINE                                      │
│  raw video + vo audio + text overlays + end card →           │
│  Remotion / ffmpeg →                                         │
│  Final rendered video(s) in selected format(s)               │
│  Audio = master clock; video trimmed/padded to match         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  STAGE 6: STORAGE & DISPLAY                                  │
│  Save to output DB · Update cost ledger · Generate claims    │
│  Show in frontend: video player + cost + claims + download   │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Tech Stack

| Layer | Tool | Reason |
|---|---|---|
| Language | TypeScript / Node.js | Remotion is React/TS native; one runtime end-to-end |
| Frontend | Next.js or plain React | Form + progress + video playback |
| Script generation | Claude API (claude-sonnet-4-6) | Strong instruction-following for claim tracing |
| Video generation | Higgsfield (Seedance 2.0 Fast) | Image-to-video; subscription on ai-dev@headout; per-scene clip generation |
| Audio generation | ElevenLabs | VO generation; account exists |
| Assembly | Remotion (fallback: ffmpeg) | React-based video composition |
| Hosting / Dev | Replit | Collaborative dev environment |
| Storage | Local filesystem (hack) / cloud bucket (post-hack) | Keep it simple |

---

## 8. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|---|---|
| Invalid Experience ID | Return clear error: "Experience not found." Do not proceed. |
| API returns incomplete data (missing price, no photos) | Fail with field-level errors: "Missing: price, photos." Do not generate with partial data. |
| Higgsfield returns garbled / low-quality video | Log error. Show error state in UI. Allow retry. Pre-cached backup for demo. |
| ElevenLabs timeout | Retry once. If fails, fall back to OpenAI TTS. |
| VO duration mismatches video duration | Assembly trims video to VO length (audio is master clock). Log warning. |
| Claude generates a claim not traceable to facts.json | Claim validator catches it. Flag in claim report as unverified. |
| Remotion render fails on Replit (memory/timeout) | Fall back to ffmpeg CLI composition. |
| User selects "All" video formats | Render sequentially: 9:16 first, then 1:1, then 16:9. |
| Demo day: live generation fails on stage | Swap to pre-cached output. "Here's what it produced earlier." |

---

## 9. Workstream Split

### Workstream A — Ingestion + Script + Orchestrator + UI (Rushi)

- Content ingestion module (Headout API → facts.json)
- Script engine (facts.json + user inputs → Claude → script.json)
- Claim-tracing validator
- Pipeline orchestrator (calls each stage, parallelizes video+audio)
- Cost ledger tracking
- Frontend UI (form, progress, playback, downloads)

### Workstream B — Video + Audio + Assembly + Export (Rohan)

- Video engine module (product photos + video_script → Higgsfield/fal.ai → raw clips)
- Audio engine module (audio_script → ElevenLabs → VO file)
- Remotion compositions (video + VO + overlays + end card)
- Aspect ratio rendering (selected formats)
- Export with naming convention + storage

### Workstream C — Creative Config + QA (Gokul)

- Populate angle/hook dropdown options with descriptions
- Validate facts.json output for real experiences
- QA script output: "would a marketer upload this?"
- Review final video quality
- Prepare economics slide (cost per variant vs agency)
- Demo script

---

## 10. Phase Plan & Timeline

### Phase 1: Foundation (Thu 6PM → Fri 12PM)

**Goal**: One experience → full pipeline → one finished UGC video.

| Time | Milestone | Owner |
|---|---|---|
| Thu 6–8PM | Lock PRD, freeze schemas, repo on Replit, UI shell with form fields | All 3 |
| Thu 8–9PM | Gokul delivers: API endpoint details, angle/hook dropdown values, brand asset files | Gokul |
| Thu 9PM–12AM | Content ingestion working for any experience ID. Script engine producing valid script.json. | Rushi |
| Thu 9PM–12AM | Remotion hello world on Replit. One test video clip via fal.ai. One test VO via ElevenLabs. | Rohan |
| Fri 8AM–12PM | **Tracer bullet**: 1 experience → full chain → 1 finished UGC video in 9:16. | Rushi + Rohan integrate |

### Phase 2: Scale & Polish (Fri 12PM → Sat 8AM)

**Goal**: Pipeline robust for any experience ID. All formats rendering. Quality validated.

| Time | Milestone | Owner |
|---|---|---|
| Fri 12–4PM | Pipeline runs for 5 different experiences. All 3 aspect ratios rendering. | Both |
| Fri 4–8PM | Claim tracing visible in UI. Cost ledger complete. End card polished. | Rushi |
| Fri 4–8PM | Assembly quality: VO sync, text overlay timing, brand consistency. | Rohan |
| Fri 8PM–12AM | Gokul reviews all outputs. Script rewrites for weak variants. Bug fixes. | All 3 |
| Sat 12AM–8AM | Pre-cache ad packs for demo. Final bug fixes. | Rushi (overnight) |

### Phase 3: Demo Prep (Sat 8AM → Demo)

| Time | Milestone | Owner |
|---|---|---|
| Sat 8–10AM | UI polish. Economics slide. | Rohan (UI) + Gokul (slide) |
| Sat 10AM–12PM | Rehearse demo 3×. Test live run. Prepare fallback. Pick hero ad. | All 3 |

---

## 11. Demo Script (Suggested)

1. **Open**: "Headout sells 10,000 experiences. Fewer than 50 have ad creative. We built the Ad Factory."
2. **Show the form**: Experience ID, persona, angle, hook — simple dropdowns. "A marketer fills this in 30 seconds."
3. **Click Start**: Pipeline runs live. Show each stage completing in the UI.
4. **While generating**: Walk through 2 pre-cached UGC ads. Show claim tracing — "every number traces to the catalog." Show cost — "$X per variant."
5. **Live result plays**: The fresh ad finishes. Play it. Show all format variants.
6. **Economics slide**: "Our cost: ~$X per variant. Agency cost: $300–3,000. For the price of one agency ad, we produce Y variants."
7. **Close**: "These are real UGC-style ads built from real catalog data. Every claim is true. A perf marketer would upload this today."

---

## 12. Success Metrics

| Criterion | How We Prove It |
|---|---|
| **Live** | Any experience ID → pipeline runs → UGC video plays in <10 min |
| **True** | Claim report: every on-screen claim linked to catalog data. Zero hallucinations. |
| **Cheap** | Cost ledger: per-variant cost < $10. Economics slide vs agency benchmark. |
| **Plausible** | Gokul confirms at least 1 ad he'd upload to Meta. |

---

## 13. Open Items & Action Items

### For Gokul:

**1. Base Elements to Lock Down (dropdowns for the form):**
- Persona options list with descriptions
- Journey Type options (pre-trip / in-trip confirmed, any others?)
- Brand options (headout / non-headout confirmed, any others?)
- Angles — full list with IDs and descriptions for dropdown
- Hooks — full list with IDs and descriptions for dropdown

**2. System Prompts & Assembly (creative direction):**
- Script Generation system prompt: specifically defining how the UGC video should look and feel, beyond just angles and hooks. What does a "good" Headout UGC ad look like? What's the creator persona? What's the energy level?
- Audio Generation system prompt: voice style, pacing guidance, tone references

**3. Manual Platform Testing (critical path — do this tonight/Friday morning):**
- Video: go through Higgsfield + fal.ai, test with real Headout experience photos, iterate on prompts to improve video quality. Goal: have working system prompts and know the platform's strengths/limitations before the engineering pipeline reaches the video stage.
- Audio: go through ElevenLabs, test different voices, find the right UGC creator tone, iterate on VO generation. Pick a voice ID.
- Assembly: review Remotion capabilities for text overlay, end card, aspect ratio rendering.
- For testing, pick data directly from headout.com product pages for real experiences.

### For Rohan:

**4. Technical Validation (Thursday night):**
- Remotion hello-world on Replit — confirm it runs
- Higgsfield API: test one image-to-video call, understand input format, output format, latency
- ElevenLabs API: test one VO generation, understand voice selection, output format
- Confirm: can Remotion stitch Higgsfield clips + ElevenLabs audio + text overlays on Replit?

### For Rushi:

**5. Content Ingestion Validation (Thursday night):**
- Test Headout public API with a real experience ID
- Confirm which of the 14 fields are returned vs need scraping
- Build facts.json schema validation

### Shared Reference — User Inputs & Content Ingestion Fields:

**User inputs (form):**
- Experience ID (open text — any valid ID)
- Persona (dropdown)
- Journey Type (dropdown)
- Brand (dropdown)
- Angles (dropdown)
- Hooks (dropdown)
- Video Format (dropdown: 9:16, 1:1, 16:9, all)
- Additional Details (text box, optional)

**Content Ingestion (from 2 Headout public APIs):**
- Title, short title
- City, country, category
- Price (amount + currency)
- Duration (min/max, in minutes)
- Rating score + review count
- Full description
- USPs → from descriptors[]
- Highlights → from highlights[]
- Inclusions list
- Product photos → from media.productImages[]
- Review text, star rating, reviewer name (top 5)

---

## 14. Stretch Goals (Only if Phase 2 complete by Sat 8AM)

- **Multi-language**: Same ad in EN + ES + FR via ElevenLabs language swap
- **Image generation step**: Add Nano Banana / fal.ai image gen between script and video for custom key frames
- **Batch mode**: Multiple experiences × multiple angles in one run
- **User control loop**: After viewing output, change angle/hook/format and re-generate
- **Competitor angle-mining**: Scrape Meta Ad Library for competitor ads, suggest new angles
- **Slack integration**: Push finished ads to a Slack channel with preview
- **Static ads pipeline**: Hero statics, price-anchor cards, carousels
