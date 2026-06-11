// Grove · Pets data layer on grove.records. All tables are uuid-keyed with a
// pet_id (resolved client-side). Pet photos + documents live in the shared
// `pet-docs` Storage bucket; records hold the resulting public URLs.

import * as db from '../../../lib/data'
import { supabase } from '../../../supabase'

const APP = 'pets'
export const DOCS_BUCKET = 'pet-docs'

const rowFrom = (r) => ({ id: r.id, ...r.data })

function sortRows(rows, sortKey, asc = true) {
  if (!sortKey) return rows
  return [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    const ae = av == null || av === '', be = bv == null || bv === ''
    if (ae && be) return 0
    if (ae) return 1            // empties always last
    if (be) return -1
    if (av === bv) return 0
    return asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })
}

async function currentData(id) {
  try { const r = await db.get(id); return r ? r.data : {} } catch { return {} }
}

// ── Pets ──────────────────────────────────────────────────────────────────────
export async function listPets() {
  const rows = await db.list({ app: APP, type: 'pet' })
  return rowsByName(rows.map(rowFrom).filter((p) => !p.archived))
}
function rowsByName(arr) {
  return arr.sort((a, b) => (a.created_at || a.name || '').localeCompare(b.created_at || b.name || ''))
}
export async function addPet(payload) {
  const rec = await db.create({ app: APP, type: 'pet', data: payload })
  return rowFrom(rec)
}
export async function updatePet(id, patch) {
  const cur = await currentData(id)
  await db.update(id, { data: { ...cur, ...patch } })
}
export async function archivePet(id) { await updatePet(id, { archived: true }) }

// ── Generic per-type access (vaccinations, meds, conditions, visits, weights) ──
export async function listByPet(type, petId, sortKey, asc = true) {
  const rows = (await db.list({ app: APP, type })).map(rowFrom).filter((r) => r.pet_id === petId)
  return sortRows(rows, sortKey, asc)
}
export async function listAll(type, sortKey, asc = true) {
  const rows = (await db.list({ app: APP, type })).map(rowFrom)
  return sortRows(rows, sortKey, asc)
}
export async function add(type, payload) {
  const rec = await db.create({ app: APP, type, data: payload })
  return rowFrom(rec)
}
export async function update(id, patch) {
  const cur = await currentData(id)
  await db.update(id, { data: { ...cur, ...patch } })
}
export async function remove(id) { await db.remove(id) }
export async function getOne(id) { try { const r = await db.get(id); return r ? rowFrom(r) : null } catch { return null } }

// ── Storage (pet-docs bucket) ─────────────────────────────────────────────────
export async function uploadFile(path, file, opts = {}) {
  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, opts)
  if (error) throw error
  const { data } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
