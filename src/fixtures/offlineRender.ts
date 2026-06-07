import type { EffectDef, ParamValue } from '../audio/effects/types'

// Offline-render harness for fixture tests (PRD §4.7). Builds a known source,
// optionally routes it through an effect, and renders to a buffer we can analyze
// — the same OfflineAudioContext path used by Freeze in M3.

export type SourceKind = 'sine' | 'saw' | 'noise' | 'burst' | 'envBurst'

export interface RenderOpts {
  source: SourceKind
  freq?: number
  dur: number
  sr?: number
}

export interface RenderResult {
  data: Float32Array
  sr: number
}

function fillNoise(buf: AudioBuffer) {
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
}

function makeSource(ctx: OfflineAudioContext, opts: RenderOpts): AudioNode {
  const sr = ctx.sampleRate
  const freq = opts.freq ?? 220

  if (opts.source === 'sine' || opts.source === 'saw') {
    const osc = ctx.createOscillator()
    osc.type = opts.source === 'sine' ? 'sine' : 'sawtooth'
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = 0.5
    osc.connect(g)
    osc.start(0)
    osc.stop(opts.dur)
    return g
  }

  if (opts.source === 'noise') {
    const buf = ctx.createBuffer(1, Math.ceil(opts.dur * sr), sr)
    fillNoise(buf)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.start(0)
    return src
  }

  if (opts.source === 'burst') {
    // 20 ms noise burst then silence — for echo / tail detection.
    const buf = ctx.createBuffer(1, Math.ceil(opts.dur * sr), sr)
    const d = buf.getChannelData(0)
    const n = Math.floor(0.02 * sr)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.start(0)
    return src
  }

  // envBurst: a sine that is loud (1.0) for 60 ms then quiet (0.2) — a crude
  // transient+body for compressor crest-factor testing.
  const buf = ctx.createBuffer(1, Math.ceil(opts.dur * sr), sr)
  const d = buf.getChannelData(0)
  const loud = Math.floor(0.06 * sr)
  for (let i = 0; i < d.length; i++) {
    const a = i < loud ? 1.0 : 0.2
    d[i] = a * Math.sin((2 * Math.PI * freq * i) / sr)
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.start(0)
  return src
}

async function render(
  opts: RenderOpts,
  insert: ((ctx: OfflineAudioContext, src: AudioNode) => AudioNode) | null,
): Promise<RenderResult> {
  const sr = opts.sr ?? 44100
  const ctx = new OfflineAudioContext(1, Math.ceil(opts.dur * sr), sr)
  const src = makeSource(ctx, opts)
  const tail = insert ? insert(ctx, src) : src
  tail.connect(ctx.destination)
  const rendered = await ctx.startRendering()
  return { data: rendered.getChannelData(0).slice(), sr }
}

/** Render the raw source with no effect (dry reference). */
export function renderDry(opts: RenderOpts): Promise<RenderResult> {
  return render(opts, null)
}

/** Render the source through one effect at the given params. */
export function renderThrough(
  def: EffectDef,
  params: Record<string, ParamValue>,
  opts: RenderOpts,
): Promise<RenderResult> {
  return render(opts, (ctx, src) => {
    const fx = def.build(ctx)
    for (const [k, v] of Object.entries(params)) fx.setParam(k, v)
    src.connect(fx.input)
    return fx.output
  })
}
