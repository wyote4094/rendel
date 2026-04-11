#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';
import { setupScope, evaluatePattern, renderToBuffer, getPatternCps } from './renderer.js';
import { writeAudio, inferFormat } from './export.js';

const program = new Command();

program
  .name('rendel')
  .description('Render a Strudel pattern file to WAV offline')
  .requiredOption('-f, --file <path>', 'path to .js Strudel pattern file')
  .requiredOption('-o, --output <path>', 'output file path (e.g. out.wav)')
  .option('-d, --duration <seconds>', 'render duration in seconds', parseFloat, 60)
  .option('-r, --samplerate <hz>', 'sample rate in Hz', (v) => parseInt(v, 10), 44100)
  .option('--cps <value>', 'cycles per second (tempo)', parseFloat, 1)
  .option('-p, --progress', 'log per-chunk timing', false);

program.parse();

const opts = program.opts();

// --- Input validation ---

const filePath = resolve(opts.file);
if (!existsSync(filePath)) {
  console.error(`Error: file not found: ${filePath}`);
  process.exit(1);
}
if (extname(filePath).toLowerCase() !== '.js') {
  console.error(`Error: --file must be a .js file, got: ${extname(filePath)}`);
  process.exit(1);
}

const outputPath = resolve(opts.output);
if (!inferFormat(outputPath)) {
  console.error(`Error: --output must be .wav, .mp3, .flac, or .ogg — got: ${extname(outputPath)}`);
  process.exit(1);
}

const { duration, samplerate: sampleRate } = opts;
const cpsExplicit = process.argv.some(a => a === '--cps');
let cps = opts.cps;

if (isNaN(duration) || duration <= 0) {
  console.error(`Error: --duration must be a positive number, got: ${opts.duration}`);
  process.exit(1);
}
if (isNaN(sampleRate) || ![22050, 44100, 48000, 88200, 96000].includes(sampleRate)) {
  console.error(`Error: --samplerate must be one of 22050, 44100, 48000, 88200, 96000, got: ${opts.samplerate}`);
  process.exit(1);
}
if (isNaN(cps) || cps <= 0) {
  console.error(`Error: --cps must be a positive number, got: ${opts.cps}`);
  process.exit(1);
}

// --- Render ---

console.log(`rendel: reading ${filePath}`);
const code = await readFile(filePath, 'utf8');

const t0 = Date.now();

try {
  console.log('rendel: setting up Strudel scope...');
  await setupScope();

  console.log('rendel: evaluating pattern...');
  const pattern = await evaluatePattern(code);

  // If the pattern set cps via setcps() and the user didn't pass --cps, use it
  if (!cpsExplicit) {
    const patternCps = getPatternCps();
    if (patternCps != null && patternCps > 0) {
      cps = patternCps;
    }
  }

  console.log(`rendel: rendering ${duration}s at ${sampleRate}Hz (cps=${cps})...`);
  const buffer = await renderToBuffer(pattern, { duration, cps, sampleRate, verbose: opts.progress });

  console.log(`rendel: writing ${outputPath}`);
  await writeAudio(buffer, outputPath);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`rendel: done in ${elapsed}s.`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
