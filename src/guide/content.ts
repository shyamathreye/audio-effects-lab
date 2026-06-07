// Learning-guide copy (PRD Part 5), keyed by effect id. Each effect: what it
// does → intuition → what to watch → try this → ≈ Ableton.

export interface EffectGuide {
  what: string
  watch: string
  try: string
  ableton: string
}

export const EFFECT_GUIDE: Record<string, EffectGuide> = {
  utility: {
    what: 'Adjusts level and pan without changing tone. Phase-invert flips the wave vertically.',
    watch: 'The whole waveform scales up/down; the spectrum shape is unchanged. Phase-invert flips the wave but the spectrum is identical.',
    try: 'Invert the phase and watch the spectrum stay put while the waveform mirrors.',
    ableton: 'Utility',
  },
  filter: {
    what: 'Passes some frequencies and attenuates others; resonance (Q) peaks the signal right at the cutoff.',
    watch: "The module's frequency-response curve IS the filter: a low-pass slopes down after the cutoff (dashed marker), a high-pass slopes up, Q makes a resonant peak. In the spectrum, energy beyond the cutoff drops.",
    try: 'Sweep a low-pass on a sawtooth and watch the harmonics vanish right-to-left.',
    ableton: 'Auto Filter',
  },
  eq3: {
    what: 'Boosts or cuts low, mid and high regions independently.',
    watch: "The module's frequency-response curve bends up where you boost and down where you cut — a gentle tilt, not the hard wall of a filter.",
    try: 'Cut the mids hard for a thin “telephone” sound and a visible dip in the spectrum.',
    ableton: 'EQ Three / EQ Eight',
  },
  compressor: {
    what: 'Turns down anything above the threshold by a ratio, shrinking dynamic range; makeup gain restores level.',
    watch: 'In the waveform, peaks get squashed and quiet parts come up — a fuller, more even shape.',
    try: 'Use the drum loop with a low threshold and high ratio, then sweep attack and watch the transients survive or not.',
    ableton: 'Compressor',
  },
  distortion: {
    what: 'Reshapes the wave so brand-new harmonics appear.',
    watch: "The module's in→out transfer curve shows the shaping: the steeper the S vs the dashed unity line, the more it flattens peaks. In the spectrum, new harmonic spikes multiply as Drive rises.",
    try: 'Feed a pure sine and raise Drive — one spike becomes a whole harmonic family.',
    ableton: 'Saturator / Overdrive',
  },
  delay: {
    what: 'Repeats the signal on a timer; feedback sets how many repeats you hear.',
    watch: 'Use the Waveform → Envelope timebase (with a drum/pluck source) to see evenly spaced, fading echoes; the spectrogram shows the same as recurring stripes. Very short times create comb ripples in the spectrum.',
    try: 'On the drum loop, switch to Envelope and watch the echoes fall between the hits. Then drop the time to a few ms to morph the echo into a comb filter — the bridge to Modulation.',
    ableton: 'Delay / Echo',
  },
  reverb: {
    what: 'Dense random reflections blur the sound into a tail.',
    watch: 'In the Waveform → Envelope timebase (or the spectrogram), energy smears and fades after each sound; damping shortens the top of the tail.',
    try: 'Use one drum hit, raise Decay, then raise Damping and watch the bright tail get shorter.',
    ableton: 'Reverb / Hybrid',
  },
  modulation: {
    what: 'A slow LFO nudges a parameter: short-delay = chorus/flanger, allpass sweep = phaser, volume = tremolo, pan = auto-pan.',
    watch: 'In the spectrum/spectrogram, moving comb/notch patterns; tremolo pulses the amplitude.',
    try: 'Use a slow-rate Flanger and watch the notches glide across the spectrum.',
    ableton: 'Chorus / Phaser-Flanger / Auto Pan',
  },
  bitcrusher: {
    what: 'Degrades the signal two ways: fewer bits (coarser amplitude steps) and a lower sample rate (sample-and-hold), for a lo-fi/digital crunch.',
    watch: 'In the waveform the smooth curve turns into stair-steps; in the spectrum, new aliasing partials appear (often at non-harmonic frequencies).',
    try: 'Drop Bits to 3–4 on a sine and watch it square up; then raise Downsample and watch aliasing spikes appear.',
    ableton: 'Redux',
  },
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
