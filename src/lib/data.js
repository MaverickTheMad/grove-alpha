// ── Seam 1 (GROVE-ALPHA-BUILD-GUIDE §4.3, §5) ───────────────────────
// The ONLY module that touches Supabase. Every tab calls this, never
// supabase.from() directly. Encryption (crypto.js) and tenancy (identity.js)
// land here, so beta adds row scoping + real crypto with zero call-site changes.
//
// If any tab bypasses this (calls supabase directly, assumes one household),
// beta becomes a hunt-and-patch. Treat it as the law (§5).

import { supabase } from '../supabase'
import { encrypt, decrypt } from './crypto'
import { householdId } from './identity'
import { localDayBounds } from './time'

const TABLE = 'records'

// row (DB shape) -> app-facing record with a decrypted `data` object
function decodeRow(row) {
  return {
    id: row.id,
    app: row.app,
    type: row.type,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: decrypt(row.payload, row.enc),
  }
}

// List DECRYPTED records, newest first.
// { app, type, from, to } — type may be a string or array of types.
// from/to are local YYYY-MM-DD; converted to a UTC occurred_at range.
export async function list({ app, type, from, to } = {}) {
  let q = supabase
    .from(TABLE)
    .select('*')
    .eq('household_id', householdId())
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })

  if (app) q = q.eq('app', app)
  if (type) q = Array.isArray(type) ? q.in('type', type) : q.eq('type', type)
  // from/to may be a bare local day (YYYY-MM-DD) or an already-resolved ISO
  // timestamp. Convert the former via localDayBounds; pass the latter straight
  // through (callers like the journal store pre-compute day/range bounds).
  if (from) q = q.gte('occurred_at', from.includes('T') ? from : localDayBounds(from).startISO)
  if (to) q = q.lte('occurred_at', to.includes('T') ? to : localDayBounds(to).endISO)

  const { data, error } = await q
  if (error) throw error
  return data.map(decodeRow)
}

export async function get(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (error) throw error
  return decodeRow(data)
}

// create({ app, type, occurredAt, data }) — data is the plaintext object.
export async function create({ app, type, occurredAt, data }) {
  const { payload, enc } = encrypt(data)
  const row = {
    household_id: householdId(),
    app,
    type,
    occurred_at: occurredAt ?? new Date().toISOString(),
    payload,
    enc,
  }
  const { data: inserted, error } = await supabase.from(TABLE).insert(row).select().single()
  if (error) throw error
  return decodeRow(inserted)
}

export async function update(id, { data, occurredAt } = {}) {
  const patch = { updated_at: new Date().toISOString() }
  if (data !== undefined) {
    const { payload, enc } = encrypt(data)
    patch.payload = payload
    patch.enc = enc
  }
  if (occurredAt !== undefined) patch.occurred_at = occurredAt
  const { data: updated, error } = await supabase.from(TABLE).update(patch).eq('id', id).select().single()
  if (error) throw error
  return decodeRow(updated)
}

// Soft delete (sets deleted_at) so an undo toast can revive it (UI-POLISH §4).
export async function remove(id) {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Revive a soft-deleted record (powers the "Undo" toast).
export async function restore(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return decodeRow(data)
}

// Realtime: subscribe to ciphertext, decrypt on receipt, filter by app/type
// client-side. Returns an unsubscribe fn. (Beta: unchanged — still ciphertext.)
export function subscribe({ app, type } = {}, onChange) {
  const channel = supabase
    .channel(`grove:${app ?? 'all'}:${type ?? 'all'}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'grove', table: TABLE }, (payload) => {
      const row = payload.new ?? payload.old
      if (!row) return
      if (app && row.app !== app) return
      if (type) {
        const wanted = Array.isArray(type) ? type : [type]
        if (!wanted.includes(row.type)) return
      }
      onChange({
        event: payload.eventType, // INSERT | UPDATE | DELETE
        id: row.id,
        record: payload.new ? decodeRow(payload.new) : null,
      })
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export default { list, get, create, update, remove, restore, subscribe }
