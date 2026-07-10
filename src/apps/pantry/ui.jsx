import Icon from '../../components/Icon'

export function Checkbox({ checked, variant }) {
  // variant: undefined (accent) | 'ok' | 'warn'
  // warn = partial: circle shape + warn hue; ok = full: square + green
  const cls = checked ? `pcheck ${variant === 'ok' ? 'ok' : variant === 'warn' ? 'warn' : 'on'}` : 'pcheck'
  const symbol = checked ? (variant === 'warn' ? '◐' : '✓') : ''
  return <span className={cls}>{symbol}</span>
}

export function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      <div className="p-eyebrow">{eyebrow}</div>
      <h2 className="p-h2">{title}</h2>
      {subtitle && <p className="p-sub">{subtitle}</p>}
    </div>
  )
}

export function PageHeader({ title, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '10.5px', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Pantry</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.95rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>{title}</h1>
        {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
      </div>
    </div>
  )
}

export function SectionLabel({ name, count }) {
  return (
    <div className="p-seclabel">
      <span>{name}</span>
      {count != null && <span className="count">{count}</span>}
    </div>
  )
}

export function Empty({ icon = 'pantry', message }) {
  return (
    <div className="empty">
      <span className="big"><Icon name={icon} size={34} /></span>
      <p className="line">{message}</p>
    </div>
  )
}
