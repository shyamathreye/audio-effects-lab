import type { EffectDef, EffectInstance, ParamValue } from './types'
import { makeShaperCurve } from '../dsp/waveshaper'
import type { ShaperCurve } from '../dsp/waveshaper'
import { dbToGain } from '../util'

// Distortion — WaveShaper (oversample 4x) with drive baked into the curve, a
// post output level, and a dry/wet mix (PRD §4.4). Verify against fx_distortion:
// a pure sine sprouts a harmonic series and the wave flattens toward a square.
//
//   input ─┬─ dry ─────────────────────────┐
//          └─ shaper ─ level ─ wet ─────────┴─ output
export const distortion: EffectDef = {
  id: 'distortion',
  name: 'Distortion',
  ableton: 'Saturator/Overdrive',
  colorToken: 'stage-distortion',
  params: [
    { id: 'drive', label: 'Drive', type: 'float', min: 1, max: 50, step: 0.1, default: 8 },
    {
      id: 'curve',
      label: 'Curve',
      type: 'enum',
      default: 'tanh',
      options: [
        { value: 'tanh', label: 'Tanh' },
        { value: 'hard', label: 'Hard' },
        { value: 'fold', label: 'Fold' },
      ],
    },
    { id: 'output', label: 'Output', type: 'float', min: -24, max: 12, step: 0.1, default: 0, unit: 'dB' },
    { id: 'wet', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  build(ctx): EffectInstance {
    const input = ctx.createGain()
    const shaper = ctx.createWaveShaper()
    shaper.oversample = '4x'
    const level = ctx.createGain()
    const wet = ctx.createGain()
    const dry = ctx.createGain()
    const output = ctx.createGain()

    let drive = 8
    let curveType: ShaperCurve = 'tanh'
    const refreshCurve = () => {
      shaper.curve = makeShaperCurve(curveType, drive)
    }
    refreshCurve()

    level.gain.value = dbToGain(0)
    wet.gain.value = 1
    dry.gain.value = 0

    input.connect(dry)
    dry.connect(output)
    input.connect(shaper)
    shaper.connect(level)
    level.connect(wet)
    wet.connect(output)

    const setMix = (w: number) => {
      wet.gain.value = w
      dry.gain.value = 1 - w
    }

    return {
      input,
      output,
      setParam(id: string, value: ParamValue) {
        switch (id) {
          case 'drive':
            drive = value as number
            refreshCurve()
            break
          case 'curve':
            curveType = value as ShaperCurve
            refreshCurve()
            break
          case 'output':
            level.gain.value = dbToGain(value as number)
            break
          case 'wet':
            setMix(value as number)
            break
        }
      },
      dispose() {
        input.disconnect()
        shaper.disconnect()
        level.disconnect()
        wet.disconnect()
        dry.disconnect()
        output.disconnect()
      },
    }
  },
}
