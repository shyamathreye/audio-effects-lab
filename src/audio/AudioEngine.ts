import type { EffectDef, EffectInstance, ParamValue } from './effects/types'
import { createTap, rewireWithCrossfade } from './graph'
import type { ChainEndpoints, RuntimeEffect, Tap } from './graph'
import { createSource } from './sources'
import type { SourceConfig, SourceInstance } from './sources/types'
import { ensureBitcrusherModule } from './worklets'
import { makeSafetyCurve } from './dsp/waveshaper'
import { dbToGain, DEFAULT_MASTER_DB } from './util'

export type StageId = string // 'dry' | effect instance id

// AudioEngine owns the live audio graph (PRD §4.3): one AudioContext, a master
// bus with clip detection, a persistent dry tap, and an ordered list of runtime
// effects each with their own output tap. The Zustand store holds declarative
// state and drives this engine imperatively.
export class AudioEngine {
  readonly ctx: AudioContext

  private master: GainNode
  private limiter: DynamicsCompressorNode
  private safety: WaveShaperNode
  private masterAnalyser: AnalyserNode
  private outputGain: GainNode
  private dryTap: Tap

  private source: SourceInstance | null = null
  private sourceConfig: SourceConfig | null = null
  private fileBuffer: AudioBuffer | null = null
  private effects: RuntimeEffect[] = []

  private _playing = false
  private clipBuf: Float32Array<ArrayBuffer>

  constructor() {
    this.ctx = new AudioContext()

    this.master = this.ctx.createGain()
    this.master.gain.value = dbToGain(DEFAULT_MASTER_DB)

    // Brick-wall limiter + soft safety clip on the master bus so output can't
    // clip or spike — protects speakers/ears regardless of chain or master gain.
    this.limiter = this.ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -2
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.08
    this.safety = this.ctx.createWaveShaper()
    this.safety.curve = makeSafetyCurve()
    this.safety.oversample = 'none' // hard guarantee: output never exceeds the curve cap

    this.masterAnalyser = this.ctx.createAnalyser()
    this.masterAnalyser.fftSize = 2048
    this.clipBuf = new Float32Array(this.masterAnalyser.fftSize)

    this.outputGain = this.ctx.createGain()
    this.outputGain.gain.value = 1

    this.dryTap = createTap(this.ctx)

    // outputGain → master(user) → limiter → safety → analyser → destination
    this.outputGain.connect(this.master)
    this.master.connect(this.limiter)
    this.limiter.connect(this.safety)
    this.safety.connect(this.masterAnalyser)
    this.masterAnalyser.connect(this.ctx.destination)

    // preload the bitcrusher worklet so it's ready by the time it's added
    ensureBitcrusherModule(this.ctx).catch(() => {})

    this.rewire()
  }

  private endpoints(): ChainEndpoints {
    return {
      sourceOut: this.source?.output ?? null,
      dryTap: this.dryTap,
      effects: this.effects,
      outputGain: this.outputGain,
    }
  }

  private rewire(): void {
    rewireWithCrossfade(this.ctx, this.endpoints())
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  get playing(): boolean {
    return this._playing
  }

  getFileBuffer(): AudioBuffer | null {
    return this.fileBuffer
  }

  // ---- transport -----------------------------------------------------------

  setSourceConfig(cfg: SourceConfig): void {
    this.sourceConfig = cfg
    if (this._playing) {
      // Rebuild the source live so changes are audible immediately.
      this.rebuildSource()
    }
  }

  /** Decode an uploaded file and switch the source to it. */
  async loadFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<void> {
    const decoded = await this.ctx.decodeAudioData(arrayBuffer)
    this.fileBuffer = decoded
    this.sourceConfig = { kind: 'file', level: 0.9, fileName }
    if (this._playing) this.rebuildSource()
  }

  private rebuildSource(): void {
    this.source?.stop()
    this.source?.dispose()
    this.source = null
    if (this.sourceConfig) {
      this.source = createSource(this.ctx, this.sourceConfig, this.fileBuffer)
      this.rewire()
      this.source?.start(this.ctx.currentTime + 0.02)
    }
  }

  async play(): Promise<void> {
    await this.resume()
    if (this._playing) return
    this._playing = true
    this.rebuildSource()
  }

  stop(): void {
    if (!this._playing) return
    this._playing = false
    this.source?.stop()
    const src = this.source
    this.source = null
    // Let the release tail finish, then drop it from the graph.
    window.setTimeout(() => {
      src?.dispose()
      this.rewire()
    }, 400)
  }

  setMasterGainDb(db: number): void {
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(dbToGain(db), t, 0.01)
  }

  /** Peak sample magnitude on the master bus; > 1 indicates clipping. */
  readMasterPeak(): number {
    this.masterAnalyser.getFloatTimeDomainData(this.clipBuf)
    let peak = 0
    for (let i = 0; i < this.clipBuf.length; i++) {
      const a = Math.abs(this.clipBuf[i])
      if (a > peak) peak = a
    }
    return peak
  }

  // ---- chain ---------------------------------------------------------------

  async addEffect(instanceId: string, def: EffectDef, bypassed = false): Promise<void> {
    if (def.needsWorklet) await ensureBitcrusherModule(this.ctx)
    const instance = def.build(this.ctx)
    const tap = createTap(this.ctx)
    this.effects.push({ id: instanceId, instance, tap, bypassed })
    this.rewire()
  }

  removeEffect(instanceId: string): void {
    const idx = this.effects.findIndex((e) => e.id === instanceId)
    if (idx === -1) return
    const [fx] = this.effects.splice(idx, 1)
    this.rewire()
    // Dispose after the rewire's mute window so we never tear down a live node.
    window.setTimeout(() => {
      fx.instance.dispose()
      fx.tap.node.disconnect()
      fx.tap.analyser.disconnect()
    }, 40)
  }

  reorderEffects(orderedIds: string[]): void {
    const byId = new Map(this.effects.map((e) => [e.id, e]))
    const next: RuntimeEffect[] = []
    for (const id of orderedIds) {
      const fx = byId.get(id)
      if (fx) next.push(fx)
    }
    if (next.length !== this.effects.length) return
    this.effects = next
    this.rewire()
  }

  setBypass(instanceId: string, bypassed: boolean): void {
    const fx = this.effects.find((e) => e.id === instanceId)
    if (!fx || fx.bypassed === bypassed) return
    fx.bypassed = bypassed
    this.rewire()
  }

  setEffectParam(instanceId: string, paramId: string, value: ParamValue): void {
    const fx = this.effects.find((e) => e.id === instanceId)
    fx?.instance.setParam(paramId, value)
  }

  /** The live EffectInstance, for response/transfer-curve mini-views. */
  getEffectInstance(instanceId: string): EffectInstance | null {
    return this.effects.find((e) => e.id === instanceId)?.instance ?? null
  }

  // ---- analysers (for visualization) --------------------------------------

  getAnalyser(stage: StageId): AnalyserNode | null {
    if (stage === 'dry') return this.dryTap.analyser
    if (stage === 'master') return this.masterAnalyser
    return this.effects.find((e) => e.id === stage)?.tap.analyser ?? null
  }

  /** Long-buffer time-domain analyser for the oscilloscope (zoomable). */
  getWaveAnalyser(stage: StageId): AnalyserNode | null {
    if (stage === 'dry') return this.dryTap.waveAnalyser
    if (stage === 'master') return this.masterAnalyser
    return this.effects.find((e) => e.id === stage)?.tap.waveAnalyser ?? null
  }
}
