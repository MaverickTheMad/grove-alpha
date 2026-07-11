// Quest data layer — quests (type: 'quest') + game state (type: 'game_state').
// All Supabase access goes through src/lib/data.js per the data seam rule.
import * as db from '../../../lib/data'

const APP = 'quest'
const QUEST      = 'quest'
const GAME_STATE = 'game_state'

// ── Quests ─────────────────────────────────────────────────────────────────────
// payload: { title, difficulty, xp_reward, due, category, notes, completed_at }
// completed_at = null → active;  set → completed
const questFrom = (r) => ({ id: r.id, createdAt: r.createdAt, ...r.data })

export async function listAllQuests() {
  const rows = await db.list({ app: APP, type: QUEST })
  return rows.map(questFrom)
}

export async function createQuest({ title, difficulty, xp_reward, due, category, notes, assignee }) {
  const rec = await db.create({
    app: APP,
    type: QUEST,
    data: { title, difficulty, xp_reward: xp_reward ?? 10, due: due || null, category: category || null, notes: notes || null, completed_at: null, assignee: assignee ?? null },
  })
  return questFrom(rec)
}

export async function updateQuest(id, patch) {
  const rows = await db.list({ app: APP, type: QUEST })
  const r = rows.find((x) => x.id === id)
  if (!r) return
  const rec = await db.update(id, { data: { ...r.data, ...patch } })
  return questFrom(rec)
}

export async function completeQuest(id, { completed_by, ...fields }) {
  const rec = await db.update(id, { data: { ...fields, completed_at: new Date().toISOString(), completed_by: completed_by ?? null } })
  return questFrom(rec)
}

export async function deleteQuest(id)  { await db.remove(id) }
export async function restoreQuest(id) { await db.restore(id) }

// ── Game state (single record per household) ───────────────────────────────────
export async function getGameState() {
  const rows = await db.list({ app: APP, type: GAME_STATE })
  const r = rows[0]
  return r ? { recordId: r.id, ...r.data } : null
}
export async function ensureGameState() {
  const existing = await getGameState()
  if (existing) return existing
  const rec = await db.create({ app: APP, type: GAME_STATE, data: { total_xp: 0 } })
  return { recordId: rec.id, ...rec.data }
}
export async function updateGameState(patch) {
  const rows = await db.list({ app: APP, type: GAME_STATE })
  const r = rows[0]
  if (!r) return
  await db.update(r.id, { data: { ...r.data, ...patch } })
}
