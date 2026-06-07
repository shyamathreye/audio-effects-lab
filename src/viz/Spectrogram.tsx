import { useCallback, useEffect, useRef } from 'react'
import { useRafLoop } from './useRafLoop'
import { FREQ_MIN, FREQ_MAX } from './analysis'
import { heatColor } from './heat'

interface SpectrogramProps {
  getAnalyser: () => AnalyserNode | null
  sampleRate: number
  active?: boolean
  className?: string
}

const COL = 2 // device px advanced per frame

// Scrolling spectrogram: x = time (scrolls left), y = log frequency, brightness =
// energy (PRD §5.1). Verify against fx_delay (recurring stripes) and fx_reverb
// (energy smearing into a fading tail). The canvas is its own ring buffer.
export function Spectrogram({ getAnalyser, sampleRate, active = true, className }: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(1024))

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width * dpr))
    const h = Math.max(1, Math.floor(rect.height * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#0c120d'
        ctx.fillRect(0, 0, w, h)
      }
    }
  }, [])

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(resize)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [resize])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height

    // scroll existing image left by COL
    ctx.drawImage(canvas, COL, 0, w - COL, h, 0, 0, w - COL, h)

    const analyser = getAnalyser()
    if (!analyser) {
      ctx.fillStyle = '#0c120d'
      ctx.fillRect(w - COL, 0, COL, h)
      return
    }
    let buf = bufRef.current
    if (buf.length !== analyser.frequencyBinCount) {
      buf = new Uint8Array(analyser.frequencyBinCount)
      bufRef.current = buf
    }
    analyser.getByteFrequencyData(buf)

    const nyq = sampleRate / 2
    const maxF = Math.min(FREQ_MAX, nyq)
    const lmin = Math.log10(FREQ_MIN)
    const lmax = Math.log10(maxF)
    const binHz = nyq / buf.length

    // new column at the right edge: y(top)=high freq, y(bottom)=low freq
    for (let y = 0; y < h; y++) {
      const f = Math.pow(10, lmax - (y / h) * (lmax - lmin))
      const bin = Math.min(buf.length - 1, Math.max(0, Math.round(f / binHz)))
      ctx.fillStyle = heatColor(buf[bin] / 255)
      ctx.fillRect(w - COL, y, COL, 1)
    }
  }, [getAnalyser, sampleRate])

  useRafLoop(draw, active)

  return <canvas ref={canvasRef} className={className} />
}
