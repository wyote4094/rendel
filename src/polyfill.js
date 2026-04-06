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
