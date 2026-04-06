/**
 * Smoke test: render a simple sine tone pattern to a WAV file.
 * Run with: node test/smoke.js
 */
import { setupScope, evaluatePattern, renderToBuffer } from '../src/renderer.js';
import { writeWav } from '../src/export.js';
import { readFile } from 'fs/promises';

const OUT = 'test/smoke-output.wav';
const DURATION = 5; // seconds

console.log('Setting up Strudel scope...');
await setupScope();

console.log('Loading pattern...');
const code = await readFile('examples/demo.js', 'utf8');
const pattern = await evaluatePattern(code.trim());

console.log(`Rendering ${DURATION}s at 44100 Hz...`);
const buffer = await renderToBuffer(pattern, { duration: DURATION, cps: 1, sampleRate: 44100 });

console.log(`Writing to ${OUT}...`);
await writeWav(buffer, OUT);

console.log('Done! Smoke test passed.');
