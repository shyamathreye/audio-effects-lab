import type { EffectDef, EffectInstance, ParamValue } from './types'
import { clamp } from '../util'

// Ring Modulator — multiplies the signal by a sine "carrier" (input × carrier).
// Produces sum & difference sidebands (f ± carrier) that are usually inharmonic,
// giving metallic, bell-like, robotic tones. Native: an OscillatorNode drives a
// GainNode's gain at audio rate, so the gain node performs the multiplication.
//
//   carrier ─ depth ─▶ ring.gain
//   input ─┬─ dry ───────────────┐
//          └─ ring ─ wet ─────────┴─ output
export const ringmod: EffectDef = {
  id: 'ringmod',
  name: 'Ring Mod',
  ableton: 'Frequency Shifter (Ring)',
  colorToken: 'stage-ringmod',
  params: [
    { id: 'freq', label: 'Carrier', type: 'float', min: 1, max: 2000, default: 220, unit: 'Hz', scale: 'log' },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const carrier = ctx.createOscillator()
    carrier.type = 'sine'
    carrier.frequency.value = 220
    const depth = ctx.createGain()
    depth.gain.value = 1
    const ring = ctx.createGain()
    ring.gain.value = 0 // baseline 0; carrier swings it ±1 → output = input × carrier
    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()
    wet.gain.value = 1
    dry.gain.value = 0

    carrier.connect(depth)
    depth.connect(ring.gain)
    input.connect(ring)
    ring.connect(wet)
    wet.connect(output)
    input.connect(dry)
    dry.connect(output)
    carrier.start()

    return {
      input,
      output,
      setParam(id, value: ParamValue) {
        if (id === 'freq') carrier.frequency.value = clamp(value as number, 1, 2000)
        else if (id === 'wet') {
          const w = value as number
          wet.gain.value = w
          dry.gain.value = 1 - w
        }
      },
      dispose() {
        try {
          carrier.stop()
        } catch {
          /* noop */
        }
        carrier.disconnect()
        depth.disconnect()
        ring.disconnect()
        input.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
