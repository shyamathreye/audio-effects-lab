import type { ParamSpec, ParamValue } from '../audio/effects/types'
import { Knob } from './Knob'

interface ParamControlProps {
  spec: ParamSpec
  value: ParamValue
  color?: string
  /** Hover help explaining what the control does. */
  help?: string
  onChange: (value: ParamValue) => void
}

// Renders the right control for a ParamSpec: knob (float), select (enum),
// toggle (bool). Driven entirely by the spec so every effect gets a UI for free.
export function ParamControl({ spec, value, color, help, onChange }: ParamControlProps) {
  const tip = help ? `${spec.label} — ${help}` : spec.label

  if (spec.type === 'enum') {
    return (
      <label className="flex flex-col items-center gap-1" title={tip}>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-control bg-outline/60 px-2 py-1 font-mono text-xs text-lcd outline-none ring-1 ring-grid focus:ring-teal"
        >
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-[10px] uppercase tracking-wide text-cream/70">{spec.label}</span>
      </label>
    )
  }

  if (spec.type === 'bool') {
    const on = Boolean(value)
    return (
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        title={tip}
        className="flex flex-col items-center gap-1"
      >
        <span
          className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
            on ? 'bg-mint' : 'bg-grid'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-cream transition-transform ${on ? 'translate-x-5' : ''}`}
          />
        </span>
        <span className="text-[10px] uppercase tracking-wide text-cream/70">{spec.label}</span>
      </button>
    )
  }

  return (
    <Knob
      label={spec.label}
      value={value as number}
      min={spec.min ?? 0}
      max={spec.max ?? 1}
      step={spec.step}
      unit={spec.unit}
      scale={spec.scale}
      color={color}
      help={help}
      onChange={onChange}
    />
  )
}
