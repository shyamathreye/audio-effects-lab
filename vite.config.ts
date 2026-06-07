/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves a project repo under /<repo>/. Dev stays at root.
  // BASE_URL flows through to the bitcrusher worklet path, so it Just Works.
  base: command === 'build' ? '/audio-effects-lab/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
