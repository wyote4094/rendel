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

// --- WeakRef tracking ---
// superdough's node pool (`st`), voice tracking (`Ne`), and other internals
// retain WeakRefs to nodes from previous contexts. Between chunks, those stale
// refs would cause "nodes from different contexts" errors when reused. We
// intercept WeakRef construction and, between chunks, neuter each tracked ref
// so deref() returns undefined and superdough treats its pool as empty.
const trackedRefs = new Set();
const NativeWeakRef = globalThis.WeakRef;
class TrackingWeakRef extends NativeWeakRef {
  constructor(target) {
    super(target);
    trackedRefs.add(this);
  }
}
globalThis.WeakRef = TrackingWeakRef;

function invalidateAllRefs() {
  for (const ref of trackedRefs) {
    ref.deref = () => undefined;
  }
  trackedRefs.clear();
}

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

async function renderChunk({
  pattern, beginCyc, endCyc, cps, chunkDur, tailDur, sampleRate, workletsPath,
}) {
  const frameCount = Math.ceil((chunkDur + tailDur) * sampleRate);
  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);
  setAudioContext(ctx);
  setAudioContextUnbundled(ctx);
  setSuperdoughAudioController(new SuperdoughAudioController(ctx));
  await ctx.audioWorklet.addModule(workletsPath);

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

  // Query only the haps that onset within this chunk window.
  const haps = pattern
    .queryArc(beginCyc, endCyc, { _cps: cps })
    .filter((h) => h.hasOnset())
    .sort((a, b) => a.whole.begin.valueOf() - b.whole.begin.valueOf());

  for (const hap of haps) {
    try {
      await superdough(
        hap2value(hap),
        (hap.whole.begin.valueOf() - beginCyc) / cps,
        hap.duration / cps,
        cps,
        (hap.whole?.begin.valueOf() - beginCyc) / cps,
      );
    } catch (err) {
      errorLogger(err, 'rendel');
    }
  }

  return ctx.startRendering();
}

/**
 * Render a Pattern by chunking the timeline into short windows, each with its
 * own OfflineAudioContext running the real effect worklets. Chunk outputs
 * (including a per-chunk tail) are summed into a single stereo buffer.
 *
 * Tradeoff: reverb/delay tails that extend past `tailDur` beyond a chunk
 * boundary get truncated. For most patterns this is inaudible.
 */
export async function renderToBuffer(pattern, { duration = 60, cps = 1, sampleRate = 44100, verbose = false } = {}) {
  const workletsPath = fileURLToPath(new URL('./superdough-worklets.js', import.meta.url));

  const chunkDur = 3;
  const tailDur = 2;
  const totalFrames = Math.ceil(duration * sampleRate);
  const outL = new Float32Array(totalFrames);
  const outR = new Float32Array(totalFrames);

  const numChunks = Math.ceil(duration / chunkDur);

  for (let i = 0; i < numChunks; i++) {
    const tSec = i * chunkDur;
    const thisChunkDur = Math.min(chunkDur, duration - tSec);
    const beginCyc = tSec * cps;
    const endCyc = (tSec + thisChunkDur) * cps;

    const t0 = Date.now();
    const buf = await renderChunk({
      pattern,
      beginCyc,
      endCyc,
      cps,
      chunkDur: thisChunkDur,
      tailDur,
      sampleRate,
      workletsPath,
    });

    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const offset = Math.round(tSec * sampleRate);
    const n = Math.min(L.length, totalFrames - offset);
    for (let j = 0; j < n; j++) {
      outL[offset + j] += L[j];
      outR[offset + j] += R[j];
    }

    setAudioContext(null);
    setAudioContextUnbundled(null);
    setSuperdoughAudioController(null);
    invalidateAllRefs();

    if (verbose) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      console.log(
        `rendel: chunk ${i + 1}/${numChunks} ` +
        `(${tSec.toFixed(1)}–${(tSec + thisChunkDur).toFixed(1)}s) ` +
        `in ${elapsed}s`,
      );
    }
  }

  // Return an AudioBuffer-compatible plain object — export.js only uses
  // numberOfChannels, sampleRate, and getChannelData().
  return {
    numberOfChannels: 2,
    sampleRate,
    length: totalFrames,
    duration,
    getChannelData(ch) { return ch === 0 ? outL : outR; },
  };
}
