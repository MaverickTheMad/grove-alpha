// Almanac's own events (the calendar items the user adds). Everything else on the
// timeline is read from other apps via lib/timeline.js.
import * as db from '../../../lib/data'
const APP = 'almanac'

export async function addEvent({ title, event_date, event_time = null, kind = 'family', notes = null }) {
  await db.create({
    app: APP, type: 'event',
    occurredAt: event_time || `${event_date}T12:00:00Z`,
    data: { title, event_date, event_time, kind, notes },
  })
}
export async function updateEvent(id, patch) {
  let cur = {}
  try { const r = await db.get(id); cur = r?.data || {} } catch { /* gone */ }
  await db.update(id, { data: { ...cur, ...patch } })
}
export async function deleteEvent(id) { await db.remove(id) }
