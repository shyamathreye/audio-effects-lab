import { DEFAULT_OSC } from '../audio/sources/types'
import type { SourceConfig } from '../audio/sources/types'
import type { ParamValue } from '../audio/effects/types'

// Curated, musically-real chains. One click loads the right source + sequence +
// params, switches to the most revealing view, and shows notes on what to LISTEN
// for, what to WATCH, and what to TWEAK.
export interface RecipeStep {
  defId: string
  params?: Record<string, ParamValue>
}

export type RecipeView = 'waveform' | 'spectrum' | 'spectrogram' | 'response'

export interface Recipe {
  id: string
  name: string
  icon: string
  blurb: string
  source: SourceConfig
  chain: RecipeStep[]
  /** big-visualizer view to switch to (the one that reveals this effect) */
  view: RecipeView
  listen: string
  watch: string
  tweak: string
}

const osc = (over: Partial<typeof DEFAULT_OSC>): SourceConfig => ({ ...DEFAULT_OSC, ...over })

export const RECIPES: Recipe[] = [
  {
    id: 'cathedral',
    name: 'Cathedral',
    icon: '⛪',
    blurb: 'Sustained chords in a vast, dark stone space.',
    source: { kind: 'loop', name: 'pad', level: 0.55 },
    chain: [
      { defId: 'eq3', params: { low: -3, mid: 0, midFreq: 1000, high: -4 } },
      { defId: 'reverb', params: { decay: 3.8, predelay: 0.045, damping: 0.5, wet: 0.55 } },
    ],
    view: 'spectrogram',
    listen: 'Each chord blooms into a long, dark wash that keeps ringing after the notes stop — the sound of a big stone room.',
    watch: 'The Reverb module’s decay-tail and the spectrogram: energy smears and fades for seconds after each chord.',
    tweak: 'Raise Reverb Decay for an even bigger space; add Predelay to push the room behind the sound; raise Damping to make it darker/older.',
  },
  {
    id: 'dub',
    name: 'Dub echo',
    icon: '🔊',
    blurb: 'A melody trailing into timed, darkening repeats.',
    source: { kind: 'loop', name: 'melodic', level: 0.6 },
    chain: [
      { defId: 'delay', params: { time: 0.375, feedback: 0.62, wet: 0.5 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 2200, q: 1 } },
    ],
    view: 'spectrogram',
    listen: 'Every note echoes in time and trails off, each repeat a little quieter and darker.',
    watch: 'Spectrogram (or Waveform → Envelope): the echoes fall neatly between the notes, fading down.',
    tweak: 'Raise Delay Feedback for more repeats; shorten Time for a tight slapback; lower the Filter cutoff for dubbier, darker tails.',
  },
  {
    id: 'telephone',
    name: 'Telephone',
    icon: '☎',
    blurb: 'Thin, boxy “phone speaker” voice.',
    source: { kind: 'loop', name: 'melodic', level: 0.7 },
    chain: [
      { defId: 'eq3', params: { low: -18, midFreq: 1700, midQ: 1.4, mid: 6, high: -18 } },
      { defId: 'distortion', params: { drive: 4, curve: 'tanh', output: -4, wet: 0.3 } },
    ],
    view: 'response',
    listen: 'No bass, no air — just a thin, nasal midrange, like a cheap phone speaker.',
    watch: 'The Response view: the curve collapses to a narrow mid band, lows and highs cut away.',
    tweak: 'Narrow the band with Mid Q; move Mid Freq to taste; add a touch of Distortion Drive for extra “speaker” grit.',
  },
  {
    id: 'lofi',
    name: 'Lo-fi tape',
    icon: '📼',
    blurb: 'Crunchy, dull, vintage sampler/tape.',
    source: { kind: 'loop', name: 'drum', level: 0.6 },
    chain: [
      { defId: 'bitcrusher', params: { bits: 9, downsample: 3, wet: 0.8 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 3200, q: 0.8 } },
      { defId: 'reverb', params: { decay: 0.9, damping: 0.4, wet: 0.16 } },
    ],
    view: 'waveform',
    listen: 'Gritty and dull, like an old sampler — bit-crushed crunch with the highs rolled off.',
    watch: 'The Bitcrusher’s stair-stepped waveform and the Filter rolling off the top (Response).',
    tweak: 'Fewer Bits = grittier; lower Filter cutoff = duller; nudge Reverb Mix for a little room.',
  },
  {
    id: 'glue',
    name: 'Glue bus',
    icon: '🍯',
    blurb: 'A tighter, punch-evened drum bus.',
    source: { kind: 'loop', name: 'drum', level: 0.6 },
    chain: [
      { defId: 'compressor', params: { threshold: -26, ratio: 4, attack: 0.01, release: 0.12, makeup: 6 } },
      { defId: 'eq3', params: { low: 2, mid: 0, high: 4 } },
    ],
    view: 'waveform',
    listen: 'The kit sounds tighter and more “together” — peaks reined in, body brought up.',
    watch: 'The Compressor: the dot rides into the knee on each hit and the GR meter pulls down; in Waveform → Envelope the dynamics flatten.',
    tweak: 'Lower Threshold or raise Ratio for more squash (watch GR); use Attack to keep or tame the transient; Makeup to match loudness.',
  },
  {
    id: 'underwater',
    name: 'Underwater',
    icon: '🌊',
    blurb: 'Muffled, woozy, submerged.',
    source: { kind: 'loop', name: 'pad', level: 0.55 },
    chain: [
      { defId: 'filter', params: { type: 'lowpass', cutoff: 450, q: 7 } },
      { defId: 'modulation', params: { mode: 'chorus', rate: 0.5, depth: 0.8, wet: 0.8 } },
    ],
    view: 'response',
    listen: 'Dark and muffled with a slow seasick wobble — like listening from underwater.',
    watch: 'Response: only the lows pass, with a resonant bump at the cutoff; the chorus adds slow movement.',
    tweak: 'Raise Filter cutoff to “surface”; raise Q for a whistly resonance; Chorus Rate sets the wobble speed.',
  },
  {
    id: 'jet',
    name: 'Jet flanger',
    icon: '✈',
    blurb: 'Classic sweeping jet whoosh.',
    source: { kind: 'loop', name: 'drum', level: 0.6 },
    chain: [{ defId: 'modulation', params: { mode: 'flanger', rate: 0.2, depth: 0.85, feedback: 0.7, wet: 0.6 } }],
    view: 'spectrogram',
    listen: 'A sweeping, jet-engine whoosh moving through the sound.',
    watch: 'Spectrogram: comb notches glide up and down; the Modulation module shows the slow LFO driving it.',
    tweak: 'Raise Feedback for a sharper, more metallic sweep; Rate sets how fast it whooshes; Depth its range.',
  },
  {
    id: 'fuzz',
    name: 'Fuzz lead',
    icon: '🎸',
    blurb: 'Thick, buzzy, saturated lead.',
    source: osc({ wave: 'sawtooth', freq: 160, mode: 'drone', level: 0.45 }),
    chain: [
      { defId: 'distortion', params: { drive: 16, curve: 'tanh', output: -6, wet: 1 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 3500, q: 1.5 } },
    ],
    view: 'spectrum',
    listen: 'A fat, buzzy lead — the clean tone grows a thick stack of harmonics.',
    watch: 'The Distortion transfer curve squares up the wave; the Spectrum sprouts a harmonic series; the Filter tames the top.',
    tweak: 'More Drive = more harmonics/fuzz; lower Filter cutoff to tame harshness; try the fold curve for chaos.',
  },
  {
    id: 'robotbell',
    name: 'Robot bell',
    icon: '🤖',
    blurb: 'Metallic, clangy ring-mod tones.',
    source: osc({ wave: 'sine', freq: 330, mode: 'pluck', level: 0.5 }),
    chain: [
      { defId: 'ringmod', params: { freq: 277, wet: 0.9 } },
      { defId: 'reverb', params: { decay: 1.6, wet: 0.3 } },
    ],
    view: 'spectrum',
    listen: 'A pure tone turns metallic and bell-like — new clangy pitches that aren’t in the original.',
    watch: 'The Ring Mod output spectrum: sideband spikes appear that aren’t harmonics of the note.',
    tweak: 'Sweep the Carrier — simple ratios sound musical/bell-like, odd ratios clang and detune.',
  },
  {
    id: 'wah',
    name: 'Funky wah',
    icon: '🕺',
    blurb: 'Quacky envelope filter on a beat.',
    source: { kind: 'loop', name: 'drum', level: 0.6 },
    chain: [{ defId: 'autowah', params: { base: 300, sensitivity: 0.7, q: 5, wet: 0.9 } }],
    view: 'spectrum',
    listen: 'Each hit “quacks” — the filter snaps open on loud notes and closes as they fade.',
    watch: 'The Auto-Wah output spectrum: a resonant peak sweeps up on every hit and falls back.',
    tweak: 'Raise Sensitivity for a wider sweep; lower Base for a deeper quack; raise Q for a more vocal “wah”.',
  },
]
