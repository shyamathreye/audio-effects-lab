import { clamp } from '../util'

export type ShaperCurve = 'tanh' | 'hard' | 'fold'

// WaveShaper transfer curves (PRD §4.4). Drive is baked into the curve so the
// input domain [-1, 1] maps directly onto the shaped output (a pre-gain would
// instead push the signal past 1 and hit the curve's clamped endpoints):
//   tanh → y = tanh(drive·x)   (soft saturation, odd-harmonic series)
//   hard → y = clamp(drive·x)  (hard clip, brighter / harsher)
//   fold → y = sin(drive·x)    (wavefolding, dense harmonics)
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
