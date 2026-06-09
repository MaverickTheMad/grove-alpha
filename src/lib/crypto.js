// ── Seam 2 (GROVE-ALPHA-BUILD-GUIDE §3.3, §5) ───────────────────────
// Alpha: PASSTHROUGH. payload is stored as plaintext JSON, enc=false.
// Beta: real E2EE — AES-256-GCM via SubtleCrypto, household data key wrapped
// per member with an Argon2id/PBKDF2-derived KEK, plus a recovery key.
//
// data.js is the ONLY caller. Keep this the only place ciphers live, so beta
// is a fill-in here with zero call-site changes.

import { cryptoEnabled } from '../config'

// Returns { payload, enc } to store on the record.
export function encrypt(obj) {
  if (!cryptoEnabled) {
    // passthrough: jsonb column stores the object directly
    return { payload: obj ?? {}, enc: false }
  }
  // BETA: payload = { iv, ct } with AES-256-GCM (random 96-bit IV per record)
  throw new Error('crypto.encrypt: real E2EE not wired in alpha (see §3.3)')
}

// Given a stored payload + its enc flag, return the decrypted object.
export function decrypt(payload, enc) {
  if (!enc) return payload ?? {}
  // BETA: AES-256-GCM decrypt of { iv, ct } with the household data key
  throw new Error('crypto.decrypt: encrypted payload but crypto disabled (see §3.3)')
}

// ── Beta key-management surface (stubs — fill in beta) ──────────────
// passphrase -> Argon2id (preferred) / PBKDF2-SHA256 (fallback) -> KEK
export async function deriveKEK(/* passphrase, salt */) {
  throw new Error('beta: deriveKEK not implemented')
}
// wrap/unwrap the shared 256-bit household data key per member KEK
export async function wrapDataKey(/* dataKey, kek */) {
  throw new Error('beta: wrapDataKey not implemented')
}
export async function unwrapDataKey(/* wrapped, kek */) {
  throw new Error('beta: unwrapDataKey not implemented')
}
// one-time recovery key generated at setup — forgotten passphrase = data loss without it
export function generateRecoveryKey() {
  throw new Error('beta: generateRecoveryKey not implemented')
}
