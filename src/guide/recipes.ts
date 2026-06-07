import { DEFAULT_OSC } from '../audio/sources/types'
import type { SourceConfig } from '../audio/sources/types'
import type { ParamValue } from '../audio/effects/types'

// Curated "popular chains" — load a source + a chain with one click and learn by
// example. `observe` says what to look for; `views` hints which visualizer view
// shows it best.
export interface RecipeStep {
  defId: string
  params?: Record<string, ParamValue>
}

export interface Recipe {
  id: string
  name: string
  icon: string
  blurb: string
  observe: string
  source: SourceConfig
  chain: RecipeStep[]
}

const osc = (over: Partial<typeof DEFAULT_OSC>): SourceConfig => ({ ...DEFAULT_OSC, ...over })

export const RECIPES: Recipe[] = [
  {
    id: 'telephone',
    name: 'Telephone',
    icon: '☎',
    blurb: 'Thin, mid-only “phone” voice.',
    observe: 'In the Response view the curve collapses to a narrow mid band — lows and highs are gone. That band-limiting is the whole effect.',
    source: { kind: 'loop', name: 'melodic', level: 0.8 },
    chain: [{ defId: 'eq3', params: { low: -18, midFreq: 1800, midQ: 1.2, mid: 8, high: -18 } }],
  },
  {
    id: 'lofi',
    name: 'Lo-fi tape',
    icon: '📼',
    blurb: 'Crunchy, dull, vintage.',
    observe: 'Bitcrusher stair-steps the waveform; the Filter dulls the highs (see Response); a short Reverb adds room. Compare Spectrum before/after.',
    source: { kind: 'loop', name: 'drum', level: 0.8 },
    chain: [
      { defId: 'bitcrusher', params: { bits: 8, downsample: 4, wet: 0.9 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 3500, q: 1 } },
      { defId: 'reverb', params: { decay: 1.0, wet: 0.2 } },
    ],
  },
  {
    id: 'dub',
    name: 'Dub delay',
    icon: '🔊',
    blurb: 'Spacious, fading echoes.',
    observe: 'Switch to Spectrogram or Waveform → Envelope: the hit repeats every delay-time, each echo darker. The Delay module shows the same as decaying taps.',
    source: { kind: 'loop', name: 'drum', level: 0.8 },
    chain: [
      { defId: 'delay', params: { time: 0.34, feedback: 0.72, wet: 0.6 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 1800, q: 1 } },
    ],
  },
  {
    id: 'cathedral',
    name: 'Cathedral',
    icon: '⛪',
    blurb: 'Huge, long reverb tail.',
    observe: 'Each plucked note blooms into a long fading tail — watch the Reverb decay view and the Spectrogram smear after every note.',
    source: osc({ wave: 'triangle', freq: 330, mode: 'pluck', level: 0.5 }),
    chain: [{ defId: 'reverb', params: { decay: 3.8, predelay: 0.03, damping: 0.2, wet: 0.7 } }],
  },
  {
    id: 'glue',
    name: 'Warmth + glue',
    icon: '🍯',
    blurb: 'Even, bright, polished.',
    observe: 'The Compressor evens the dynamics — watch the GR readout pull down on loud hits — while the EQ lifts the top end (Response view).',
    source: { kind: 'loop', name: 'melodic', level: 0.8 },
    chain: [
      { defId: 'eq3', params: { low: 3, mid: 0, high: 5, midFreq: 1000 } },
      { defId: 'compressor', params: { threshold: -28, ratio: 4, makeup: 8 } },
      { defId: 'reverb', params: { decay: 1.2, wet: 0.18 } },
    ],
  },
  {
    id: 'underwater',
    name: 'Underwater',
    icon: '🌊',
    blurb: 'Muffled, wobbling.',
    observe: 'A resonant low-pass keeps only the lows (Response), then a slow Chorus makes it wobble — see the comb move in the Spectrum.',
    source: { kind: 'noise', color: 'pink', level: 0.5 },
    chain: [
      { defId: 'filter', params: { type: 'lowpass', cutoff: 500, q: 6 } },
      { defId: 'modulation', params: { mode: 'chorus', rate: 0.4, depth: 0.8, wet: 0.8 } },
    ],
  },
  {
    id: 'jet',
    name: 'Jet flanger',
    icon: '✈',
    blurb: 'Classic sweeping whoosh.',
    observe: 'In the Spectrum/Spectrogram, comb notches glide up and down — the flanger LFO sweeping a tiny delay. The Modulation view shows that LFO.',
    source: { kind: 'noise', color: 'white', level: 0.4 },
    chain: [{ defId: 'modulation', params: { mode: 'flanger', rate: 0.25, depth: 0.85, feedback: 0.7, wet: 0.7 } }],
  },
  {
    id: 'fuzz',
    name: 'Fuzz lead',
    icon: '🎸',
    blurb: 'Saturated, harmonically rich.',
    observe: 'The Distortion transfer curve squares up the wave and its Spectrum sprouts a harmonic series; the Filter then tames the harsh top.',
    source: osc({ wave: 'sawtooth', freq: 180, mode: 'drone', level: 0.5 }),
    chain: [
      { defId: 'distortion', params: { drive: 18, curve: 'tanh', wet: 1 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 3500, q: 1.5 } },
    ],
  },
]
