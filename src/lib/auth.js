// ── Auth (alpha) ────────────────────────────────────────────────────
// Username/password login via Supabase Auth. There is no Cloudflare gate —
// this login IS the wall, backed by authenticated-only RLS on grove.records.
//
// Supabase Auth is email-based, so a username maps to a synthetic email
// (`<username>@<domain>`). No real mail delivery is needed: accounts are
// pre-seeded confirmed via scripts/seed-users.js (admin). Password hashing,
// sessions, and refresh are handled by Supabase — we never store passwords.
//
// Beta: same surface, plus self-service sign-up (config.signupEnabled) and a
// passphrase that also derives the E2EE KEK (crypto.js §3.3).

import { supabase } from '../supabase'
import { setSession } from './identity'

const DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'grove.reilly.live'

export function usernameToEmail(username) {
  return `${String(username).trim().toLowerCase()}@${DOMAIN}`
}

export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
  if (error) throw error
  setSession(data.session)
  return data.session
}

export async function signOut() {
  await supabase.auth.signOut()
  setSession(null)
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  setSession(data.session)
  return data.session
}

// Change password: re-verify current password, then update.
export async function changePassword(username, current, next) {
  await signIn(username, current)   // throws if current pw is wrong
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) throw error
}

// Fires on login / logout / token refresh. Returns an unsubscribe fn.
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
    cb(session)
  })
  return () => data.subscription.unsubscribe()
}
