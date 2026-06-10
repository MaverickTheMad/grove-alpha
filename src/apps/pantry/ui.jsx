import Icon from '../../components/Icon'

export function Checkbox({ checked, variant }) {
  // variant: undefined (accent) | 'ok' | 'warn'
  const cls = checked ? `pcheck ${variant === 'ok' ? 'ok' : variant === 'warn' ? 'warn' : 'on'}` : 'pcheck'
  return <span className={cls}>{checked ? '✓' : ''}</span>
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
