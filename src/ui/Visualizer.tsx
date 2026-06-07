import { useStore } from '../state/store'
import type { ViewKind } from '../state/store'
import { Waveform } from '../viz/Waveform'

const VIEWS: { id: ViewKind; label: string; ready: boolean }[] = [
  { id: 'waveform', label: 'Waveform', ready: true },
  { id: 'spectrum', label: 'Spectrum', ready: false },
  { id: 'spectrogram', label: 'Spectrogram', ready: false },
]

// The big LCD screen (§2A). M1 shows the master-output waveform; Spectrum,
// Spectrogram, Freeze, and the compare overlay arrive in M3.
export function Visualizer() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const engine = useStore((s) => s.engine)

  return (
    <section className="flex flex-col gap-2 rounded-panel bg-chassis p-3 ring-2 ring-outline">
      <div className="flex items-center gap-2">
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
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-lcd/70">
          out · live
        </span>
      </div>

      <div className="h-64 overflow-hidden rounded-control ring-2 ring-outline">
        <Waveform getAnalyser={() => engine.getAnalyser('master')} colorVar="--lcd" className="h-full w-full" />
      </div>
    </section>
  )
}
