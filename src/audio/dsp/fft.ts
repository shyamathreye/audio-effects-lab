// Minimal radix-2 FFT + spectral helpers for Freeze mode, where AnalyserNode is
// unavailable (we analyze offline-rendered buffers directly).

/** In-place iterative radix-2 FFT. re/im length must be a power of two. */
export function fftRadix2(re: Float32Array, im: Float32Array): void {
  const n = re.length
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = i + k + len / 2
        const tRe = re[b] * curRe - im[b] * curIm
        const tIm = re[b] * curIm + im[b] * curRe
        re[b] = re[a] - tRe
        im[b] = im[a] - tIm
        re[a] += tRe
        im[a] += tIm
        const nxtRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nxtRe
      }
    }
  }
}

function hann(n: number, N: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)))
}

/** Averaged magnitude spectrum (dB) of a buffer — stable, like Freeze wants. */
export function magnitudeDb(buffer: Float32Array, fftSize = 4096): Float32Array {
  const bins = fftSize / 2
  const out = new Float32Array(bins)
  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  const hop = fftSize / 2
  let windows = 0
  let winGain = 0
  for (let n = 0; n < fftSize; n++) winGain += hann(n, fftSize)

  for (let start = 0; start + fftSize <= buffer.length; start += hop) {
    for (let n = 0; n < fftSize; n++) {
      re[n] = buffer[start + n] * hann(n, fftSize)
      im[n] = 0
    }
    fftRadix2(re, im)
    for (let k = 0; k < bins; k++) {
      out[k] += (re[k] * re[k] + im[k] * im[k]) / (winGain * winGain)
    }
    windows++
  }
  if (windows === 0) return out.fill(-140)
  for (let k = 0; k < bins; k++) {
    const power = (out[k] / windows) * 4 // ×2 amplitude (one-sided), squared
    out[k] = 10 * Math.log10(power + 1e-12)
  }
  return out
}

export interface Stft {
  /** Column-major magnitudes normalized to 0..1; cols[t][bin]. */
  cols: Float32Array[]
  bins: number
}

/** Short-time spectrogram of a buffer, normalized to its own peak. */
export function stft(buffer: Float32Array, fftSize = 1024, hop = 256): Stft {
  const bins = fftSize / 2
  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  const cols: Float32Array[] = []
  let peak = 1e-9
  for (let start = 0; start + fftSize <= buffer.length; start += hop) {
    for (let n = 0; n < fftSize; n++) {
      re[n] = buffer[start + n] * hann(n, fftSize)
      im[n] = 0
    }
    fftRadix2(re, im)
    const col = new Float32Array(bins)
    for (let k = 0; k < bins; k++) {
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k])
      col[k] = m
      if (m > peak) peak = m
    }
    cols.push(col)
  }
  // log-compress + normalize for visual contrast
  for (const col of cols) {
    for (let k = 0; k < bins; k++) {
      col[k] = Math.max(0, Math.min(1, (Math.log10(col[k] / peak + 1e-6) + 3) / 3))
    }
  }
  return { cols, bins }
}
