// Bitcrusher AudioWorklet processor (PRD §1.3 lead stretch). Two degradations:
//   • bit-depth reduction — quantize each sample to `bits` levels (stair-steps)
//   • sample-rate reduction — sample-and-hold every 1/normFreq samples (aliasing)
// Runs on the audio render thread; state is kept per channel.
class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bits', defaultValue: 6, minValue: 1, maxValue: 16, automationRate: 'k-rate' },
      // phase increment per sample: 1 = full rate (no reduction), small = crushed
      { name: 'normFreq', defaultValue: 0.125, minValue: 0.02, maxValue: 1, automationRate: 'k-rate' },
    ]
  }

  constructor() {
    super()
    this.phase = []
    this.hold = []
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || input.length === 0) return true

    const bits = parameters.bits[0]
    const normFreq = parameters.normFreq[0]
    const levels = Math.pow(2, bits)
    const span = Math.max(1, levels - 1)

    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[ch] || input[input.length - 1]
      const outCh = output[ch]
      let phase = this.phase[ch] || 0
      let hold = this.hold[ch] || 0
      for (let i = 0; i < outCh.length; i++) {
        phase += normFreq
        if (phase >= 1) {
          phase -= 1
          // quantize [-1,1] → `bits`-bit grid
          const q = Math.round((inCh[i] * 0.5 + 0.5) * span) / span
          hold = q * 2 - 1
        }
        outCh[i] = hold
      }
      this.phase[ch] = phase
      this.hold[ch] = hold
    }
    return true
  }
}

registerProcessor('bitcrusher', BitcrusherProcessor)
