// ── Seam 3 (GROVE-ALPHA-BUILD-GUIDE §5) ─────────────────────────────
// Identity now derives from the Supabase Auth session (auth is on in alpha).
// The auth layer (lib/auth.js) pushes the session here via setSession(); data.js
// reads householdId() for tenancy and the UI reads currentUser()/members().
//
// Alpha tenancy is still a single shared household (Ren + Mav decrypt the same
// records — that is the shared-vault model). Beta derives household_id from the
// session's app_metadata and tightens RLS to match.

const ALPHA_HOUSEHOLD = '00000000-0000-0000-0000-000000000001'

// Fixed member colors — consistent across all app contexts (no CSS-var indirection).
// Berry for Ren (matches journal accent), Dusk for Mav (matches --info).
const MEMBER_COLOR = { ren: '#D06A82', mav: '#6F86C2' }

const ALPHA_MEMBERS = [
  { id: 'mav', name: 'Mav', color: '#6F86C2' },
  { id: 'ren', name: 'Ren', color: '#D06A82' },
]

// Set by lib/auth.js whenever the session changes (login / logout / refresh).
let _session = null
export function setSession(session) {
  _session = session
}

export function householdId() {
  // alpha: one shared household. beta: _session.user.app_metadata.household_id
  return ALPHA_HOUSEHOLD
}

export function currentUser() {
  const u = _session?.user
  if (!u) return null
  const m = u.user_metadata || {}
  const id = m.member_id || 'mav'
  return {
    id,
    name: m.name || m.username || 'Member',
    username: m.username || null,
    color: MEMBER_COLOR[id] || 'var(--info)',
    created_at: u.created_at || null,
  }
}

export function members() {
  return ALPHA_MEMBERS
}
