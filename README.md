# Rendel

Headless [Strudel](https://strudel.cc) pattern renderer. Export your `.js` pattern files to WAV, MP3, FLAC, or OGG from the command line — no browser, no CPU spikes, deterministic output.

## Requirements

- Node.js 20+
- ffmpeg in your `PATH` (required for MP3, FLAC, and OGG export — WAV works without it)

## Installation

**From npm** (once published):
```bash
npm install -g rendel
```

**From source** (development):
```bash
git clone https://github.com/wyote4094/rendel.git
cd rendel
npm install
npm link        # makes the `rendel` command available globally
```

Or skip `npm link` and run directly with:
```bash
node src/cli.js -f mysong.js -o output.wav
```

## Quick start

Write a Strudel pattern in a `.js` file:

```js
// mysong.js
setcps(1.2)
note("c3 e3 g3 b3").s("sine").slow(2)
```

Then render it:

```bash
rendel --file mysong.js --output mysong.wav
```

Rendel reads `setcps()` from your pattern automatically, so you don't need to pass `--cps` unless you want to override it.

## Options

| Flag | Short | Description | Default |
|---|---|---|---|
| `--file <path>` | `-f` | Path to your Strudel `.js` pattern file | required |
| `--output <path>` | `-o` | Output file (`.wav`, `.mp3`, `.flac`, `.ogg`) | required |
| `--duration <seconds>` | `-d` | How many seconds to render | `60` |
| `--cps <value>` | | Cycles per second (overrides `setcps()` in the file) | from pattern or `1` |
| `--samplerate <hz>` | `-r` | Sample rate: `22050`, `44100`, `48000`, `88200`, `96000` | `44100` |
| `--progress` | `-p` | Log per-chunk timing during render | off |

## Examples

```bash
# Render 30 seconds to WAV
rendel -f examples/groove.js -o groove.wav -d 30

# Render a full 4-minute arrangement to MP3 (requires ffmpeg)
rendel -f examples/coastline.js -o coastline.mp3 -d 240

# Override the tempo set in the file
rendel -f examples/acid.js -o acid.wav --cps 1.6

# Render at 48 kHz for video use
rendel -f mysong.js -o mysong.wav -r 48000
```

## Writing patterns

Your pattern file should contain a valid Strudel expression. The last expression in the file becomes the rendered pattern.

```js
// Minimal — single synth line
note("c3 e3 g3").s("sawtooth").slow(2)
```

```js
// Layered — use stack() for multiple voices
setcps(0.9)
stack(
  s("bd ~ bd ~, ~ sd ~ sd"),
  note("c2 ~ eb2 f2").s("sawtooth").lpf(600)
)
```

All standard Strudel functions are available: `note`, `s`, `stack`, `slow`, `fast`, `chord`, `voicing`, `sine`, `rand`, `perlin`, and all effect methods (`.room()`, `.delay()`, `.lpf()`, etc.). GM soundfonts load automatically — use the registered names from `gm.mjs` such as `s("gm_piano")`, `s("gm_string_ensemble_1")`, or `s("gm_acoustic_bass")`. For chords with `.dict('ireal')`, use iReal Pro notation: `^7` for major 7, `-` for minor (e.g. `Ab^7`, `C-`).

**Note on samples:** The default Strudel browser sample pack (`bd`, `sd`, `hh`, etc.) is not available in rendel — those are loaded from a CDN in the browser only. Use built-in synth sounds (`sine`, `sawtooth`, `square`, `triangle`) or load an external sample bank with `samples()`:

```js
// Load drum samples from a GitHub repo (requires network access)
samples('github:tidalcycles/Dirt-Samples')
s("bd*4, ~ sd ~ sd, hh*8")
```

### Example files

All benchmarks: 30 seconds rendered at 48000 Hz.

| File | Description | cps | Render time |
|---|---|---|---|
| `bells.js` | Pentatonic bell melody with reverb and delay | 0.6 | 1.8s |
| `pulse.js` | Sawtooth bass with slow LPF sweep | 0.5 | 3.1s |
| `ambient.js` | Slowly evolving pads with shimmer delay | 0.35 | 4.0s |
| `cinematic.js` | Orchestral mood piece using GM soundfonts (strings, piano, bass) | 0.45 | 6.5s |
| `groove.js` | Kick/snare/hat groove with synth bass — all synth, no samples | 0.9 | 13.5s |
| `polyrhythm.js` | Three synth voices in 3:4:5 polyrhythm over a steady bass | 0.8 | 25.3s |
| `acid.js` | Classic acid house: 303-style bassline + four-on-the-floor | 1.4 | 49.8s |
| `techno.js` | Dark techno: layered synth drums, sub bass, mid bass, sparse lead | 1.75 | 127.5s |

Render time scales roughly with hap density (notes per second) and the number of concurrently active nodes. Patterns with many simultaneous voices at high cps will be slowest.

## License

MIT
