// People bridge. The budget app read shared people from the `core` schema
// (core.getPeople), where each person carried a primary_paycheck_id that
// anchors their pay cycle. In merged Grove, the people ARE the household
// members (identity.members()), and the per-member primary_paycheck_id lives in
// a `person_settings` record. This module reassembles the old shape so the
// pay-cycle math (resolvePersonAnchor) keeps working unchanged.

import { members } from '../../../lib/identity'
import * as db from '../../../lib/data'
import { APP, TYPES } from '../constants'

// [{ id, name, color, primary_paycheck_id, _settingsId }]
export async function loadPeople() {
  const recs = await db.list({ app: APP, type: TYPES.personSettings })
  const byPerson = {}
  recs.forEach((r) => { if (r.data?.person_id) byPerson[r.data.person_id] = r })
  return members().map((m) => ({
    id: m.id,
    name: m.name,
    color: m.color,
    primary_paycheck_id: byPerson[m.id]?.data?.primary_paycheck_id || null,
    _settingsId: byPerson[m.id]?.id || null,
  }))
}

export async function setPrimaryPaycheck(personId, paycheckId) {
  const recs = await db.list({ app: APP, type: TYPES.personSettings })
  const existing = recs.find((r) => r.data?.person_id === personId)
  const data = { person_id: personId, primary_paycheck_id: paycheckId }
  if (existing) await db.update(existing.id, { data })
  else await db.create({ app: APP, type: TYPES.personSettings, data })
}
