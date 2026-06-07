// Learning-guide copy (PRD Part 5), keyed by effect id. Each effect: what it
// does → intuition → what to watch → try this → ≈ Ableton.

export interface EffectGuide {
  what: string
  watch: string
  try: string
  ableton: string
  /** which source best reveals this effect */
  bestWith: string
}

export const EFFECT_GUIDE: Record<string, EffectGuide> = {
  utility: {
    what: 'Adjusts level and pan without changing tone. Phase-invert flips the wave vertically.',
    watch: "The module's in-vs-out view ghosts the input behind the output: gain makes the output taller/shorter; phase-invert flips it; the spectrum shape never changes.",
    try: 'Invert the phase and watch the spectrum stay put while the waveform mirrors.',
    ableton: 'Utility',
    bestWith: 'any source — toggle Phase Invert on a tone',
  },
  filter: {
    what: 'Passes some frequencies and attenuates others; resonance (Q) peaks the signal right at the cutoff.',
    watch: "The module's frequency-response curve IS the filter: a low-pass slopes down after the cutoff (dashed marker), a high-pass slopes up, Q makes a resonant peak. In the spectrum, energy beyond the cutoff drops.",
    try: 'Sweep a low-pass on a sawtooth and watch the harmonics vanish right-to-left.',
    ableton: 'Auto Filter',
    bestWith: 'a Saw oscillator (rich harmonics to carve)',
  },
  eq3: {
    what: 'Boosts or cuts low, mid and high regions independently.',
    watch: "The module's frequency-response curve bends up where you boost and down where you cut — a gentle tilt, not the hard wall of a filter.",
    try: 'Cut the mids hard for a thin “telephone” sound and a visible dip in the spectrum.',
    ableton: 'EQ Three / EQ Eight',
    bestWith: 'a Loop or Saw (full-range material)',
  },
  compressor: {
    what: 'Turns down anything above the threshold by a ratio, shrinking dynamic range; makeup gain restores level.',
    watch: "The module shows the threshold/ratio knee with a live dot that rides up the curve and flattens once it crosses the threshold; the GR readout shows how many dB it's pulling down right now.",
    try: 'Use the drum loop with a low threshold and high ratio, then sweep attack and watch the transients survive or not.',
    ableton: 'Compressor',
    bestWith: 'the Drum loop (clear transients to squash)',
  },
  distortion: {
    what: 'Reshapes the wave so brand-new harmonics appear.',
    watch: "The module's in→out transfer curve shows the shaping: the steeper the S vs the dashed unity line, the more it flattens peaks. In the spectrum, new harmonic spikes multiply as Drive rises.",
    try: 'Feed a pure sine and raise Drive — one spike becomes a whole harmonic family.',
    ableton: 'Saturator / Overdrive',
    bestWith: 'a pure Sine (watch one spike become many)',
  },
  delay: {
    what: 'Repeats the signal on a timer; feedback sets how many repeats you hear.',
    watch: "The module's echo diagram shows the dry hit then taps spaced at the delay time, each feedback× shorter. In the big view, the Waveform → Envelope timebase shows the echoes between drum hits; the spectrogram shows recurring stripes.",
    try: 'On the drum loop, switch to Envelope and watch the echoes fall between the hits. Then drop the time to a few ms to morph the echo into a comb filter — the bridge to Modulation.',
    ableton: 'Delay / Echo',
    bestWith: 'the Drum loop or Pluck (transients show echoes)',
  },
  reverb: {
    what: 'Dense random reflections blur the sound into a tail.',
    watch: 'In the Waveform → Envelope timebase (or the spectrogram), energy smears and fades after each sound; damping shortens the top of the tail.',
    try: 'Use one drum hit, raise Decay, then raise Damping and watch the bright tail get shorter.',
    ableton: 'Reverb / Hybrid',
    bestWith: 'a Pluck or Drum hit (hear the tail decay)',
  },
  modulation: {
    what: 'A slow LFO nudges a parameter: short-delay = chorus/flanger, allpass sweep = phaser, volume = tremolo, pan = auto-pan.',
    watch: "The module draws the LFO itself over a few seconds — Rate sets how many wiggles, Depth their size — labelled with what it modulates. In the spectrum/spectrogram you'll see the resulting comb/notch pattern move; tremolo pulses the amplitude.",
    try: 'Use a slow-rate Flanger and watch the notches glide across the spectrum.',
    ableton: 'Chorus / Phaser-Flanger / Auto Pan',
    bestWith: 'White noise or a Saw (broadband shows the comb)',
  },
  ringmod: {
    what: 'Multiplies the sound by a sine “carrier”, creating sum & difference tones (f ± carrier) that are usually inharmonic — metallic, bell-like, robotic.',
    watch: "The module's output spectrum shows new sideband spikes that aren't harmonics of the original — slide the Carrier and watch them move.",
    try: 'On a pure sine, sweep the Carrier: at low Hz you get tremolo-like beating; higher up, clangorous metallic tones.',
    ableton: 'Frequency Shifter (Ring)',
    bestWith: 'a Sine or simple tone (sidebands are easy to spot)',
  },
  autowah: {
    what: 'A resonant band-pass filter whose cutoff is pushed up by the signal’s own loudness — louder notes open brighter. The funky “wah”.',
    watch: "The module's output spectrum shows a resonant peak that sweeps up on loud hits and falls back as they decay; raise Sensitivity for a wider sweep.",
    try: 'On the drum loop, raise Sensitivity and lower Base — each hit “quacks” as the filter opens and closes.',
    ableton: 'Auto Filter (Envelope)',
    bestWith: 'the Drum loop or a plucky source (dynamics drive it)',
  },
  bitcrusher: {
    what: 'Degrades the signal two ways: fewer bits (coarser amplitude steps) and a lower sample rate (sample-and-hold), for a lo-fi/digital crunch.',
    watch: 'In the waveform the smooth curve turns into stair-steps; in the spectrum, new aliasing partials appear (often at non-harmonic frequencies).',
    try: 'Drop Bits to 3–4 on a sine and watch it square up; then raise Downsample and watch aliasing spikes appear.',
    ableton: 'Redux',
    bestWith: 'a Sine or Saw (clean wave to crush)',
  },
}

// Per-control help, keyed by `${effectId}.${paramId}` — shown on hover so a
// learner can find out what each knob does without leaving the patch.
export const PARAM_HELP: Record<string, string> = {
  'utility.gain': 'Overall level in dB. 0 = unchanged, negative = quieter, positive = louder.',
  'utility.pan': 'Left/right placement. 0 = centre, −1 = hard left, +1 = hard right.',
  'utility.invert': 'Flips the waveform upside-down. Sounds identical alone, but can cancel when summed with the dry signal.',

  'filter.type': 'Filter shape: low-pass keeps lows, high-pass keeps highs, band-pass keeps a band, notch removes one, shelves/peaks tilt a region.',
  'filter.cutoff': 'The corner frequency where the filter starts acting (the dashed line on the curve).',
  'filter.q': 'Resonance — how sharp the corner is. High Q makes a whistling peak right at the cutoff.',
  'filter.gain': 'Boost/cut amount for the peaking & shelf types (ignored by low/high/band-pass).',

  'eq3.low': 'Low shelf (≈150 Hz) — boosts or cuts the bass region.',
  'eq3.midFreq': 'Centre frequency of the mid band — slide the Mid marker along the curve.',
  'eq3.midQ': 'Width of the mid band. High = a narrow surgical bump, low = a broad gentle tilt.',
  'eq3.mid': 'Boost or cut the mid band at the chosen frequency.',
  'eq3.high': 'High shelf (≈4 kHz) — boosts or cuts the treble/air region.',

  'compressor.threshold': 'Level above which the compressor starts turning the signal down. Lower = more of the signal gets compressed.',
  'compressor.ratio': 'How hard it clamps above the threshold. 4:1 means 4 dB in → 1 dB out.',
  'compressor.attack': 'How quickly it reacts to a loud peak. Fast catches transients; slow lets them through.',
  'compressor.release': 'How quickly it lets go after the signal drops. Too fast can pump; too slow stays squashed.',
  'compressor.knee': 'How gradually compression engages around the threshold. Soft = smooth, hard = abrupt.',
  'compressor.makeup': 'Adds level back after compression so the result matches the input loudness.',

  'distortion.drive': 'How hard the signal is pushed into the shaping curve — more drive = more harmonics.',
  'distortion.curve': 'Shaping style: tanh = warm/soft, hard = harsh clip, fold = wild wavefolding.',
  'distortion.output': 'Level after shaping — distortion gets loud, so pull this down to match.',
  'distortion.wet': 'Blend of distorted vs clean signal. 1 = fully distorted.',

  'delay.time': 'Gap between echoes. Short = slapback/comb, long = distinct repeats.',
  'delay.feedback': 'How much of each echo is fed back in — higher = more repeats before fading (capped below runaway).',
  'delay.wet': 'Balance of echoes vs the dry signal.',

  'reverb.decay': 'How long the tail rings out — bigger = bigger space.',
  'reverb.predelay': 'Gap before the reverb starts; a little pushes the space back behind the sound.',
  'reverb.damping': 'How fast the bright/high part of the tail dies — higher = darker, more “distant”.',
  'reverb.wet': 'Balance of reverb vs the dry signal.',

  'modulation.mode': 'Chorus/Flanger sweep a tiny delay, Phaser sweeps notches, Tremolo wobbles volume, Auto-Pan sweeps left↔right.',
  'modulation.rate': 'Speed of the LFO — how fast the wobble/sweep moves.',
  'modulation.depth': 'How much the LFO moves its target — the size of the effect.',
  'modulation.feedback': 'Flanger only — feeds output back for a sharper, more metallic sweep.',
  'modulation.wet': 'Balance of modulated vs dry signal.',

  'bitcrusher.bits': 'Bit depth — fewer bits = coarser amplitude steps (the stair-steps).',
  'bitcrusher.downsample': 'Sample-rate reduction — hold each sample longer for grittier aliasing.',
  'bitcrusher.wet': 'Blend of crushed vs clean signal.',

  'ringmod.freq': 'Carrier frequency. The sidebands appear at your sound’s pitch ± this value.',
  'ringmod.wet': 'Blend of ring-modulated vs dry signal.',

  'autowah.base': 'Resting filter frequency when the input is quiet — where the wah sits at rest.',
  'autowah.sensitivity': 'How far the filter opens up on loud notes — the size of the “wah”.',
  'autowah.q': 'Resonance of the sweeping peak — higher = more vocal “quack”.',
  'autowah.wet': 'Balance of wah vs dry signal.',
}

export interface Primer {
  title: string
  body: string
}

export const PRIMERS: Primer[] = [
  {
    title: 'A sound wave',
    body: 'Sound is air pressure wobbling over time. We draw it as amplitude (height) versus time — taller is louder, a repeating shape is a steady pitch, hard corners sound bright or harsh.',
  },
  {
    title: 'Two views of one sound',
    body: 'The time domain (oscilloscope) shows shape, loudness and rhythm. The frequency domain (spectrum) shows how much energy sits at each pitch. An FFT converts between them.',
  },
  {
    title: 'Spectrum',
    body: 'Left is bass, right is treble; spikes are strong frequencies. A musical tone shows a fundamental plus a series of harmonics above it.',
  },
  {
    title: 'Spectrogram',
    body: 'The spectrum over time: x = time, y = frequency, brightness = energy. Watch energy move and fade — great for delays and reverb tails.',
  },
  {
    title: 'Why order matters',
    body: 'Each effect acts on the previous one’s output, so distortion → reverb sounds nothing like reverb → distortion. Drag modules to reorder and compare.',
  },
]
