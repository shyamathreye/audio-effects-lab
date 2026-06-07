import { DEFAULT_OSC } from '../audio/sources/types'
import type { SourceConfig } from '../audio/sources/types'
import type { ParamValue } from '../audio/effects/types'

// Curated, musically-real chains. Each pairs the effect with the source that
// (a) matches its real-world use and (b) makes the effect clearest — e.g.
// time-based effects use sources with gaps so the echoes/tails are audible.
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
  view: RecipeView
  listen: string
  watch: string
  tweak: string
}

const osc = (over: Partial<typeof DEFAULT_OSC>): SourceConfig => ({ ...DEFAULT_OSC, ...over })

export const RECIPES: Recipe[] = [
  {
    id: 'telephone',
    name: 'Telephone',
    icon: '☎',
    blurb: 'Thin “phone speaker” voice — EQ on a melody.',
    source: { kind: 'loop', name: 'melodic', level: 0.7 },
    chain: [{ defId: 'eq3', params: { low: -18, midFreq: 1700, midQ: 1.4, mid: 6, high: -18 } }],
    view: 'response',
    listen: 'The tune turns thin and nasal — no bass, no air — exactly like a cheap phone speaker.',
    watch: 'Response view: the curve squeezes into a narrow mid band, with the lows and highs cut away.',
    tweak: 'Move Mid Freq / Mid Q to reshape the band; widen the Highs back in to “take it off the phone”.',
  },
  {
    id: 'funkwah',
    name: 'Funk wah',
    icon: '🎸',
    blurb: 'Auto-wah on a bass riff — that funky quack.',
    source: { kind: 'loop', name: 'bass', level: 0.7 },
    chain: [{ defId: 'autowah', params: { base: 250, sensitivity: 0.8, q: 5, wet: 0.95 } }],
    view: 'spectrum',
    listen: 'Each bass note “wahs” open and shut — the filter follows how loud you play. Classic funk bass.',
    watch: 'Output spectrum: a resonant peak sweeps up on the louder notes and falls back as they fade.',
    tweak: 'Sensitivity = how wide it opens; Base = where it rests; Q = how vocal the quack is.',
  },
  {
    id: 'dub',
    name: 'Dub echo',
    icon: '🔊',
    blurb: 'Delay on drums — spacious, timed snare echoes.',
    source: { kind: 'loop', name: 'drum', level: 0.65 },
    chain: [
      { defId: 'delay', params: { time: 0.43, feedback: 0.55, wet: 0.42 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 1600, q: 1 } },
    ],
    view: 'spectrogram',
    listen: 'The snare flies off into evenly-timed echoes that fade and darken — the spacious sound of dub.',
    watch: 'Spectrogram: each hit repeats at the delay time as recurring stripes, getting fainter and darker.',
    tweak: 'Feedback = number of repeats; Time = their spacing; lower the Filter cutoff for dubbier, darker tails.',
  },
  {
    id: 'cathedral',
    name: 'Cathedral',
    icon: '⛪',
    blurb: 'Reverb on a slow pluck — a huge stone space.',
    source: osc({ wave: 'triangle', freq: 329.63, mode: 'pluck', level: 0.5, decay: 0.18, sustain: 0.4, release: 0.4 }),
    chain: [{ defId: 'reverb', params: { decay: 4.0, predelay: 0.05, damping: 0.45, wet: 0.55 } }],
    view: 'spectrogram',
    listen: 'Each note rings out and blooms into a long, slowly-fading tail — and you hear it decay in the silence between plucks.',
    watch: 'Spectrogram: energy smears and fades for seconds after each note. The Reverb module shows the decay shape.',
    tweak: 'Decay = room size; Predelay pushes the space back behind the note; Damping makes the tail darker/older.',
  },
  {
    id: 'lofi',
    name: 'Lo-fi tape',
    icon: '📼',
    blurb: 'Warm, dull, wobbly chords — worn-tape vibe.',
    source: { kind: 'loop', name: 'chords', level: 0.6 },
    chain: [
      { defId: 'bitcrusher', params: { bits: 10, downsample: 2, wet: 0.5 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 2400, q: 0.8 } },
      { defId: 'modulation', params: { mode: 'chorus', rate: 0.7, depth: 0.35, wet: 0.4 } },
    ],
    view: 'waveform',
    listen: 'Warm, dull and gently wobbly — like a worn cassette or old sampler. Mellow, not harsh.',
    watch: 'The Filter rolls the highs off (Response); the Bitcrusher adds fine steps; the chorus gives slow tape wobble.',
    tweak: 'Lower the Filter cutoff for more “tape”; raise Bitcrusher Downsample for grit; Chorus Depth for wow & flutter.',
  },
  {
    id: 'underwater',
    name: 'Underwater',
    icon: '🌊',
    blurb: 'Resonant low-pass + chorus on noise.',
    source: { kind: 'noise', color: 'pink', level: 0.45 },
    chain: [
      { defId: 'filter', params: { type: 'lowpass', cutoff: 500, q: 7 } },
      { defId: 'modulation', params: { mode: 'chorus', rate: 0.4, depth: 0.85, wet: 0.85 } },
    ],
    view: 'spectrum',
    listen: 'A dark, watery whoosh — only the low rumble passes, swirling slowly.',
    watch: 'Spectrum: only the lows remain with a resonant bump at the cutoff; the chorus makes that band shimmer and move.',
    tweak: 'Raise the Filter cutoff to “surface”; raise Q for a whistlier resonance; Chorus Rate sets the swirl speed.',
  },
  {
    id: 'fuzz',
    name: 'Fuzz lead',
    icon: '🔥',
    blurb: 'Distortion on a saw — thick buzzy lead.',
    source: osc({ wave: 'sawtooth', freq: 110, mode: 'drone', level: 0.45 }),
    chain: [
      { defId: 'distortion', params: { drive: 16, curve: 'tanh', output: -6, wet: 1 } },
      { defId: 'filter', params: { type: 'lowpass', cutoff: 3200, q: 1.4 } },
    ],
    view: 'spectrum',
    listen: 'A plain tone turns into a thick, buzzy, saturated lead.',
    watch: 'The Distortion transfer curve squares the wave; the Spectrum grows a tall harmonic stack; the Filter tames the top.',
    tweak: 'More Drive = more fuzz; try the fold curve for chaos; lower the Filter cutoff to smooth the harshness.',
  },
  {
    id: 'robotbell',
    name: 'Robot bell',
    icon: '🤖',
    blurb: 'Ring mod on a sine — metallic clang.',
    source: osc({ wave: 'sine', freq: 330, mode: 'pluck', level: 0.5 }),
    chain: [
      { defId: 'ringmod', params: { freq: 277, wet: 0.9 } },
      { defId: 'reverb', params: { decay: 1.8, wet: 0.3 } },
    ],
    view: 'spectrum',
    listen: 'A pure tone becomes a metallic, clangy bell — pitches appear that weren’t in the original note.',
    watch: 'Ring Mod output spectrum: sideband spikes (note ± carrier) that aren’t harmonics of the note.',
    tweak: 'Sweep the Carrier — simple ratios sound bell-like and tuned; odd ratios clang and detune.',
  },
  {
    id: 'glue',
    name: 'Punchy drums',
    icon: '🥁',
    blurb: 'Compressor on the kit — tight & punchy.',
    source: { kind: 'loop', name: 'drum', level: 0.6 },
    chain: [
      { defId: 'compressor', params: { threshold: -26, ratio: 4, attack: 0.008, release: 0.12, makeup: 6 } },
      { defId: 'eq3', params: { low: 2, mid: 0, high: 3 } },
    ],
    view: 'waveform',
    listen: 'The kit sounds tighter and punchier — loud peaks reined in, the body brought up and even.',
    watch: 'Compressor: the dot rides into the knee on each hit and the GR meter pulls down. Waveform → Envelope shows the evened dynamics.',
    tweak: 'Lower Threshold / raise Ratio for more squash; Attack decides whether the snap survives; Makeup matches the level.',
  },
  {
    id: 'jet',
    name: 'Jet flanger',
    icon: '✈',
    blurb: 'Flanger on noise — sweeping jet whoosh.',
    source: { kind: 'noise', color: 'white', level: 0.4 },
    chain: [{ defId: 'modulation', params: { mode: 'flanger', rate: 0.2, depth: 0.85, feedback: 0.7, wet: 0.65 } }],
    view: 'spectrogram',
    listen: 'A sweeping, jet-engine whoosh moving through the hiss.',
    watch: 'Spectrogram: comb notches glide up and down. The Modulation module shows the slow LFO that drives them.',
    tweak: 'Feedback sharpens the metallic sweep; Rate sets the speed; Depth the range.',
  },
]
