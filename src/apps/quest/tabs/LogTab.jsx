import { useState, useEffect, useCallback } from 'react'
import * as store from '../lib/store'

// This log belongs to Mav; his workouts in the Fitness app log under 'mav'.
const FITNESS_PERSON = 'mav'
// Mirror of the Fitness app's workout categories (kept local — separate repo).
const FITNESS_CATEGORY_LABEL = {
  general: 'General', cardio: 'Cardio', pilates_yoga: 'Pilates / Yoga',
  legs: 'Legs', arms: 'Arms', core: 'Chest / Abs / Back', rest: 'Rest / Walk',
}
import {
  DEFAULT_HABITS, MOODS, EXERCISE_TYPES, FOOD_CATEGORIES, FOOD_CATEGORY_NAMES, WATER_OPTIONS, EVENT_XP,
  todayStr, localDayBounds, isoToLocalDateStr, prettyDate, addDays,
  MEAL_PICKER, categorizeIngredient,
} from '../constants'
import TimePicker from '../../../components/TimePicker'

export default function LogTab({ ctx }) {
  const { habitStreaks, completions, toggleHabit, awardXp } = ctx
  const [date, setDate] = useState(todayStr())
  const [events, setEvents] = useState([])
  const [sheet, setSheet] = useState(null) // 'mood' | 'food' | 'water' | 'exercise' | 'sleep'
  const [retiming, setRetiming] = useState(null) // { id, when } for a food block being retimed

  const isToday = date === todayStr()
  const dayDone = completions[date] || []

  const loadEvents = useCallback(async () => {
    const types = ['mood', 'food', 'water', 'exercise', 'sleep']
    const results = await Promise.all(types.map((t) => store.listEventsForDay(`${t}_event`, date)))
    const merged = []
    results.forEach((rows, i) => {
      for (const row of rows) merged.push({ ...row, _type: types[i] })
    })
    // Read-only: workouts logged in the Fitness app (Reps) for Mav.
    const fw = await store.listWorkoutsForDay(date)
    for (const row of fw) merged.push({ ...row, _type: 'workout' })
    merged.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
    setEvents(merged)
  }, [date])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function deleteEvent(ev) {
    if (ev._type === 'workout') return  // owned by the Fitness app; read-only here
    setEvents(prev => prev.filter(e => !(e.id === ev.id && e._type === ev._type)))
    await store.deleteEvent(ev.id)
  }

  // Delete every food row in a same-time block at once.
  async function deleteGroup(group) {
    setEvents(prev => prev.filter(e => !(e._type === 'food' && e.occurred_at === group.occurred_at)))
    await Promise.all(group.items.map(it => store.deleteEvent(it.id)))
  }

  // Retime a whole food block — applies one new time to every item in it.
  async function saveRetime(group) {
    const when = retiming?.when || group.occurred_at
    setRetiming(null)
    await Promise.all(group.items.map(it => store.updateEvent(it.id, when, {
      category: it.category, item: it.item, notes: it.notes ?? null,
    })))
    loadEvents()
  }

  // Foods logged together (same occurred_at) collapse into one block, so the
  // set can be retimed or removed in a single action.
  function groupForRender(list) {
    const out = []
    const byTime = {}
    for (const ev of list) {
      if (ev._type !== 'food') { out.push(ev); continue }
      const key = ev.occurred_at
      if (byTime[key]) { byTime[key].items.push(ev); continue }
      const g = { _type: 'food-group', id: `fg-${key}`, occurred_at: key, items: [ev] }
      byTime[key] = g
      out.push(g)
    }
    return out
  }

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function eventLabel(ev) {
    switch (ev._type) {
      case 'mood': return ev.mood + (ev.notes ? ` — ${ev.notes}` : '')
      case 'food': return `${ev.item || ev.category}`
      case 'water': return `${ev.amount_oz} oz water`
      case 'exercise': return `${ev.exercise_type}${ev.duration_minutes ? ` · ${ev.duration_minutes}m` : ''}`
      case 'workout': {
        const label = FITNESS_CATEGORY_LABEL[ev.category] || ev.category
        return `${label}${ev.duration_minutes ? ` · ${ev.duration_minutes}m` : ''}`
      }
      case 'sleep': return `${ev.hours}h sleep${ev.quality ? ` · ${ev.quality}/5` : ''}`
      default: return ev._type
    }
  }

  return (
    <>
      {/* Date nav */}
      <div className="date-nav">
        <button onClick={() => setDate(addDays(date, -1))}>‹</button>
        <span className="date-label">{isToday ? 'Today' : prettyDate(date)}</span>
        <button onClick={() => setDate(addDays(date, 1))} disabled={isToday} style={{ opacity: isToday ? 0.3 : 1 }}>›</button>
      </div>

      {/* Daily habits */}
      <div className="card">
        <div className="card-title">Daily Quests {isToday ? '' : '· (today only)'}</div>
        {DEFAULT_HABITS.map(h => {
          const done = dayDone.includes(h.id)
          const streak = habitStreaks[h.id] || 0
          return (
            <div
              key={h.id}
              className={'habit-row' + (done ? ' done' : '')}
              onClick={() => isToday && toggleHabit(h.id)}
              style={{ opacity: isToday ? 1 : 0.55, cursor: isToday ? 'pointer' : 'default' }}
            >
              <div className="habit-check">{done ? '✓' : ''}</div>
              <div className="habit-icon">{h.icon}</div>
              <div className="habit-text">
                <div className="habit-label">{h.label}</div>
                <div className="habit-hint">{h.hint} · <span className="habit-xp">+{h.xp} XP</span></div>
              </div>
              {streak > 0 && <div className="habit-streak">🔥 {streak}</div>}
            </div>
          )
        })}
      </div>

      {/* Quick-add events */}
      {isToday && (
        <div className="card">
          <div className="card-title">Inscribe a Deed</div>
          <div className="quick-grid">
            <button className="quick-btn" onClick={() => setSheet('mood')}><span className="qi">🔮</span>Spirit</button>
            <button className="quick-btn" onClick={() => setSheet('food')}><span className="qi">🍖</span>Feast</button>
            <button className="quick-btn cyan" onClick={() => setSheet('water')}><span className="qi">🧪</span>Draught</button>
            <button className="quick-btn phos" onClick={() => setSheet('exercise')}><span className="qi">⚔️</span>Trial</button>
            <button className="quick-btn" onClick={() => setSheet('sleep')}><span className="qi">🌙</span>Rest</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <div className="card-title">{isToday ? "Today's Chronicle" : 'Chronicle'}</div>
        {events.length === 0 ? (
          <div className="empty">The page is yet unwritten</div>
        ) : (
          groupForRender(events).map(ev => ev._type === 'food-group' ? (
            <div key={ev.id}>
              <div className="tl-item">
                <span className="tl-time num">{fmtTime(ev.occurred_at)}</span>
                <span className="tl-tag food">feast</span>
                <span className="tl-body">
                  {ev.items.length > 1
                    ? <span className="tl-foodlist">{ev.items.map(f => f.item || f.category).join(', ')}</span>
                    : (ev.items[0].item || ev.items[0].category)}
                </span>
                <button className="tl-edit" onClick={() => setRetiming(retiming?.id === ev.id ? null : { id: ev.id, when: ev.occurred_at })} aria-label="Retime this block">✎</button>
                <button className="tl-del" onClick={() => deleteGroup(ev)} aria-label={ev.items.length > 1 ? 'Delete all foods at this time' : 'Delete'}>×</button>
              </div>
              {retiming?.id === ev.id && (
                <div className="tl-retime">
                  <div className="tl-retime-label">Move this whole feast to a new time</div>
                  <TimePicker value={retiming.when} onChange={(w) => setRetiming({ id: ev.id, when: w })} />
                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <button className="btn ghost" style={{ flex: 1 }} onClick={() => setRetiming(null)}>Cancel</button>
                    <button className="btn" style={{ flex: 1 }} onClick={() => saveRetime(ev)}>Save time</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="tl-item" key={`${ev._type}-${ev.id}`}>
              <span className="tl-time num">{fmtTime(ev.occurred_at)}</span>
              <span className={`tl-tag ${ev._type}`}>{ev._type === 'workout' ? 'trial' : ev._type}</span>
              <span className="tl-body">{eventLabel(ev)}</span>
              {ev._type === 'workout'
                ? <span className="tl-src" title="Logged in the Fitness app">Reps</span>
                : <button className="tl-del" onClick={() => deleteEvent(ev)}>×</button>}
            </div>
          ))
        )}
      </div>

      {sheet && (
        <LogSheet
          kind={sheet}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); loadEvents() }}
          awardXp={awardXp}
          autoCheck={(habitId) => {
            // auto-tick the matching habit when an event implies it
            if (!dayDone.includes(habitId)) toggleHabit(habitId)
          }}
        />
      )}
    </>
  )
}

// ---- Logging bottom sheet ----
function LogSheet({ kind, onClose, onSaved, awardXp, autoCheck }) {
  const [when, setWhen] = useState(new Date().toISOString())
  const [saving, setSaving] = useState(false)

  // mood
  const [moods, setMoods] = useState([])
  // food
  const [cat, setCat] = useState(FOOD_CATEGORY_NAMES[0])
  const [foodBasket, setFoodBasket] = useState([])
  // water
  const [oz, setOz] = useState(16)
  // exercise
  const [exType, setExType] = useState(EXERCISE_TYPES[0])
  const [dur, setDur] = useState(30)
  // sleep
  const [hours, setHours] = useState(7)
  const [quality, setQuality] = useState(3)

  async function save() {
    setSaving(true)
    try {
      if (kind === 'mood') {
        if (!moods.length) { setSaving(false); return }
        const rows = moods.map(m => ({ occurred_at: when, mood: m }))
        await Promise.all(rows.map((r) => { const { occurred_at, ...p } = r; return store.addEvent('mood_event', occurred_at, p) }))
        awardXp(EVENT_XP.mood * moods.length, 'mood')
        autoCheck('mood')
      } else if (kind === 'food') {
        if (!foodBasket.length) { setSaving(false); return }
        const rows = foodBasket.map(f => ({
          occurred_at: when, category: f.cat, item: f.item,
          notes: f.fromMeal ? `from ${f.fromMeal}` : null,
        }))
        await Promise.all(rows.map((r) => { const { occurred_at, ...p } = r; return store.addEvent('food_event', occurred_at, p) }))
        awardXp(EVENT_XP.food * foodBasket.length, 'food')
      } else if (kind === 'water') {
        await store.addEvent('water_event', when, { amount_oz: oz })
        awardXp(EVENT_XP.water, 'water')
        if (oz >= 16) autoCheck('water')
      } else if (kind === 'exercise') {
        await store.addEvent('exercise_event', when, { exercise_type: exType, duration_minutes: dur })
        awardXp(EVENT_XP.exercise, 'workout')
        autoCheck('workout')
      } else if (kind === 'sleep') {
        await store.addEvent('sleep_event', when, { hours, quality })
        awardXp(EVENT_XP.sleep, 'sleep')
        if (hours >= 7) autoCheck('sleep')
      }
      onSaved()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const titles = { mood: 'Commune within', food: 'What did you feast upon?', water: 'Raise a draught', exercise: 'A trial of might', sleep: "An adventurer's rest" }

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet-inner" onClick={e => e.stopPropagation()}>
        <div className="sheet-title">{titles[kind]}</div>

        {kind === 'mood' && (
          <div className="pill-wrap" style={{ marginBottom: 14 }}>
            {MOODS.map(m => (
              <button key={m} className={'pill' + (moods.includes(m) ? ' sel' : '')}
                onClick={() => setMoods(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m])}>{m}</button>
            ))}
          </div>
        )}

        {kind === 'food' && (
          <>
            <div className="picker-label">Category</div>
            <div className="pill-wrap" style={{ marginBottom: 14 }}>
              <button
                className={'pill' + (cat === MEAL_PICKER ? ' sel' : '')}
                onClick={() => setCat(MEAL_PICKER)}
              >🍲 {MEAL_PICKER}</button>
              {FOOD_CATEGORY_NAMES.map(c => (
                <button key={c} className={'pill' + (cat === c ? ' sel' : '')} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
            {cat === MEAL_PICKER
              ? <MealAdder basket={foodBasket} setBasket={setFoodBasket} />
              : <FoodAdder cat={cat} basket={foodBasket} setBasket={setFoodBasket} />}
          </>
        )}

        {kind === 'water' && (
          <div className="pill-wrap" style={{ marginBottom: 14 }}>
            {WATER_OPTIONS.map(o => (
              <button key={o} className={'pill' + (oz === o ? ' sel' : '')} onClick={() => setOz(o)}>{o} oz</button>
            ))}
          </div>
        )}

        {kind === 'exercise' && (
          <>
            <div className="pill-wrap" style={{ marginBottom: 12 }}>
              {EXERCISE_TYPES.map(t => (
                <button key={t} className={'pill' + (exType === t ? ' sel' : '')} onClick={() => setExType(t)}>{t}</button>
              ))}
            </div>
            <div className="row" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Duration</span>
              <input type="range" min="5" max="180" step="5" value={dur} onChange={e => setDur(+e.target.value)} style={{ flex: 1 }} />
              <span className="num" style={{ width: 48, textAlign: 'right' }}>{dur}m</span>
            </div>
          </>
        )}

        {kind === 'sleep' && (
          <>
            <div className="row" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', width: 60 }}>Hours</span>
              <input type="range" min="3" max="12" step="0.5" value={hours} onChange={e => setHours(+e.target.value)} style={{ flex: 1 }} />
              <span className="num" style={{ width: 48, textAlign: 'right' }}>{hours}h</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>Quality</div>
              <div className="scale">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={'scale-dot' + (quality === n ? ' sel' : '')} onClick={() => setQuality(n)}>{n}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>When</div>
          <TimePicker value={when} onChange={setWhen} />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn" style={{ flex: 2 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// Food basket: tap preset items to add (like Ren's Journal), or type a custom one.
function FoodAdder({ cat, basket, setBasket }) {
  const [item, setItem] = useState('')
  const presets = FOOD_CATEGORIES[cat] || []

  function addItem(name) {
    const v = name.trim()
    if (!v) return
    setBasket(prev => {
      // avoid duplicate of same item+category in the basket
      if (prev.some(b => b.cat === cat && b.item.toLowerCase() === v.toLowerCase())) return prev
      return [...prev, { cat, item: v }]
    })
  }
  function addCustom() {
    addItem(item)
    setItem('')
  }

  function inBasket(name) {
    return basket.some(b => b.cat === cat && b.item.toLowerCase() === name.toLowerCase())
  }
  function toggle(name) {
    if (inBasket(name)) {
      setBasket(prev => prev.filter(b => !(b.cat === cat && b.item.toLowerCase() === name.toLowerCase())))
    } else {
      addItem(name)
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Inset drawer: the chosen category's items, clearly bounded */}
      <div className="food-drawer">
        <div className="food-drawer-head">
          <span className="food-drawer-title">{cat}</span>
          <span className="food-drawer-hint">tap to add</span>
        </div>
        <div className="pill-wrap" style={{ marginBottom: 12 }}>
          {presets.map(name => (
            <button key={name} className={'pill' + (inBasket(name) ? ' sel' : '')} onClick={() => toggle(name)}>
              {name}
            </button>
          ))}
        </div>

        {/* Free-text fallback, inside the drawer */}
        <div className="row">
          <input
            value={item}
            onChange={e => setItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder={`Other ${cat.toLowerCase()}…`}
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--line)' }}
          />
          <button className="btn ghost" onClick={addCustom}>+ Add</button>
        </div>
      </div>

      {/* Basket: everything queued to save, across all categories */}
      {basket.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="picker-label">Adding {basket.length}</div>
          <div className="pill-wrap">
            {basket.map((b, i) => (
              <button key={i} className="pill sel" onClick={() => setBasket(prev => prev.filter((_, j) => j !== i))}>
                {b.item} ×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Meal picker: lists recipes from the Pantry app. Tapping a meal drops all its
// ingredients into the food basket (each categorized, tagged with the meal).
function MealAdder({ basket, setBasket }) {
  const [recipes, setRecipes] = useState(null)  // null = loading
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    store.listRecipes()
      .then((data) => { if (alive) setRecipes(data || []) })
      .catch((e) => { if (alive) { setError(e.message); setRecipes([]) } })
    return () => { alive = false }
  }, [])

  const addedMeals = [...new Set(basket.filter(b => b.fromMeal).map(b => b.fromMeal))]
  const looseItems = basket.filter(b => !b.fromMeal)

  function addMeal(r) {
    const ings = Array.isArray(r.ingredients) ? r.ingredients : []
    setBasket(prev => {
      const next = [...prev]
      for (const ing of ings) {
        const item = (ing?.name || '').trim()
        if (!item) continue
        const c = categorizeIngredient(item)
        if (next.some(b => b.cat === c && b.item.toLowerCase() === item.toLowerCase())) continue
        next.push({ cat: c, item, fromMeal: r.name })
      }
      return next
    })
  }
  function removeMeal(name) {
    setBasket(prev => prev.filter(b => b.fromMeal !== name))
  }

  const filtered = (recipes || []).filter(r => r.name?.toLowerCase().includes(q.toLowerCase().trim()))

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="food-drawer">
        <input
          className="meal-search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search meals…"
        />
        {recipes === null && <div className="meal-empty">Loading meals…</div>}
        {error && <div className="meal-empty">Couldn’t load meals — {error}</div>}
        {recipes !== null && !error && filtered.length === 0 && (
          <div className="meal-empty">{q ? 'No meals match.' : 'No recipes in the Pantry app yet.'}</div>
        )}
        <div className="meal-list">
          {filtered.map(r => {
            const count = Array.isArray(r.ingredients) ? r.ingredients.filter(i => i?.name).length : 0
            const added = addedMeals.includes(r.name)
            return (
              <button
                key={r.id}
                className={'meal-row' + (added ? ' added' : '')}
                onClick={() => added ? removeMeal(r.name) : addMeal(r)}
                disabled={!added && count === 0}
              >
                <span className="meal-row-main">
                  <span className="meal-row-name">{r.name}</span>
                  <span className="meal-row-sub">{count} ingredient{count === 1 ? '' : 's'}{count === 0 ? ' (none listed)' : ''}</span>
                </span>
                <span className="meal-row-action">{added ? 'Added ✓' : '+ Add'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Basket grouped: meals first, then loose items */}
      {basket.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="picker-label">Adding {basket.length}</div>
          {addedMeals.map(name => (
            <div key={name} className="meal-basket-group">
              <div className="meal-basket-head">
                <span className="meal-basket-name">🍲 {name}</span>
                <button className="meal-basket-remove" onClick={() => removeMeal(name)}>remove ×</button>
              </div>
              <div className="pill-wrap">
                {basket.filter(b => b.fromMeal === name).map((b, i) => (
                  <button key={i} className="pill sel"
                    onClick={() => setBasket(prev => prev.filter(x => x !== b))}>
                    {b.item} ×
                  </button>
                ))}
              </div>
            </div>
          ))}
          {looseItems.length > 0 && (
            <div className="pill-wrap" style={{ marginTop: addedMeals.length ? 10 : 0 }}>
              {looseItems.map((b, i) => (
                <button key={i} className="pill sel"
                  onClick={() => setBasket(prev => prev.filter(x => x !== b))}>
                  {b.item} ×
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .meal-search {
          width: 100%; padding: 10px 12px; border-radius: 8px;
          background: var(--bg); color: var(--text);
          border: 1px solid var(--border); margin-bottom: 10px; font-size: 14px;
        }
        .meal-list { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
        .meal-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px;
          background: var(--bg); border: 1px solid var(--border); color: var(--text);
        }
        .meal-row:disabled { opacity: .5; }
        .meal-row.added { border-color: var(--app-accent); }
        .meal-row-main { display: flex; flex-direction: column; gap: 2px; }
        .meal-row-name { font-weight: 600; font-size: 14px; }
        .meal-row-sub { font-size: 12px; color: var(--text-soft); }
        .meal-row-action { font-size: 13px; font-weight: 600; color: var(--app-accent); white-space: nowrap; }
        .meal-empty { padding: 12px; text-align: center; color: var(--text-soft); font-size: 13px; }
        .meal-basket-group { margin-bottom: 8px; }
        .meal-basket-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .meal-basket-name { font-size: 13px; font-weight: 600; color: var(--app-accent); }
        .meal-basket-remove { font-size: 12px; color: var(--text-soft); }
        .meal-basket-remove:hover { color: var(--danger); }
      `}</style>
    </div>
  )
}
