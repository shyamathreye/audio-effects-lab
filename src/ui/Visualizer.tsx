import { useStore } from '../state/store'
import type { ViewKind, VizLayout } from '../state/store'
import { Waveform } from '../viz/Waveform'
import { OverlayWaveform } from '../viz/OverlayWaveform'
import { stageRefs } from '../viz/stages'

const VIEWS: { id: ViewKind; label: string; ready: boolean }[] = [
  { id: 'waveform', label: 'Waveform', ready: true },
  { id: 'spectrum', label: 'Spectrum', ready: false },
  { id: 'spectrogram', label: 'Spectrogram', ready: false },
]

const LAYOUTS: { id: VizLayout; label: string }[] = [
  { id: 'combined', label: 'Combined' },
  { id: 'individual', label: 'Individual' },
]

// The big LCD screen (§2A). Combined overlays every stage on one screen;
// Individual shows one scope per stage, arranged like the chain so a learner can
// watch each effect's output change as it is toggled on/off.
export function Visualizer() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const layout = useStore((s) => s.vizLayout)
  const setVizLayout = useStore((s) => s.setVizLayout)
  const engine = useStore((s) => s.engine)
  const chain = useStore((s) => s.chain)

  const stages = stageRefs(chain)
  const getAnalyser = (id: string) => engine.getAnalyser(id)

  return (
    <section className="flex flex-col gap-2 rounded-panel bg-chassis p-3 ring-2 ring-outline">
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            disabled={!v.ready}
            onClick={() => setView(v.id)}
            title={v.ready ? undefined : 'Coming in a later milestone'}
            className={`rounded-control px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
              view === v.id ? 'bg-teal text-cream' : 'bg-outline/60 text-cream/60'
            } ${!v.ready ? 'cursor-not-allowed opacity-40' : 'hover:text-cream'}`}
          >
            {v.label}
          </button>
        ))}

        {/* layout toggle */}
        <div className="ml-2 flex overflow-hidden rounded-control ring-1 ring-outline">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setVizLayout(l.id)}
              className={`px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
                layout === l.id ? 'bg-coral text-cream' : 'bg-outline/60 text-cream/60 hover:text-cream'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-lcd/70">
          {stages.length} {stages.length === 1 ? 'stage' : 'stages'} · live
        </span>
      </div>

      {layout === 'combined' ? (
        <>
          <div className="h-64 overflow-hidden rounded-control ring-2 ring-outline">
            <OverlayWaveform stages={stages} getAnalyser={getAnalyser} className="h-full w-full" />
          </div>
          {/* legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1">
            {stages.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 font-mono text-[11px]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: `var(${s.colorVar})`, opacity: s.bypassed ? 0.3 : 1 }}
                />
                <span className={s.bypassed ? 'text-cream/40 line-through' : 'text-cream/80'}>{s.label}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        // Individual: a row of per-stage scopes mirroring the chain layout.
        <div className="flex items-stretch gap-3 overflow-x-auto rounded-control bg-outline/30 p-2 ring-1 ring-outline">
          {stages.map((s) => (
            <div
              key={s.id}
              className={`flex w-56 shrink-0 flex-col rounded-control ring-1 ring-outline ${
                s.bypassed ? 'opacity-50' : ''
              }`}
            >
              <div
                className="flex items-center justify-between rounded-t-control px-2 py-1"
                style={{ backgroundColor: `var(${s.colorVar})` }}
              >
                <span className="truncate text-xs font-semibold text-cream">{s.label}</span>
                {s.bypassed && <span className="font-mono text-[9px] text-cream/80">off</span>}
              </div>
              <div className="h-44 overflow-hidden rounded-b-control">
                <Waveform getAnalyser={() => getAnalyser(s.id)} colorVar={s.colorVar} className="h-full w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
