/** @type {import('tailwindcss').Config} */
// §2A color tokens sampled from the reference illustration. The canonical
// values live in src/theme/tokens.css as CSS variables; these mirror them so
// Tailwind utilities (bg-chassis, text-mint, …) resolve to var(--token).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chassis: 'var(--chassis)',
        outline: 'var(--outline)',
        cream: 'var(--panel-cream)',
        coral: 'var(--panel-coral)',
        'coral-alt': 'var(--panel-coral-alt)',
        teal: 'var(--teal)',
        mint: 'var(--mint)',
        red: 'var(--red)',
        lcd: 'var(--lcd)',
        grid: 'var(--grid)',
        // stage hues (§2A.2)
        'stage-dry': 'var(--stage-dry)',
        'stage-utility': 'var(--stage-utility)',
        'stage-filter': 'var(--stage-filter)',
        'stage-eq': 'var(--stage-eq)',
        'stage-compressor': 'var(--stage-compressor)',
        'stage-distortion': 'var(--stage-distortion)',
        'stage-delay': 'var(--stage-delay)',
        'stage-reverb': 'var(--stage-reverb)',
        'stage-modulation': 'var(--stage-modulation)',
        'stage-bitcrusher': 'var(--stage-bitcrusher)',
        'stage-ringmod': 'var(--stage-ringmod)',
        'stage-autowah': 'var(--stage-autowah)',
      },
      borderRadius: {
        panel: '20px',
        control: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        well: 'inset 0 2px 8px var(--outline)',
        lift: '0 2px 6px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
