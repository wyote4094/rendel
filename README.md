# Rendel

Headless [Strudel](https://strudel.cc) pattern renderer. Export your `.js` pattern files to WAV or MP3 from the command line — no browser, no CPU spikes, deterministic output.

## Usage

```bash
rendel --file mysong.js --duration 240 --output song.mp3
```

## Requirements

- Node.js 20+
- ffmpeg (for MP3/FLAC export)

## Installation

```bash
npm install -g rendel
```

## Options

| Flag | Description | Default |
|---|---|---|
| `--file` | Path to your Strudel `.js` pattern file | required |
| `--duration` | Duration to render in seconds | `60` |
| `--output` | Output file path (`.wav`, `.mp3`, `.flac`) | `output.wav` |
| `--samplerate` | Sample rate in Hz | `44100` |

## License

MIT
