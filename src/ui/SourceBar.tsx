import { useStore } from '../state/store'
import type { OscWave } from '../audio/sources/types'
import { Knob } from './Knob'

const WAVES: { value: OscWave; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'triangle', label: 'Tri' },
]

// Source controls (M1: oscillator). Noise / loops / file upload arrive in M4.
export function SourceBar() {
  const source = useStore((s) => s.source)
  const setSource = useStore((s) => s.setSource)

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-panel bg-cream px-4 py-3 text-chassis ring-2 ring-outline">
      <span className="font-mono text-xs font-semibold uppercase tracking-widest">Source</span>

      <div className="flex overflow-hidden rounded-control ring-2 ring-outline">
        {WAVES.map((w) => (
          <button
            key={w.value}
            onClick={() => setSource({ wave: w.value })}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              source.wave === w.value ? 'bg-teal text-cream' : 'bg-cream text-chassis hover:bg-chassis/10'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <Knob
        label="Pitch"
        value={source.freq}
        min={40}
        max={4000}
        scale="log"
        unit="Hz"
        color="var(--teal)"
        onChange={(v) => setSource({ freq: v })}
      />
      <Knob
        label="Level"
        value={source.level}
        min={0}
        max={1}
        step={0.01}
        color="var(--red)"
        onChange={(v) => setSource({ level: v })}
      />

      <div className="flex overflow-hidden rounded-control ring-2 ring-outline">
        {(['drone', 'pluck'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setSource({ mode: m })}
            className={`px-3 py-1 text-sm font-medium capitalize transition-colors ${
              source.mode === m ? 'bg-teal text-cream' : 'bg-cream text-chassis hover:bg-chassis/10'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </section>
  )
}
