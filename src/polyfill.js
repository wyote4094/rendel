/**
 * Polyfill the Web Audio API globals required by Strudel/superdough
 * using node-web-audio-api. Must be imported before any Strudel modules.
 */
import * as nwaa from 'node-web-audio-api';

const WEB_AUDIO_GLOBALS = [
  'AudioContext',
  'BaseAudioContext',
  'OfflineAudioContext',
  'AudioBuffer',
  'AudioNode',
  'AudioParam',
  'AudioWorkletNode',
  'AudioScheduledSourceNode',
  'GainNode',
  'OscillatorNode',
  'BiquadFilterNode',
  'ConvolverNode',
  'DelayNode',
  'DynamicsCompressorNode',
  'PannerNode',
  'StereoPannerNode',
  'ChannelMergerNode',
  'ChannelSplitterNode',
  'AnalyserNode',
  'WaveShaperNode',
  'AudioBufferSourceNode',
  'ConstantSourceNode',
  'PeriodicWave',
  'MediaStreamAudioDestinationNode',
  'AudioWorklet',
  'AudioListener',
];

for (const name of WEB_AUDIO_GLOBALS) {
  if (nwaa[name] !== undefined) {
    globalThis[name] = nwaa[name];
  }
}

// superdough/strudel reference browser globals (window, document) without typeof
// guards. The most egregious is reverbGen.mjs doing `window.filterNode = filter`
// as leftover debug code, and dspworklet.mjs calling `window.addEventListener`.
// Once `window` is defined, strudel/core also evaluates `document.addEventListener`.
// Provide recursive no-op Proxies for both so nothing throws in Node.js.
if (typeof window === 'undefined') {
  const makeBrowserStub = () => {
    const stub = new Proxy(
      function noop() { return stub; },
      {
        get(target, key) {
          if (key === Symbol.toPrimitive) return () => 0;
          if (key === 'then') return undefined; // not a Promise
          if (key in target) return target[key];
          return stub;
        },
        set() { return true; },
        apply() { return stub; },
        construct() { return stub; },
      },
    );
    return stub;
  };

  globalThis.window = makeBrowserStub();
  globalThis.document = makeBrowserStub();
}

// superdough's reverb generation (reverbGen.mjs / filterTail) creates a nested
// OfflineAudioContext and passes AudioBuffers across context boundaries in two places:
//   1. AudioBufferSourceNode.buffer = <outer-context buffer>  (in the inner context)
//   2. ConvolverNode.buffer = <inner-context rendered buffer>  (in the outer context)
// node-web-audio-api (unlike browsers) enforces strict context ownership and throws
// "Attempting to connect nodes from different contexts" for cross-context buffer assignment.
// Fix: intercept .buffer setters on both node types and, on cross-context error, copy
// the channel data into a new AudioBuffer owned by the receiving node's context.
function patchCrossContextBuffer(NodeClass) {
  const desc = Object.getOwnPropertyDescriptor(NodeClass.prototype, 'buffer');
  Object.defineProperty(NodeClass.prototype, 'buffer', {
    ...desc,
    set(value) {
      try {
        desc.set.call(this, value);
      } catch (err) {
        if (!err.message?.includes('Attempting to connect nodes from different contexts')) {
          throw err;
        }
        const ctx = this.context;
        const copy = ctx.createBuffer(value.numberOfChannels, value.length, value.sampleRate);
        for (let ch = 0; ch < value.numberOfChannels; ch++) {
          copy.copyToChannel(value.getChannelData(ch), ch);
        }
        desc.set.call(this, copy);
      }
    },
  });
}

patchCrossContextBuffer(nwaa.AudioBufferSourceNode);
patchCrossContextBuffer(nwaa.ConvolverNode);
