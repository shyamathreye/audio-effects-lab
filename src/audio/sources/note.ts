// Musical-note helpers so the oscillator can be tuned by note name + octave
// instead of a raw frequency. Frequency stays the source of truth; note/octave
// are derived from it for display and set it on interaction.
export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440))
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function midiNoteIndex(midi: number): number {
  return ((midi % 12) + 12) % 12
}

export function midiOctave(midi: number): number {
  return Math.floor(midi / 12) - 1
}

/** Build a MIDI number from a note index (0–11) and octave. */
export function noteToMidi(noteIndex: number, octave: number): number {
  return (octave + 1) * 12 + noteIndex
}

export function midiLabel(midi: number): string {
  return `${NOTE_NAMES[midiNoteIndex(midi)]}${midiOctave(midi)}`
}
