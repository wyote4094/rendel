#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';
import { setupScope, evaluatePattern, renderToBuffer } from './renderer.js';
import { writeWav } from './export.js';

const program = new Command();

program
  .name('rendel')
  .description('Render a Strudel pattern file to WAV offline')
  .requiredOption('-f, --file <path>', 'path to .js Strudel pattern file')
  .requiredOption('-o, --output <path>', 'output file path (e.g. out.wav)')
  .option('-d, --duration <seconds>', 'render duration in seconds', parseFloat, 60)
  .option('-r, --samplerate <hz>', 'sample rate in Hz', parseInt, 44100)
  .option('--cps <value>', 'cycles per second (tempo)', parseFloat, 1);

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
if (extname(outputPath).toLowerCase() !== '.wav') {
  console.error(`Error: --output must end in .wav (MP3/FLAC support coming in Phase 4), got: ${extname(outputPath)}`);
  process.exit(1);
}

const { duration, samplerate: sampleRate, cps } = opts;

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

console.log('rendel: setting up Strudel scope...');
await setupScope();

console.log('rendel: evaluating pattern...');
const pattern = await evaluatePattern(code);

console.log(`rendel: rendering ${duration}s at ${sampleRate}Hz (cps=${cps})...`);
const buffer = await renderToBuffer(pattern, { duration, cps, sampleRate });

console.log(`rendel: writing ${outputPath}`);
await writeWav(buffer, outputPath);

console.log('rendel: done.');
