// DS · Checkbox — tri-variant checkbox (lifted from pantry/ui.jsx).
// variant: undefined (accent) | 'ok' | 'warn'
export default function Checkbox({ checked, variant }) {
  const cls = checked
    ? `pcheck ${variant === 'ok' ? 'ok' : variant === 'warn' ? 'warn' : 'on'}`
    : 'pcheck'
  const symbol = checked ? (variant === 'warn' ? '◐' : '✓') : ''
  return <span className={cls}>{symbol}</span>
}
