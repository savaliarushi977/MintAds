# Chunk 6 — Polish Suggestions: Animations, Music & Brand Styling

These are suggestions for elevating the Remotion output to match Headout's visual identity. No dev work has been done yet — this doc captures the decisions to make before implementation.

---

## 1. Background Music

### Recommended source: **Uppbeat.io**

- Free tier includes ~50 tracks/month with attribution; paid removes attribution requirement
- Search: category **"Travel"** or **"Adventure"**, filter **"Happy"** or **"Uplifting"**
- Download as MP3, store at `static/music/bg_track.mp3` in the project root
- Target track length: 30–60s (Remotion will loop or trim)

### Runner-up: **Pixabay Music** (pixabay.com/music)
- Fully royalty-free, no attribution required, no account needed
- Search: "upbeat travel background"
- Good for hackathon demos where licensing is not a concern

### If Headout has an Artlist/Epidemic Sound license:
- Use those — better quality, fully cleared for commercial use
- Filter: "Pop" + "Exciting" or "Uplifting" + BPM 110–130

### Implementation shape:
```
bgMusicSrc: "http://localhost:{port}/media/{adId}/bg_track.mp3"  // served by media server
bgMusicVolume: 0.08   // barely audible, never fights the VO
```
Drop the file in `static/music/` and the media server will serve it alongside clips.

---

## 2. Animations

### Priority 1 — Hook text stinger (scroll-stop moment)
Replace the bare `interpolate(frame, [0, 8], [0, 1])` fade with a spring-powered scale + slide-up on the HOOK scene overlay:

- Frame 0–15: slide up from `translateY(+20px)` → `translateY(0)`, scale `0.9` → `1.0`, opacity `0` → `1`
- Use Remotion's `spring()` with `{ mass: 0.4, stiffness: 200, damping: 18 }` for a crisp punch-in
- Brief color flash: text starts in Headout coral `#ff5a5f`, transitions to white over frames 0–6
- Apply only to scenes with `beat === 'hook'`

### Priority 2 — End card sequential reveal
Currently all end card elements appear at frame 0 statically. Stagger each element in `EndCard.tsx`:

| Frame | Element |
|---|---|
| 0 | Dark gradient background fade-in |
| 8 | Headout wordmark slides up + fades in |
| 18 | Price number **counts up** from 0 to final value (spring easing) |
| 30 | Rating stars + review count fade in left-to-right |
| 42 | CTA button scales in `0.8` → `1.0` with bounce, coral `#ff5a5f` background |
| 54 | "Free cancellation" + checkmark tick-in |

### Priority 3 — Clip-to-clip flash transition
Insert a white flash (2–3 frames, opacity `0.15–0.25`) at every scene cut. Gives a real-camera/phone-recording feel. Implemented as an `AbsoluteFill` with `backgroundColor: 'white'` and a short interpolate spike at `clip.startFrame`.

### Priority 4 — Subtle Ken Burns on b_roll / pov clips
For non-creator scenes, apply `scale(1.0 → 1.06)` over the clip duration:
```tsx
const scale = interpolate(frame, [0, durationFrames], [1, 1.06], { extrapolateRight: 'clamp' });
<div style={{ transform: `scale(${scale})`, width: '100%', height: '100%' }}>
  <OffthreadVideo ... />
</div>
```
Creates motion without needing new video. Apply to `shot_type !== 'ugc_creator'`.

### Priority 5 — Body/payoff text wipe
For BODY and PAYOFF scenes, differentiate from the hook:
- **Body**: soft fade-in + left-to-right `clipPath` mask wipe over 12 frames
- **Payoff**: bold centered text with a thin coral `#ff5a5f` underline that animates from left (`width: 0%`) to right (`width: 100%`) over 12 frames

---

## 3. Headout Brand Styling

### Confirmed color palette
| Token | Hex | Usage |
|---|---|---|
| Brand coral / CTA | `#ff5a5f` | CTA button, text accents, underline animations |
| Rating amber | `#fbbf24` | Star ratings |
| Dark navy start | `#1a1a2e` | End card gradient start |
| Dark navy end | `#16213e` | End card gradient end |
| Secondary text | `#94a3b8` | Sub-labels, review counts |
| White | `#ffffff` | Primary overlay text |

**Do not add purple** — "Headout_purps" is the logo mark only; their UI/CTA color is the coral.

### Typography
- **Font**: `Inter` (already in use) — weight **800–900** (ExtraBold/Black) for overlays
- **Letter-spacing**: `-0.5px` on large headlines for the premium compressed look
- **Text shadow**: `0 2px 8px rgba(0,0,0,0.8)` — already present, keep it

### Video aesthetic
- Warm, upbeat, experience-forward — "a friend who just got back from the trip"
- Clean cuts, bold text, no gimmicky transitions
- UGC creator scenes lead; b_roll provides context
- Price + rating always visible in end card — never one without the other

---

## 4. System Prompt Updates for Claude (script-engine)

Add this block to the Claude system prompt in `backend/src/script-engine.ts`:

```
HEADOUT BRAND VOICE:
- Primary CTA color is coral/red #ff5a5f — reference this when describing text overlay style
- VO must sound like a friend who just came back from the trip, never a PR/corporate voice
- Always reference both price AND rating in the payoff scene — never one without the other
- CTA is always "Book on Headout" — never "Buy now", "Get tickets", or "Reserve your spot"
- End card cta_text must be exactly: "Book on Headout"
- Text overlays should be punchy fragments, not full sentences — max 8 words per overlay
- The hook scene overlay should be provocative/scroll-stopping — use the hook angle directly
```

---

## 5. Implementation Priority Order

| # | Item | Est. effort | Impact |
|---|---|---|---|
| 1 | End card sequential animation | 1.5h | Very high — last thing judges see |
| 2 | Hook text stinger (spring + color flash) | 1h | High — scroll-stop moment |
| 3 | Background music wiring | 30min | Medium — sets mood of whole ad |
| 4 | Clip-to-clip flash transition | 45min | High — cuts feel intentional |
| 5 | Ken Burns on b_roll | 1h | Medium — adds motion without new video |
| 6 | Body/payoff text wipe | 45min | Medium — polish layer |
| 7 | System prompt brand updates | 30min | Medium — affects all future generations |

Items 1–4 (~4h total) meaningfully elevate the output. Items 5–7 are polish.
