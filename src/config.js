// ── Seam 4 (GROVE-ALPHA-BUILD-GUIDE §5) ─────────────────────────────
// One switch governs every alpha→beta behavior difference. No call site
// outside the four seams should branch on mode directly — read these flags.

const MODE = import.meta.env.VITE_MODE ?? 'alpha'
const isBeta = MODE === 'beta'

export const mode = MODE

// Auth is ON in alpha too: the app's own username/password login is the wall
// (we are NOT using Cloudflare Access). Beta keeps auth and adds household-scoped
// RLS + key management. Identity is derived from the Supabase Auth session.
export const authEnabled = true

// Crypto: alpha stores plaintext JSON (passthrough). Beta flips to real E2EE.
export const cryptoEnabled = isBeta

// In-app account creation: alpha is pre-seeded (Ren + Mav) with no open signup.
// Beta opens self-service sign-up for outside testers.
export const signupEnabled = isBeta

// Which apps the launcher exposes. Alpha shows all eight; beta restricts to the
// polished set (expand as each is hardened).
export const exposedApps = isBeta
  ? ['journal', 'pantry', 'ledger']
  : ['journal', 'pantry', 'ledger', 'pets', 'quest', 'almanac', 'fitness', 'settings']

export default { mode, authEnabled, cryptoEnabled, signupEnabled, exposedApps }
