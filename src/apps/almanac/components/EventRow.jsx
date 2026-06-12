import { kindMeta, sourceLink, fmtTime, fmtMoney } from '../constants'
import Icon from '../../../components/Icon'

// Build the subline as an array of parts; join with " · " for clean separators.
function sublineParts(row) {
  const parts = []
  parts.push(row.event_time ? fmtTime(row.event_time) : 'All day')
  if (row.meta?.location) parts.push(row.meta.location)
  if (row.meta?.servings) parts.push(`serves ${row.meta.servings}`)
  if (row.kind === 'pet') {
    const m = row.meta || {}
    if (m.pet_subkind === 'medication') {
      if (m.dose) parts.push(m.dose)
      if (m.frequency) parts.push(m.frequency)
    }
    if (m.pet_subkind === 'vet_visit') {
      if (m.reason) parts.push(m.reason)
      if (m.vet) parts.push(m.vet)
    }
    if (m.pet_subkind === 'vaccine' && m.vet) parts.push(m.vet)
    if (m.repeat_days) parts.push(`every ${m.repeat_days} days`)
  }
  return parts
}

export default function EventRow({ row }) {
  const meta = kindMeta(row.kind)
  const link = sourceLink(row.kind)
  const paid = row.meta?.paid
  const subline = sublineParts(row).join(' · ')

  return (
    <div className="evrow" style={{ '--dot': meta.color }}>
      <span className="evdot" aria-hidden>{meta.icon}</span>
      <div className="evbody">
        <div className="evtitle">
          {row.title}
          {row.kind === 'bill' && paid && <span className="evtag paid">paid</span>}
          {row.kind === 'bill' && row.meta?.autopay && <span className="evtag">auto</span>}
          {row.meta?.predicted && <span className="evtag">est.</span>}
          {row.kind === 'pet' && row.meta?.projected && <span className="evtag">recurring</span>}
          {row.kind === 'pet' && row.meta?.historical && <span className="evtag">past</span>}
        </div>
        <div className="evsub">{subline}</div>
      </div>
      {row.amount != null && (
        <span className={`evamt ${row.kind === 'payday' ? 'pos' : ''}`}>
          {row.kind === 'payday' ? '+' : ''}{fmtMoney(row.amount)}
        </span>
      )}
      {link && (
        <a className="evlink" href={link} target="_blank" rel="noreferrer" aria-label="Open source app">
          <Icon name="external" size={14} />
        </a>
      )}
    </div>
  )
}
