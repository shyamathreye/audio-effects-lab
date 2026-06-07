import { useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from '../state/store'
import { EFFECTS } from '../audio/effects'
import { EffectModule } from './EffectModule'
import { Waveform } from '../viz/Waveform'
import { Cables } from './Cables'

export function Chain() {
  const chain = useStore((s) => s.chain)
  const reorder = useStore((s) => s.reorder)
  const addEffect = useStore((s) => s.addEffect)
  const engine = useStore((s) => s.engine)
  const playing = useStore((s) => s.playing)
  const railRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const signature = chain.map((c) => `${c.instanceId}:${c.bypassed ? 1 : 0}`).join(',')

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = chain.map((c) => c.instanceId)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    const next = [...ids]
    next.splice(to, 0, next.splice(from, 1)[0])
    reorder(next)
  }

  return (
    <section className="flex flex-col gap-3">
      {/* add palette */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wide text-cream/60">Add effect</span>
        {EFFECTS.map((def) => (
          <button
            key={def.id}
            onClick={() => addEffect(def.id)}
            className="rounded-control px-3 py-1 text-sm font-medium text-cream ring-2 ring-outline transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: `var(--${def.colorToken})` }}
          >
            + {def.name}
          </button>
        ))}
      </div>

      {/* chain rail (scroll container → relative content with cables behind) */}
      <div className="overflow-x-auto rounded-panel bg-outline/40 ring-1 ring-outline">
        <div ref={railRef} className="relative flex w-max items-stretch gap-3 p-3">
          <Cables railRef={railRef} signature={signature} />

          {/* dry / source tap */}
          <div data-node data-bypassed="false" className="relative z-10 flex w-40 shrink-0 flex-col rounded-panel bg-chassis ring-2 ring-grid">
            <div className="rounded-t-panel bg-grid px-3 py-2 text-sm font-semibold text-cream">Source</div>
            <div className="mx-3 mt-3 h-14 overflow-hidden rounded-control ring-1 ring-outline">
              <Waveform getAnalyser={() => engine.getAnalyser('dry')} colorVar="--stage-dry-on-black" active={playing} className="h-full w-full" />
            </div>
            <div className="p-3 text-center font-mono text-[10px] text-cream/50">dry signal</div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={chain.map((c) => c.instanceId)} strategy={horizontalListSortingStrategy}>
              {chain.map((effect, i) => (
                <EffectModule key={effect.instanceId} effect={effect} index={i} />
              ))}
            </SortableContext>
          </DndContext>

          {chain.length === 0 && (
            <div className="relative z-10 flex items-center justify-center px-8 py-10 text-center font-mono text-sm text-cream/40">
              Empty chain — the dry signal passes straight through. Add an effect above, or pick a “Try a sound” recipe to load a ready-made chain.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
