# Grove — alpha

The five `*.reilly.live` apps merged into **one** Vite app, rebranded as Grove,
pointed at the existing `reilly-home` Supabase project. Access is gated by a
built-in **username/password login** (Supabase Auth) — no Cloudflare Access.
Used by Ren + Mav with no loss of function.

It's built on a **privacy-first data layer** (one encrypted-blob table, all logic
client-side) so beta is a config flip — fresh Supabase project + turn encryption
on + open sign-up + key-management UI — **not a rewrite**.

- Repo: `github.com/MaverickTheMad/grove-alpha` (branch `main`)
- Subdomain: `alpha.reilly.live`
- Stack: React 18 + Vite · Supabase (`grove` schema + Auth) · Vercel
- Fonts: Fraunces + Plus Jakarta Sans + JetBrains Mono (self-hosted, SIL OFL)

## Run locally

```bash
npm install
cp .env.example .env      # fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

## Environment variables

Set in `.env` (gitignored) **and** the Vercel dashboard:

```
VITE_SUPABASE_URL        = https://ceomcgjbizynplactgiq.supabase.co   # reilly-home
VITE_SUPABASE_ANON_KEY   = <anon PUBLIC key — NEVER service_role>
VITE_MODE                = alpha
VITE_AUTH_EMAIL_DOMAIN   = grove.reilly.live                          # optional
```

## Accounts (username/password)

Access is a built-in login, not Cloudflare. Auth runs on Supabase Auth, which
is email-based, so each username maps to a synthetic email
(`<username>@grove.reilly.live`) — no real mail delivery needed. Alpha has **no
open sign-up**; the two accounts are pre-seeded once with the admin API:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
AUTH_EMAIL_DOMAIN=grove.reilly.live \
REN_PASSWORD='…' MAV_PASSWORD='…' \
npm run seed
```

Then sign in with the **username** (`ren` / `mav`), not the email. The script is
idempotent (re-running resets passwords). In Supabase → Authentication, the
Email provider must be enabled (default); SMTP is not required because accounts
are created already-confirmed. Passwords are hashed and sessions managed by
Supabase — the app never stores credentials.

## Database

Run `schema.sql` once in the reilly-home SQL Editor, then add `grove` under
Supabase → Settings → API → **Exposed schemas**. The legacy per-app schemas are
left untouched so the old subdomains keep working during the port.

RLS requires both a valid session **and** an admin-set `household_id` tag that
only the seed script applies. The public anon key in the bundle therefore reads
nothing, and a self-registered stranger can't read anything either (no tag).

Verify the wall is up after running the schema:

```sql
select relrowsecurity from pg_class where relname = 'records';      -- expect: t
select policyname, roles from pg_policies where tablename = 'records';
-- expect ONE policy: household_only, for {authenticated}. No anon policy.
```

Belt-and-suspenders: in Supabase → Authentication → Sign In / Providers, turn
**off** "Allow new users to sign up." Alpha accounts are admin-seeded, so public
sign-up should never be open. (The RLS tag already blocks self-registered users
from data; disabling sign-up stops the accounts existing at all.)

## Deploy

1. Push to `MaverickTheMad/grove-alpha` `main` → Vercel auto-deploys.
2. Set the four `VITE_*` env vars in the Vercel project.
3. DNS: CNAME `alpha.reilly.live` → Vercel (Cloudflare DNS, proxied is fine).
4. Run `npm run seed` once to create the Ren + Mav accounts.

No Cloudflare Access app is needed — the deployment is publicly reachable, but
the login screen plus authenticated-only RLS is the wall. (The anon key in the
bundle is public by design and grants no row access without a session.)

## Architecture — the four seams

Everything that differs between alpha and beta lives behind four files. No code
outside these branches on mode. Filling them = beta.

| Seam | File | Alpha | Beta |
|---|---|---|---|
| 1 Data | `src/lib/data.js` | only Supabase caller; CRUD + realtime on `grove.records` | add household-scoped row filtering |
| 2 Crypto | `src/lib/crypto.js` | **passthrough** (plaintext JSON, `enc=false`) | AES-256-GCM, Argon2id KEK, recovery key |
| 3 Identity | `src/lib/identity.js` | **active** — derived from the Supabase Auth session; one shared household | derive `household_id` from session app_metadata |
| 4 Config | `src/config.js` | `authEnabled` on, `signupEnabled`/`cryptoEnabled` off | flip to `beta` |

Auth lives in `src/lib/auth.js` (username→email mapping, sign in/out, session)
and `src/components/AuthGate.jsx` (splash → login → app). Everything else that
differs between alpha and beta still lives behind the four seams.

Every record is plaintext routing metadata (`app`, `type`, `occurred_at`, …) plus
one `payload` blob. Tabs **never** call `supabase` directly — only `lib/data.js`.

## Layout

```
src/
├── App.jsx            shell: launcher + path routing + theme
├── config.js          seam 4
├── supabase.js        client (db.schema = grove)
├── lib/               data · crypto · identity · auth · time · money (one copy each)
├── components/        AuthGate · Login · Launcher · AppShell · BottomNav · Sheet · TimePicker · SetupScreen · Toast · Icon · GroveMark
└── apps/
    ├── journal/       ✅ reference app, wired end-to-end through data.js
    ├── pantry/        ✅ ported — tabs + records data layer + URL/PDF import
    ├── ledger/        ⬚ scaffold — port target
    ├── pets/          ⬚ scaffold — port target
    ├── quest/         ⬚ scaffold — port target
    ├── almanac/       ⬚ scaffold — port target (aggregates the others)
    ├── fitness/       ⬚ scaffold — port target
    └── media/         ⬚ scaffold — port target
```

### Pantry extras (one-time setup)
- Run `node scripts/migrate-pantry.js` (service-role env) to bring the live
  `family-shopping-app` data into `grove.records`.
- For PDF recipe import: create a **public** Supabase Storage bucket named
  `recipe-pdfs` (allow insert + select).
- URL recipe import uses the `api/import-recipe.js` Vercel function (no secrets);
  `vercel.json` already excludes `/api/*` from the SPA rewrite.

## What's built vs. what ports next

**Built and runnable now:** the shell, launcher, theme system, the full Grove
design system (BRAND-GUIDE §5 tokens, self-hosted fonts, leaf mark + icons), all
four seams, the `grove.records` schema, the realtime data layer, PWA manifest,
and **Ren's Journal** as a working reference app (Log / Trends / Cycle) reading
and writing real records through `data.js`.

**Ports from the real repos** (the summaries are a spec, but exact logic must
come from source — guide §13 #5): Pantry's fuzzy ingredient merge + quantity
math + PDF/URL import; Ledger's dual pay-cycles + Chase PDF parser + snowball;
Journal's exact food→flare lift + the SVG cycle-ring; Pets + Media.

### Port order (BRAND-GUIDE §11 / guide §9)
shell → Pantry → Ledger → Journal → Pets/Media. Per app: move tabs +
`constants.js` into `src/apps/<name>/`, rewire all data access to `lib/data.js`,
run `scripts/migrate-<app>.js`, reskin to Grove tokens, apply the UI-POLISH
punch-list, swap in the shell, smoke-test, then retire the subdomain.

## Going to beta

See guide §11. Auth already exists, so beta adds: open sign-up, the passphrase
that also derives the E2EE KEK (`crypto.js` §3.3), `household_id` pulled from the
session's app_metadata, and RLS tightened from authenticated-only to
household-scoped. Nothing there touches a call site outside the four seams.
