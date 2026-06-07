import { useRef } from 'react'
import { useStore } from '../state/store'
import type { OscWave, SourceKind, LoopName } from '../audio/sources/types'
import { clamp } from '../audio/util'
import {
  NOTE_NAMES,
  freqToMidi,
  midiToFreq,
  midiNoteIndex,
  midiOctave,
  noteToMidi,
  midiLabel,
} from '../audio/sources/note'
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
  { value: 'drum', label: 'Drums — straight beat' },
  { value: 'breakbeat', label: 'Breakbeat — busy break' },
  { value: 'bass', label: 'Bass — Am riff' },
  { value: 'chords', label: 'Chords — Am F C G' },
  { value: 'pad', label: 'Pad — sustained Am' },
  { value: 'melodic', label: 'Melody — Am line' },
  { value: 'arp', label: 'Arp — Am arpeggio' },
]

// Pick the oscillator pitch by musical note + octave instead of raw Hz.
function NotePicker({ freq, onChange }: { freq: number; onChange: (f: number) => void }) {
  const midi = freqToMidi(freq)
  const noteIdx = midiNoteIndex(midi)
  const octave = midiOctave(midi)
  const setMidi = (m: number) => onChange(clamp(midiToFreq(m), 20, 12000))
  return (
    <div className="flex items-center gap-2" data-tip="Pitch as a musical note + octave. Pick a note; use − / + to change octave.">
      <div className="flex flex-col items-center gap-1">
        <select
          value={noteIdx}
          onChange={(e) => setMidi(noteToMidi(Number(e.target.value), octave))}
          className="rounded-control bg-chassis/10 px-2 py-1 font-mono text-sm text-chassis outline-none ring-2 ring-outline"
        >
          {NOTE_NAMES.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-[10px] uppercase tracking-wide text-chassis/60">Note</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center overflow-hidden rounded-control ring-2 ring-outline">
          <button onClick={() => setMidi(midi - 12)} aria-label="Octave down" className="bg-cream px-2 py-1 text-sm text-chassis hover:bg-chassis/10">
            −
          </button>
          <span className="bg-cream px-2 py-1 font-mono text-sm text-chassis">{octave}</span>
          <button onClick={() => setMidi(midi + 12)} aria-label="Octave up" className="bg-cream px-2 py-1 text-sm text-chassis hover:bg-chassis/10">
            +
          </button>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-chassis/60">Octave</span>
      </div>
      <span className="font-mono text-xs text-teal">{midiLabel(midi)}</span>
    </div>
  )
}

// Pill toggle group on the cream panel.
function Pills<T extends string>({
  options,
  value,
  tip,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  tip?: string
  onChange: (v: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-control ring-2 ring-outline" data-tip={tip}>
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

      <Pills
        options={KINDS}
        value={source.kind}
        tip="The sound you feed the chain: Osc (a raw waveform), Noise, a built-in Loop, or your own audio File."
        onChange={setSourceKind}
      />

      {/* divider */}
      <span className="h-8 w-px bg-chassis/20" />

      {source.kind === 'oscillator' && (
        <>
          <Pills options={WAVES} value={source.wave} tip="Oscillator shape. Sine = pure tone; Saw/Square = bright & harmonic-rich; Triangle = mellow." onChange={(v) => setSource({ wave: v })} />
          <NotePicker freq={source.freq} onChange={(f) => setSource({ freq: f })} />
          <Pills
            options={[{ value: 'drone', label: 'Drone' }, { value: 'pluck', label: 'Pluck' }] as const}
            value={source.mode}
            tip="Drone holds a steady note; Pluck retriggers a note with a decay (great for hearing delay/reverb tails)."
            onChange={(v) => setSource({ mode: v })}
          />
        </>
      )}

      {source.kind === 'noise' && (
        <Pills
          options={[{ value: 'white', label: 'White' }, { value: 'pink', label: 'Pink' }] as const}
          value={source.color}
          tip="White = equal energy per frequency (bright, hissy). Pink = −3 dB/octave (warmer, more natural)."
          onChange={(v) => setSource({ color: v })}
        />
      )}

      {source.kind === 'loop' && (
        <div className="flex flex-col items-start gap-1" data-tip="Pick a built-in loop: drums, breakbeat, bass, chords, pad, melody or arpeggio (all in A minor so they layer musically).">
          <select
            value={source.name}
            onChange={(e) => setSource({ name: e.target.value as LoopName })}
            className="rounded-control bg-chassis/10 px-2 py-1 font-mono text-sm text-chassis outline-none ring-2 ring-outline"
          >
            {LOOPS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] uppercase tracking-wide text-chassis/60">Sample</span>
        </div>
      )}

      {source.kind === 'file' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            data-tip="Load your own audio file (WAV/MP3/OGG). It loops through the chain."
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
