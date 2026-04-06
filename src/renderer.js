import './polyfill.js';
import {
  superdough,
  setAudioContext,
  initAudio,
  setSuperdoughAudioController,
  registerSynthSounds,
  errorLogger,
} from 'superdough';
import { SuperdoughAudioController } from 'superdough/superdoughoutput.mjs';
import { evalScope } from '@strudel/core/evaluate.mjs';
import { transpiler, evaluate } from '@strudel/transpiler';
import * as strudelCore from '@strudel/core';
import * as strudelMini from '@strudel/mini';

/** Set up Strudel's global scope (note, s, slow, fast, etc.) and register built-in synths. */
export async function setupScope() {
  await evalScope(
    Promise.resolve(strudelCore),
    Promise.resolve(strudelMini),
  );
  registerSynthSounds();
}

/**
 * Evaluate a string of Strudel pattern code and return a Pattern.
 * The code should be a single expression, e.g.:
 *   note("c3 e3 g3").s("sine").slow(2)
 */
export async function evaluatePattern(code) {
  const { pattern } = await evaluate(code, transpiler);
  if (!pattern || typeof pattern.queryArc !== 'function') {
    throw new Error('Code did not return a Strudel Pattern. Make sure your file exports a pattern expression.');
  }
  return pattern;
}

/**
 * Render a Pattern to an AudioBuffer using an OfflineAudioContext.
 *
 * @param {import('@strudel/core').Pattern} pattern
 * @param {object} options
 * @param {number} options.duration  - render duration in seconds
 * @param {number} options.cps       - cycles per second (tempo)
 * @param {number} options.sampleRate
 * @returns {Promise<AudioBuffer>}
 */
export async function renderToBuffer(pattern, { duration = 60, cps = 1, sampleRate = 44100 } = {}) {
  const begin = 0;
  const end = duration * cps; // in cycles
  const frameCount = Math.ceil(duration * sampleRate);

  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);
  setAudioContext(ctx);
  setSuperdoughAudioController(new SuperdoughAudioController(ctx));

  // initAudio returns early in Node.js (no window), which is what we want —
  // worklets are skipped, basic synthesis still works via standard AudioNodes.
  await initAudio({ maxPolyphony: 32 });

  const hap2value = (hap) => {
    hap.ensureObjectValue();
    return hap.value;
  };

  // Sort by onset time — required for controls like `cut` that depend on graph state
  const haps = pattern
    .queryArc(begin, end, { _cps: cps })
    .sort((a, b) => a.whole.begin.valueOf() - b.whole.begin.valueOf());

  for (const hap of haps) {
    if (hap.hasOnset()) {
      try {
        await superdough(
          hap2value(hap),
          (hap.whole.begin.valueOf() - begin) / cps,
          hap.duration / cps,
          cps,
          (hap.whole?.begin.valueOf() - begin) / cps,
        );
      } catch (err) {
        errorLogger(err, 'rendel');
      }
    }
  }

  const buffer = await ctx.startRendering();

  // Clean up
  setAudioContext(null);
  setSuperdoughAudioController(null);

  return buffer;
}
