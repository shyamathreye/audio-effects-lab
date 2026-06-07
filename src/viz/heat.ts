// Spectrogram intensity ramp: dark well → LCD green → bright. v in 0..1.
const LO = [12, 18, 13]
const MID = [55, 118, 90]
const HI = [200, 240, 200]

export function heatRGB(v: number): [number, number, number] {
  if (v <= 0.001) return [LO[0], LO[1], LO[2]]
  const c = Math.max(0, Math.min(1, v))
  const [a, b, t] = c < 0.5 ? [LO, MID, c / 0.5] : [MID, HI, (c - 0.5) / 0.5]
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
  ]
}

export function heatColor(v: number): string {
  const [r, g, b] = heatRGB(v)
  return `rgb(${r},${g},${b})`
}
