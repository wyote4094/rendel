# Rendel — Project Plan

**Rendel** is a CLI tool that renders [Strudel](https://strudel.cc) pattern files to WAV/MP3 offline — no browser, no CPU spikes, deterministic output.

---

## Goal

```bash
rendel --file mysong.js --duration 240 --output song.mp3
```

Take a `.js` file containing Strudel pattern code, run it headlessly via Node.js, and export a high-quality audio file.

---

## Architecture

```
┌─────────────────────┐
│   mysong.js         │  ← user's Strudel pattern file
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  rendel CLI         │
│  - parses args      │
│  - loads pattern    │
│  - OfflineAudioCtx  │
│  - @strudel/core    │
│  - @strudel/webaudio│
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  ffmpeg             │  ← WAV → MP3 conversion
│  WAV → MP3/FLAC/etc │
└─────────────────────┘
```

---

## Milestones

### Phase 1 — Project Setup ✓
- [x] Initialize GitHub repo (`rendel`)
- [x] `npm init` + basic project structure
- [x] Add `.gitignore`, `README.md`, `LICENSE`
- [x] Pin Node.js version via `.nvmrc` / `engines` field

### Phase 2 — Core Renderer ✓
- [x] Research Strudel's npm packages (`@strudel/core`, `@strudel/webaudio`)
- [x] Implement offline audio context rendering in Node.js
- [x] Write a minimal working render pipeline (sine tone as smoke test)
- [x] Evaluate `node-web-audio-api` as the OfflineAudioContext polyfill

### Phase 3 — CLI Interface ✓
- [x] Wire up CLI argument parsing (`commander` or `minimist`)
- [x] `--file`, `--duration`, `--output`, `--samplerate` flags
- [x] Validate inputs and surface helpful errors

### Phase 4 — Audio Export ✓
- [x] Write raw PCM buffer to WAV (via `wav` or `audiobuffer-to-wav`)
- [x] Pipe to `ffmpeg` for MP3/FLAC/OGG conversion
- [x] Detect and warn if `ffmpeg` is not installed

### Phase 5 — Polish
- [ ] Progress bar / logging
- [ ] Watch mode (`--watch`) for live re-renders on file save
- [ ] Publish to npm as `rendel`
- [ ] GitHub Actions CI (lint + test on push)

---

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Strudel engine | `@strudel/core`, `@strudel/webaudio` |
| OfflineAudio polyfill | `node-web-audio-api` |
| CLI parsing | `commander` |
| WAV output | `audiobuffer-to-wav` |
| Audio conversion | `ffmpeg` (system install) |
| Testing | `vitest` |

---

## Open Questions

- Can `@strudel/webaudio` run fully headlessly in Node.js, or does it require browser globals?
- Is there an existing Strudel headless rendering example to build on?
- Should synthesis happen via Strudel's built-in WebAudio synths, or via a separate soundfont/sampler path?

---

## Repo Structure (target)

```
rendel/
├── src/
│   ├── cli.js          ← entry point
│   ├── renderer.js     ← core rendering logic
│   └── export.js       ← WAV/MP3 file writing
├── examples/
│   └── demo.js         ← sample Strudel pattern
├── test/
│   └── renderer.test.js
├── package.json
├── README.md
└── .gitignore
```
