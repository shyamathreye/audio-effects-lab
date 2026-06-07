// Effect contracts (PRD §4.3). Effects are pure audio-graph factories so the
// same builder works in a live AudioContext and an OfflineAudioContext (freeze).

export type ParamValue = number | string | boolean

export type ParamScale = 'linear' | 'log'

export interface ParamSpec {
  id: string
  label: string
  /** float = continuous knob; enum = mode selector; bool = toggle. */
  type: 'float' | 'enum' | 'bool'
  min?: number
  max?: number
  step?: number
  default: ParamValue
  unit?: string
  scale?: ParamScale
  /** For enum params: selectable options. */
  options?: { value: string; label: string }[]
  /** Optional: hide this param unless another enum param has one of these values. */
  showWhen?: { param: string; in: string[] }
}

export interface EffectInstance {
  /** Node that upstream signal connects into. */
  input: AudioNode
  /** Node that feeds downstream. */
  output: AudioNode
  setParam(id: string, value: ParamValue): void
  /** Tear down internal nodes / stop oscillators. */
  dispose(): void
  /** Optional: linear magnitude response at the given frequencies (Hz), for a
      frequency-response mini-view (filters / EQ). Reflects current params. */
  getFrequencyResponse?(freqHz: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer>
  /** Optional: input→output transfer curve sampled over x ∈ [−1, 1], for a
      transfer-curve mini-view (waveshaper distortion, compressor knee). */
  getTransferCurve?(points: number): Float32Array<ArrayBuffer>
}

export interface EffectDef {
  id: string
  name: string
  /** "≈ in Ableton" pointer. */
  ableton: string
  /** Stage color token name (§2A.2), e.g. 'stage-filter'. */
  colorToken: StageColorToken
  params: ParamSpec[]
  /** True if build() requires an AudioWorklet module to be registered first. */
  needsWorklet?: boolean
  build(ctx: BaseAudioContext): EffectInstance
}

export type StageColorToken =
  | 'stage-utility'
  | 'stage-filter'
  | 'stage-eq'
  | 'stage-compressor'
  | 'stage-distortion'
  | 'stage-delay'
  | 'stage-reverb'
  | 'stage-modulation'
  | 'stage-bitcrusher'

/** Resolve a ParamSpec's default into its initial value map. */
export function defaultParams(def: EffectDef): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {}
  for (const p of def.params) out[p.id] = p.default
  return out
}

/** Clamp a numeric value to a ParamSpec's range (PRD §4.8). */
export function clampParam(spec: ParamSpec, value: number): number {
  let v = value
  if (spec.min !== undefined) v = Math.max(spec.min, v)
  if (spec.max !== undefined) v = Math.min(spec.max, v)
  return v
}
