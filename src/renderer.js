import './polyfill.js';
import { fileURLToPath } from 'url';
import {
  superdough,
  setAudioContext,
  initAudio,
  setSuperdoughAudioController,
  registerSynthSounds,
  errorLogger,
} from 'superdough';
// superdough's main export comes from dist/index.mjs (a bundle that has its own copy
// of audioContext.mjs). superdoughoutput.mjs and helpers.mjs import from the UNBUNDLED
// audioContext.mjs directly — a separate module instance with its own `audioContext`
// variable. We must set the context on both so helpers.mjs doesn't fall back to
// creating a default AudioContext (sampleRate 48000) which then causes cross-context
// errors when connecting nodes.
import { setAudioContext as setAudioContextUnbundled } from 'superdough/audioContext.mjs';
import { SuperdoughAudioController } from 'superdough/superdoughoutput.mjs';
import { evalScope } from '@strudel/core/evaluate.mjs';
import { transpiler, evaluate } from '@strudel/transpiler';
import * as strudelCore from '@strudel/core';
import * as strudelMini from '@strudel/mini';
import * as strudelWebaudio from '@strudel/webaudio';
import * as strudelTonal from '@strudel/tonal';
import { registerSoundfonts } from '@strudel/soundfonts';

/** Set up Strudel's global scope (note, s, slow, fast, etc.) and register built-in synths. */
export async function setupScope() {
  // Expose setcps as a scope function — wraps core's setCpsFunc
  const { setCpsFunc } = strudelCore;
  const extras = {
    setcps: (cps) => setCpsFunc(() => cps),
  };

  await evalScope(
    Promise.resolve(strudelCore),
    Promise.resolve(strudelMini),
    Promise.resolve(strudelWebaudio),
    Promise.resolve(strudelTonal),
    Promise.resolve(extras),
  );
  registerSynthSounds();
  registerSoundfonts();
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

/** Return the CPS set by the pattern via setcps(), or null if not set. */
export function getPatternCps() {
  return strudelCore.getCps?.() ?? null;
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
  setAudioContextUnbundled(ctx); // keep unbundled helpers.mjs in sync (see import comment)
  setSuperdoughAudioController(new SuperdoughAudioController(ctx));

  // superdough/worklets.mjs can't be loaded directly (bundler-only imports) and
  // the bundled data: URL worklet can't be resolved by node-web-audio-api.
  // We extracted the pre-bundled worklet code to src/superdough-worklets.js so it
  // can be loaded as a file. This includes all processors: shape, djf, crush, etc.
  const workletsPath = fileURLToPath(new URL('./superdough-worklets.js', import.meta.url));
  await ctx.audioWorklet.addModule(workletsPath);

  // disableWorklets: prevents superdough from trying to re-load the data: URL
  // worklet (which would fail). We already loaded the processors above.
  // maxPolyphony: in offline rendering, activeSoundSources never decrements
  // during scheduling (onEnded fires during rendering, not setup), so voice
  // stealing would prematurely kill early haps.
  // Suppress superdough's noisy "AudioWorklets disabled" log during initAudio
  const _log = console.log;
  console.log = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('AudioWorklets disabled')) return;
    _log(...args);
  };
  await initAudio({ maxPolyphony: 100000, disableWorklets: true });
  console.log = _log;

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
  setAudioContextUnbundled(null);
  setSuperdoughAudioController(null);

  return buffer;
}
