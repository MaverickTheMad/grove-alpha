import { useState } from 'react'
import Icon from '../../../components/Icon'
import Sheet from '../../../components/Sheet'
import { useToast } from '../../../components/Toast'
import { normIng } from '../lib/shopping'
import { PageHeader, SectionLabel, Empty, Checkbox } from '../ui'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MealsTab({ recipes, selected, multipliers, mealPlan, onToggle, onSetMultiplier, onAssignDay, onEdit, onAddRecipe, onNewTrip }) {
  const [assigningDay, setAssigningDay] = useState(null)
  const [search, setSearch] = useState('')
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const toast = useToast()

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay())
  const getDate = (off) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + off); return d }

  const filteredForPicker = [...recipes]
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const assignedIds = new Set(Object.values(mealPlan).filter(Boolean))
  const unplanned = selected.filter((id) => !assignedIds.has(id))

  const weekMonthLabel = (w) => {
    const su = getDate(w * 7), sa = getDate(w * 7 + 6)
    if (su.getMonth() === sa.getMonth()) return su.toLocaleDateString('en-US', { month: 'long' })
    return su.toLocaleDateString('en-US', { month: 'short' }) + ' / ' + sa.toLocaleDateString('en-US', { month: 'short' })
  }

  return (
    <main className="screen">
      <PageHeader title="Meals" action={onNewTrip && (
        <button onClick={onNewTrip} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>Start new trip</button>
      )} />

      <div className="cal" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="cal-dayhead">{DAYS.map((d) => <div key={d}>{d}</div>)}</div>
        {[0, 1, 2].map((w) => (
          <div key={w}>
            <div className="cal-weeklabel">
              <span>{w === 0 ? 'This week' : w === 1 ? 'Next week' : 'Week after'}</span>
              <span>{weekMonthLabel(w)}</span>
            </div>
            <div className="cal-row">
              {DAYS.map((_, i) => {
                const off = w * 7 + i
                const date = getDate(off)
                const isToday = date.getTime() === today.getTime()
                const isPast = date < today && !isToday
                const assignedId = mealPlan[String(off)]
                const assignedRecipe = assignedId ? recipes.find((r) => r.id === assignedId) : null
                const picking = assigningDay === off
                const isDragTarget = dragOver === off && dragFrom !== off
                const cls = ['cal-cell',
                  isToday ? 'today' : '',
                  picking ? 'picking' : '',
                  isDragTarget ? 'drag-target' : '',
                  dragFrom === off ? 'dragging' : '',
                  assignedRecipe ? 'has-meal' : isPast ? 'past' : ''].join(' ').replace(/\s+/g, ' ').trim()
                const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                const mealLabel = assignedRecipe ? assignedRecipe.name : isPast ? 'no meal' : 'plan a meal'
                return (
                  <button
                    type="button"
                    key={off}
                    className={cls}
                    aria-label={`${dateLabel} — ${mealLabel}`}
                    aria-pressed={picking}
                    draggable={!!assignedRecipe}
                    onDragStart={() => { setDragFrom(off); setAssigningDay(null) }}
                    onDragEnd={() => { setDragFrom(null); setDragOver(null) }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(off) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragFrom === null || dragFrom === off) return
                      const fromId = mealPlan[String(dragFrom)]
                      const toId = mealPlan[String(off)]
                      onAssignDay(dragFrom, toId || null)
                      onAssignDay(off, fromId || null)
                      setDragFrom(null); setDragOver(null)
                    }}
                    onClick={() => !dragFrom && setAssigningDay(picking ? null : off)}
                  >
                    <span className={`cal-date ${isToday ? 'today' : ''}`}>
                      <span className="cal-dow">{DAYS[i].slice(0, 3)}</span>
                      <span className="cal-date-num">{date.getDate()}</span>
                      {isToday && <span className="cal-today-badge">Today</span>}
                    </span>
                    {assignedRecipe
                      ? <span className="cal-meal">{assignedRecipe.name}</span>
                      : !isPast && <span style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>+ Plan a meal</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Sheet
        open={assigningDay !== null}
        onClose={() => { setAssigningDay(null); setSearch('') }}
        title={assigningDay !== null ? getDate(assigningDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
      >
        <input className="input" placeholder="Search recipes…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 'var(--sp-2)' }} autoFocus />
        <div className="stack" style={{ gap: 2 }}>
          {filteredForPicker.map((r) => {
            const isAssigned = mealPlan[String(assigningDay)] === r.id
            const elsewhere = Object.entries(mealPlan).find(([k, v]) => v === r.id && Number(k) !== assigningDay)
            const elsewhereLabel = elsewhere ? getDate(Number(elsewhere[0])).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null
            return (
              <div key={r.id} className="row" style={{ gap: 0 }}>
                <button className="item grow" style={isAssigned ? { background: 'var(--app-accent)', color: '#0B0F09', borderColor: 'var(--app-accent)' } : {}}
                  onClick={() => { onAssignDay(assigningDay, r.id); setAssigningDay(null); setSearch('') }}>
                  <span className="grow">{r.name}</span>
                  {r.category && r.category !== 'Other' && <span style={{ fontSize: 10, textTransform: 'uppercase', color: isAssigned ? 'inherit' : 'var(--text-soft)' }}>{r.category}</span>}
                  {elsewhereLabel && !isAssigned && <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>{elsewhereLabel}</span>}
                  {selected.includes(r.id) && !isAssigned && !elsewhereLabel && <span style={{ fontSize: 10, color: 'var(--ok)' }}>✓</span>}
                </button>
                {isAssigned && (
                  <button
                    className="icon-btn"
                    aria-label="Remove meal from this day"
                    style={{ minWidth: 44, color: 'var(--text-soft)', flexShrink: 0 }}
                    onClick={() => {
                      const removedId = r.id
                      const removedDay = assigningDay
                      onAssignDay(removedDay, null)
                      setAssigningDay(null)
                      setSearch('')
                      toast.show('Meal removed', {
                        actionLabel: 'Undo',
                        onAction: () => onAssignDay(removedDay, removedId),
                      })
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Sheet>

      {unplanned.length > 0 && (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <SectionLabel name="Also this week" count={unplanned.length} />
          <div className="stack" style={{ gap: 'var(--sp-2)' }}>
            {unplanned.map((id) => {
              const r = recipes.find((x) => x.id === id); if (!r) return null
              const ings = (r.ingredients || []).map(normIng)
              const mult = multipliers[r.id] || 1
              return (
                <div key={id} className="item on" style={{ padding: 0 }}>
                  <button className="grow row" style={{ padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none' }} onClick={() => onToggle(r.id)}>
                    <Checkbox checked />
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', display: 'block' }}>{r.name}</span>
                      {ings.length > 0 && <span className="p-sub" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ings.slice(0, 4).map((i) => i.name).join(' · ')}{ings.length > 4 ? ` +${ings.length - 4}` : ''}</span>}
                    </span>
                  </button>
                  <div className="row" style={{ paddingRight: 8, gap: 4 }}>
                    <span className="qstep">
                      <button disabled={mult <= 1} onClick={() => onSetMultiplier(r.id, mult - 1)}>−</button>
                      <span className="v">{mult}×</span>
                      <button disabled={mult >= 10} onClick={() => onSetMultiplier(r.id, mult + 1)}>+</button>
                    </span>
                    <button className="icon-btn" aria-label="Edit" onClick={() => onEdit(r)}><Icon name="edit" size={18} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {Object.keys(mealPlan).length === 0 && selected.length === 0 && (
        <Empty icon="meals" message="Tap any day on the calendar to assign a meal." />
      )}

      <div className="row" style={{ justifyContent: 'center', paddingTop: 'var(--sp-2)' }}>
        <button className="btn sm" onClick={onAddRecipe}><Icon name="log" size={16} /> Add new recipe</button>
      </div>
    </main>
  )
}
