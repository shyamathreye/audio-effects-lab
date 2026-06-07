import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../state/store'
import type { ChainEffect } from '../state/store'
import { getEffectDef } from '../audio/effects'
import type { ParamSpec } from '../audio/effects/types'
import { PARAM_HELP } from '../guide/content'
import { ParamControl } from './ParamControl'
import { Waveform } from '../viz/Waveform'
import { OverlayWaveform } from '../viz/OverlayWaveform'
import { Spectrum } from '../viz/Spectrum'
import { FrozenCanvas } from '../viz/FrozenCanvas'
import { drawTransferCurve } from '../viz/responseDraw'
import { ResponseSpectrumView } from '../viz/ResponseSpectrumView'
import { CompressorView } from '../viz/CompressorView'
import { drawDelayEchoes, drawReverbDecay, drawLFO } from '../viz/effectViews'
import type { ModMode } from '../audio/effects/modulation'

function visible(spec: ParamSpec, params: ChainEffect['params']): boolean {
  if (!spec.showWhen) return true
  return spec.showWhen.in.includes(String(params[spec.showWhen.param]))
}

export function EffectModule({ effect, index }: { effect: ChainEffect; index: number }) {
  const def = getEffectDef(effect.defId)
  const setParam = useStore((s) => s.setParam)
  const toggleBypass = useStore((s) => s.toggleBypass)
  const removeEffect = useStore((s) => s.removeEffect)
  const openInfo = useStore((s) => s.openInfo)
  const engine = useStore((s) => s.engine)
  const playing = useStore((s) => s.playing)
  const chain = useStore((s) => s.chain)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: effect.instanceId,
  })

  if (!def) return null
  const hue = `var(--${def.colorToken})`
  const colorVar = `--${def.colorToken}`
  const bodyTone = index % 2 === 0 ? 'bg-coral' : 'bg-coral-alt'

  // Each effect gets the inline view that best shows what it does.
  const viewKind: 'response' | 'inout' | 'comp' | 'transfer' | 'echoes' | 'decay' | 'lfo' | 'spectrum' | 'wave' =
    def.id === 'filter' || def.id === 'eq3'
      ? 'response'
      : def.id === 'utility'
        ? 'inout'
        : def.id === 'compressor'
          ? 'comp'
          : def.id === 'distortion'
            ? 'transfer'
            : def.id === 'delay'
              ? 'echoes'
              : def.id === 'reverb'
                ? 'decay'
                : def.id === 'modulation'
                  ? 'lfo'
                  : def.id === 'ringmod' || def.id === 'autowah'
                    ? 'spectrum'
                    : 'wave'
  const sr = engine.ctx.sampleRate
  const paramsKey = JSON.stringify(effect.params)
  const caption = {
    response: 'spectrum + response',
    inout: 'in vs out',
    comp: 'compression',
    transfer: 'in → out',
    echoes: 'echoes',
    decay: 'decay tail',
    lfo: 'LFO',
    spectrum: 'output spectrum',
    wave: 'waveform',
  }[viewKind]

  // the signal arriving at this effect = output of the upstream stage
  const upstreamId = index === 0 ? 'dry' : (chain[index - 1]?.instanceId ?? 'dry')
  const p = effect.params

  let inlineView: React.ReactNode
  if (viewKind === 'response') {
    inlineView = (
      <ResponseSpectrumView
        response={(freqs) => engine.getEffectInstance(effect.instanceId)?.getFrequencyResponse?.(freqs) ?? null}
        getInputAnalyser={() => engine.getAnalyser(upstreamId)}
        sampleRate={sr}
        colorVar={colorVar}
        cutoffHz={def.id === 'filter' ? (p.cutoff as number) : undefined}
        markers={
          def.id === 'eq3'
            ? [
                { freq: 150, label: 'Low' },
                { freq: p.midFreq as number, label: 'Mid' },
                { freq: 4000, label: 'High' },
              ]
            : undefined
        }
        active={playing}
        redrawKey={paramsKey}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'inout') {
    inlineView = (
      <OverlayWaveform
        stages={[
          { id: upstreamId, colorVar: '--stage-dry-on-black', label: 'in', bypassed: false },
          { id: effect.instanceId, colorVar, label: 'out', bypassed: effect.bypassed },
        ]}
        getAnalyser={(id) => engine.getWaveAnalyser(id)}
        spanSec={0.02}
        active={playing}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'comp') {
    inlineView = (
      <CompressorView
        getInstance={() => engine.getEffectInstance(effect.instanceId)}
        getInputAnalyser={() => engine.getWaveAnalyser(upstreamId)}
        colorVar={colorVar}
        active={playing}
        redrawKey={paramsKey}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'transfer') {
    inlineView = (
      <FrozenCanvas
        redrawKey={paramsKey}
        draw={(c, w, h) => {
          const inst = engine.getEffectInstance(effect.instanceId)
          if (inst) drawTransferCurve(c, w, h, inst, colorVar)
        }}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'echoes') {
    inlineView = (
      <FrozenCanvas
        redrawKey={paramsKey}
        draw={(c, w, h) => drawDelayEchoes(c, w, h, p.time as number, p.feedback as number, p.wet as number, colorVar)}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'decay') {
    inlineView = (
      <FrozenCanvas
        redrawKey={paramsKey}
        draw={(c, w, h) => drawReverbDecay(c, w, h, p.decay as number, p.predelay as number, p.damping as number, colorVar)}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'lfo') {
    inlineView = (
      <FrozenCanvas
        redrawKey={paramsKey}
        draw={(c, w, h) => drawLFO(c, w, h, p.rate as number, p.depth as number, p.mode as ModMode, colorVar)}
        className="h-full w-full"
      />
    )
  } else if (viewKind === 'spectrum') {
    inlineView = (
      <Spectrum
        stages={[{ id: effect.instanceId, colorVar, label: def.name, bypassed: effect.bypassed }]}
        getAnalyser={(id) => engine.getAnalyser(id)}
        sampleRate={sr}
        fill
        active={playing}
        className="h-full w-full"
      />
    )
  } else {
    inlineView = <Waveform getAnalyser={() => engine.getAnalyser(effect.instanceId)} colorVar={colorVar} active={playing} className="h-full w-full" />
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-node
      data-bypassed={effect.bypassed}
      className={`relative z-10 flex w-56 shrink-0 flex-col rounded-panel ${bodyTone} shadow-lift ring-2 ring-outline ${
        effect.bypassed ? 'opacity-60' : ''
      }`}
    >
      {/* header: stage hue strip with drag handle, bypass LED, remove */}
      <div
        className="flex items-center gap-2 rounded-t-panel px-3 py-2"
        style={{ backgroundColor: hue }}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab font-mono text-xs text-cream/80 active:cursor-grabbing"
          aria-label="Drag to reorder"
          data-tip="Drag to reorder — effect order changes the sound (e.g. distortion→reverb ≠ reverb→distortion)."
        >
          ⠿
        </button>
        <span className="flex-1 truncate text-sm font-semibold text-cream">{def.name}</span>
        <button
          onClick={() => toggleBypass(effect.instanceId)}
          aria-label={effect.bypassed ? 'Enable effect' : 'Bypass effect'}
          aria-pressed={!effect.bypassed}
          data-tip={effect.bypassed ? 'Bypassed — click to enable (A/B the effect to hear what it does).' : 'Active — click to bypass and compare against the dry signal.'}
          className="h-3 w-3 rounded-full ring-1 ring-outline transition-colors"
          style={{ backgroundColor: effect.bypassed ? 'var(--grid)' : 'var(--lcd)' }}
        />
        <button
          onClick={() => openInfo(effect.defId)}
          aria-label="What does this effect do?"
          data-tip="Open the learning guide for this effect (what it does, what to watch, try this)."
          className="font-mono text-sm text-cream/80 hover:text-cream"
        >
          ⓘ
        </button>
        <button
          onClick={() => removeEffect(effect.instanceId)}
          aria-label="Remove effect"
          data-tip="Remove this effect from the chain."
          className="font-mono text-sm text-cream/70 hover:text-cream"
        >
          ✕
        </button>
      </div>

      {/* inline mini-view: response/transfer curve for tone & dynamics effects,
          live waveform otherwise */}
      <div className="mx-3 mt-3 flex flex-col gap-0.5">
        <div className="h-16 overflow-hidden rounded-control ring-1 ring-outline">{inlineView}</div>
        <span className="text-center font-mono text-[9px] uppercase tracking-wide text-cream/45">{caption}</span>
      </div>

      {/* params */}
      <div className="flex flex-wrap items-start justify-center gap-3 p-3">
        {def.params.filter((p) => visible(p, effect.params)).map((p) => (
          <ParamControl
            key={p.id}
            spec={p}
            value={effect.params[p.id]}
            color={hue}
            help={PARAM_HELP[`${def.id}.${p.id}`]}
            onChange={(v) => setParam(effect.instanceId, p.id, v)}
          />
        ))}
      </div>

      <div className="px-3 pb-2 text-center font-mono text-[10px] text-cream/50">≈ {def.ableton}</div>
    </div>
  )
}
