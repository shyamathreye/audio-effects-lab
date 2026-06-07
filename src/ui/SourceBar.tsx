import { useRef } from 'react'
import { useStore } from '../state/store'
import type { OscWave, SourceKind, LoopName } from '../audio/sources/types'
import { Knob } from './Knob'

const WAVES: { value: OscWave; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'triangle', label: 'Tri' },
]
const KINDS: { value: SourceKind; label: string }[] = [
  { value: 'oscillator', label: 'Osc' },
  { value: 'noise', label: 'Noise' },
  { value: 'loop', label: 'Loop' },
  { value: 'file', label: 'File' },
]
const LOOPS: { value: LoopName; label: string }[] = [
  { value: 'drum', label: 'Drums' },
  { value: 'pad', label: 'Pad' },
  { value: 'melodic', label: 'Melody' },
]

// Pill toggle group on the cream panel.
function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-control ring-2 ring-outline">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-sm font-medium transition-colors ${
            value === o.value ? 'bg-teal text-cream' : 'bg-cream text-chassis hover:bg-chassis/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SourceBar() {
  const source = useStore((s) => s.source)
  const setSource = useStore((s) => s.setSource)
  const setSourceKind = useStore((s) => s.setSourceKind)
  const loadFile = useStore((s) => s.loadFile)
  const fileError = useStore((s) => s.fileError)
  const fileName = useStore((s) => s.fileName)
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-panel bg-cream px-4 py-3 text-chassis ring-2 ring-outline">
      <span className="font-mono text-xs font-semibold uppercase tracking-widest">Source</span>

      <Pills options={KINDS} value={source.kind} onChange={setSourceKind} />

      {/* divider */}
      <span className="h-8 w-px bg-chassis/20" />

      {source.kind === 'oscillator' && (
        <>
          <Pills options={WAVES} value={source.wave} onChange={(v) => setSource({ wave: v })} />
          <Knob label="Pitch" value={source.freq} min={40} max={4000} scale="log" unit="Hz" color="var(--teal)" onChange={(v) => setSource({ freq: v })} />
          <Pills options={[{ value: 'drone', label: 'Drone' }, { value: 'pluck', label: 'Pluck' }] as const} value={source.mode} onChange={(v) => setSource({ mode: v })} />
        </>
      )}

      {source.kind === 'noise' && (
        <Pills options={[{ value: 'white', label: 'White' }, { value: 'pink', label: 'Pink' }] as const} value={source.color} onChange={(v) => setSource({ color: v })} />
      )}

      {source.kind === 'loop' && (
        <Pills options={LOOPS} value={source.name} onChange={(v) => setSource({ name: v })} />
      )}

      {source.kind === 'file' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-control bg-teal px-3 py-1 text-sm font-medium text-cream ring-1 ring-outline hover:brightness-110"
          >
            Choose file…
          </button>
          <span className="max-w-[12rem] truncate font-mono text-xs text-chassis/70">{fileName ?? 'no file'}</span>
        </div>
      )}

      {/* file picker is always mounted so the File pill can trigger it */}
      <input
        ref={fileInput}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadFile(f)
          e.target.value = ''
        }}
      />

      <Knob label="Level" value={source.level} min={0} max={1} step={0.01} color="var(--red)" onChange={(v) => setSource({ level: v })} />

      {fileError && <span className="font-mono text-xs text-red">{fileError}</span>}
    </section>
  )
}
