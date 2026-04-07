// Self-contained lfo-processor AudioWorklet for offline rendering in Node.js.
// Extracted from superdough/worklets.mjs — no external imports so addModule() works headlessly.

const INVSR = 1 / sampleRate;

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
const ffloor = (x) => x | 0;
const ffrac = (x) => x - ffloor(x);

function polyBlep(phase, dt) {
  dt = Math.min(dt, 1 - dt);
  const invdt = 1 / dt;
  if (phase < dt) {
    phase *= invdt;
    return 2 * phase - phase ** 2 - 1;
  } else if (phase > 1 - dt) {
    phase = (phase - 1) * invdt;
    return phase ** 2 + 2 * phase + 1;
  }
  return 0;
}

const TWO_PI = 2 * Math.PI;

const waveshapes = {
  tri(phase, skew = 0.5) {
    const x = 1 - skew;
    if (phase >= skew) return 1 / x - phase / x;
    return phase / skew;
  },
  sine(phase) {
    return Math.sin(TWO_PI * phase) * 0.5 + 0.5;
  },
  ramp(phase) {
    return phase;
  },
  saw(phase) {
    return 1 - phase;
  },
  square(phase, skew = 0.5) {
    return phase >= skew ? 0 : 1;
  },
  sawblep(phase, dt) {
    const v = 2 * phase - 1;
    return v - polyBlep(phase, dt);
  },
};

const waveShapeNames = Object.keys(waveshapes);

class LFOProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'begin',       defaultValue: 0 },
      { name: 'time',        defaultValue: 0 },
      { name: 'end',         defaultValue: 0 },
      { name: 'frequency',   defaultValue: 0.5 },
      { name: 'skew',        defaultValue: 0.5 },
      { name: 'depth',       defaultValue: 1 },
      { name: 'phaseoffset', defaultValue: 0 },
      { name: 'shape',       defaultValue: 0 },
      { name: 'curve',       defaultValue: 1 },
      { name: 'dcoffset',    defaultValue: 0 },
      { name: 'min',         defaultValue: -1e9 },
      { name: 'max',         defaultValue: 1e9 },
    ];
  }

  constructor() {
    super();
    this.phase = null;
  }

  incrementPhase(dt) {
    this.phase += dt;
    if (this.phase > 1.0) this.phase -= 1;
  }

  process(_inputs, outputs, parameters) {
    const begin = parameters['begin'][0];
    const end   = parameters['end'][0];
    if (currentTime >= end)   return false;
    if (currentTime <= begin) return true;

    const output      = outputs[0];
    const frequency   = parameters['frequency'][0];
    const time        = parameters['time'][0];
    const depth       = parameters['depth'][0];
    const skew        = parameters['skew'][0];
    const phaseoffset = parameters['phaseoffset'][0];
    const curve       = parameters['curve'][0];
    const dcoffset    = parameters['dcoffset'][0];
    const min         = parameters['min'][0];
    const max         = parameters['max'][0];
    const shape       = waveShapeNames[parameters['shape'][0]];

    const blockSize = output[0]?.length ?? 0;

    if (this.phase == null) {
      this.phase = ffrac(time * frequency + phaseoffset);
    }
    const dt = frequency * INVSR;

    for (let n = 0; n < blockSize; n++) {
      let modval = (waveshapes[shape](this.phase, skew) + dcoffset) * depth;
      modval = Math.pow(modval, curve);
      const val = clamp(modval, min, max);
      for (let i = 0; i < output.length; i++) {
        output[i][n] = val;
      }
      this.incrementPhase(dt);
    }

    return true;
  }
}

registerProcessor('lfo-processor', LFOProcessor);
