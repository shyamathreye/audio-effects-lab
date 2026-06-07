import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../state/store'
import type { ChainEffect } from '../state/store'
import { getEffectDef } from '../audio/effects'
import type { ParamSpec } from '../audio/effects/types'
import { ParamControl } from './ParamControl'
import { Waveform } from '../viz/Waveform'

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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: effect.instanceId,
  })

  if (!def) return null
  const hue = `var(--${def.colorToken})`
  const bodyTone = index % 2 === 0 ? 'bg-coral' : 'bg-coral-alt'

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
          title="Drag to reorder"
        >
          ⠿
        </button>
        <span className="flex-1 truncate text-sm font-semibold text-cream">{def.name}</span>
        <button
          onClick={() => toggleBypass(effect.instanceId)}
          aria-label={effect.bypassed ? 'Enable effect' : 'Bypass effect'}
          aria-pressed={!effect.bypassed}
          title={effect.bypassed ? 'Bypassed — click to enable' : 'Active — click to bypass'}
          className="h-3 w-3 rounded-full ring-1 ring-outline transition-colors"
          style={{ backgroundColor: effect.bypassed ? 'var(--grid)' : 'var(--lcd)' }}
        />
        <button
          onClick={() => openInfo(effect.defId)}
          aria-label="What does this effect do?"
          title="Learn about this effect"
          className="font-mono text-sm text-cream/80 hover:text-cream"
        >
          ⓘ
        </button>
        <button
          onClick={() => removeEffect(effect.instanceId)}
          aria-label="Remove effect"
          title="Remove"
          className="font-mono text-sm text-cream/70 hover:text-cream"
        >
          ✕
        </button>
      </div>

      {/* inline mini-scope (this effect's tap, in its hue) */}
      <div className="mx-3 mt-3 h-14 overflow-hidden rounded-control ring-1 ring-outline">
        <Waveform
          getAnalyser={() => engine.getAnalyser(effect.instanceId)}
          colorVar={`--${def.colorToken}`}
          active={playing}
          className="h-full w-full"
        />
      </div>

      {/* params */}
      <div className="flex flex-wrap items-start justify-center gap-3 p-3">
        {def.params.filter((p) => visible(p, effect.params)).map((p) => (
          <ParamControl
            key={p.id}
            spec={p}
            value={effect.params[p.id]}
            color={hue}
            onChange={(v) => setParam(effect.instanceId, p.id, v)}
          />
        ))}
      </div>

      <div className="px-3 pb-2 text-center font-mono text-[10px] text-cream/50">≈ {def.ableton}</div>
    </div>
  )
}
