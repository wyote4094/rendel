import { writeFile } from 'fs/promises';
import { extname } from 'path';

/**
 * Encode an AudioBuffer as a 16-bit PCM WAV ArrayBuffer.
 * Ported from @strudel/webaudio/webaudio.mjs
 */
export function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  const result = numChannels === 2
    ? interleave(buffer.getChannelData(0), buffer.getChannelData(1))
    : buffer.getChannelData(0);

  return encodeWav(result, sampleRate, numChannels);
}

function encodeWav(samples, sampleRate, numChannels) {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const buf = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buf);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buf;
}

function interleave(L, R) {
  const result = new Float32Array(L.length + R.length);
  let i = 0, j = 0;
  while (i < L.length) {
    result[j++] = L[i];
    result[j++] = R[i];
    i++;
  }
  return result;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Write an AudioBuffer to a WAV file on disk.
 *
 * @param {AudioBuffer} buffer
 * @param {string} outputPath  - must end in .wav
 */
export async function writeWav(buffer, outputPath) {
  const wavData = audioBufferToWav(buffer);
  await writeFile(outputPath, Buffer.from(wavData));
}

/**
 * Determine output format from file extension.
 * Returns 'wav' | 'mp3' | 'flac' | 'ogg'
 */
export function inferFormat(outputPath) {
  const ext = extname(outputPath).toLowerCase().slice(1);
  const supported = ['wav', 'mp3', 'flac', 'ogg'];
  return supported.includes(ext) ? ext : 'wav';
}
