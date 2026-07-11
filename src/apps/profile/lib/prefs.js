// Member-scoped personal preferences.
// { app:'profile', type:'pref', data:{ member, key, value } }
// One record per (member, key) — upserted, never duplicated.
import * as db from '../../../lib/data'

const APP = 'profile'
const TYPE = 'pref'

export async function loadPrefs(member) {
  const rows = await db.list({ app: APP, type: TYPE })
  const mine = rows.filter((r) => r.data.member === member)
  const map = {}
  mine.forEach((r) => { map[r.data.key] = r.data.value })
  return { rows: mine, prefs: map }
}

export async function setPref(member, key, value, existingRows = []) {
  const existing = existingRows.find((r) => r.data.member === member && r.data.key === key)
  if (existing) {
    await db.update(existing.id, { data: { member, key, value } })
  } else {
    await db.create({ app: APP, type: TYPE, data: { member, key, value } })
  }
}
