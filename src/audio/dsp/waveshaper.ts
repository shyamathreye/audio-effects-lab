import { clamp } from '../util'

export type ShaperCurve = 'tanh' | 'hard' | 'fold'

// WaveShaper transfer curves (PRD §4.4). Drive is baked into the curve so the
// input domain [-1, 1] maps directly onto the shaped output (a pre-gain would
// instead push the signal past 1 and hit the curve's clamped endpoints):
//   tanh → y = tanh(drive·x)   (soft saturation, odd-harmonic series)
//   hard → y = clamp(drive·x)  (hard clip, brighter / harsher)
//   fold → y = sin(drive·x)    (wavefolding, dense harmonics)
// Output-safety curve for the master bus: transparent below ~0.7, then a soft
// knee hard-capped at ±0.88 — with no oversampling on the shaper, output can
// never exceed that, no matter how hot the chain or master gets (≈ −1.1 dBFS).
export function makeSafetyCurve(n = 4096): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const a = Math.abs(x)
    const s = a <= 0.7 ? a : 0.7 + 0.2 * Math.tanh((a - 0.7) / 0.25)
    curve[i] = Math.sign(x) * Math.min(s, 0.88)
  }
  return curve
}

// Full-wave rectifier (y = |x|) — used to drive an envelope follower.
export function makeAbsCurve(n = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) curve[i] = Math.abs((i / (n - 1)) * 2 - 1)
  return curve
}

export function makeShaperCurve(
  type: ShaperCurve,
  drive: number,
  n = 8192,
): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const d = drive * x
    let y: number
    switch (type) {
      case 'hard':
        y = clamp(d, -1, 1)
        break
      case 'fold':
        y = Math.sin(d)
        break
      case 'tanh':
      default:
        y = Math.tanh(d)
        break
    }
    curve[i] = y
  }
  return curve
}
