import type { EffectDef, EffectInstance, ParamValue } from './types'
import { dbToGain } from '../util'

// Compressor — DynamicsCompressorNode + a post makeup gain (the native node has
// none) (PRD §4.4). Verify against fx_compressor on a drum loop: peaks squashed,
// body raised, a fuller and more even waveform.
export const compressor: EffectDef = {
  id: 'compressor',
  name: 'Compressor',
  ableton: 'Compressor',
  colorToken: 'stage-compressor',
  params: [
    { id: 'threshold', label: 'Threshold', type: 'float', min: -60, max: 0, step: 0.5, default: -24, unit: 'dB' },
    { id: 'ratio', label: 'Ratio', type: 'float', min: 1, max: 20, step: 0.1, default: 6 },
    { id: 'attack', label: 'Attack', type: 'float', min: 0, max: 1, step: 0.001, default: 0.003, unit: 's' },
    { id: 'release', label: 'Release', type: 'float', min: 0, max: 1, step: 0.005, default: 0.12, unit: 's' },
    { id: 'knee', label: 'Knee', type: 'float', min: 0, max: 40, step: 0.5, default: 30, unit: 'dB' },
    { id: 'makeup', label: 'Makeup', type: 'float', min: 0, max: 24, step: 0.1, default: 12, unit: 'dB' },
  ],
  build(ctx): EffectInstance {
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -24
    comp.ratio.value = 6
    comp.attack.value = 0.003
    comp.release.value = 0.12
    comp.knee.value = 30

    const makeup = ctx.createGain()
    makeup.gain.value = dbToGain(12)
    comp.connect(makeup)

    return {
      input: comp,
      output: makeup,
      setParam(id: string, value: ParamValue) {
        const v = value as number
        switch (id) {
          case 'threshold':
            comp.threshold.value = v
            break
          case 'ratio':
            comp.ratio.value = v
            break
          case 'attack':
            comp.attack.value = v
            break
          case 'release':
            comp.release.value = v
            break
          case 'knee':
            comp.knee.value = v
            break
          case 'makeup':
            makeup.gain.value = dbToGain(v)
            break
        }
      },
      dispose() {
        comp.disconnect()
        makeup.disconnect()
      },
    }
  },
}
