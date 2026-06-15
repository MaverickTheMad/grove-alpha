# Grove — Alpha

The five `*.reilly.live` household tools merged into one app.

> **This is the alpha.** Ren and Mav are the testers. Auth is on (username +
> password), crypto is passthrough (plaintext JSON), and all five apps are
> exposed. See [Alpha → Beta](#alpha--beta) for what flips when outside testers
> join.

---

## What's in here

| App | Route | What it does |
|---|---|---|
| **Journal** | `/journal` | Ren's cycle, symptom, and food tracker |
| **Pantry** | `/pantry` | Meal planning + shopping list for Mav and Ren |
| **Ledger** | `/ledger` | Household budget, bills, transactions, snowball |
| **Pets** | `/pets` | Vet records, reminders, and docs for the pets |
| **Quest** | `/quest` | Habit + quest tracker |
| **Almanac** | `/almanac` | Unified calendar with Google Calendar sync |
| **Fitness** | `/fitness` | Workout logging (Ren / Reps) |
| **Settings** | `/settings` | Accounts and app config |

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Database | Supabase (Postgres), `grove` schema on the `reilly-home` project |
| Hosting | Vercel (auto-deploy from `main`) |
| Fonts | Fraunces (headings) · Plus Jakarta Sans (body) · JetBrains Mono (numbers) |
| Icons | Single `src/components/Icon.jsx` — never forked |

---

## Running locally

```bash
cp .env.example .env      # fill in the two VITE_ vars (see below)
npm install
npm run dev               # http://localhost:5173
```

Log in as `mav` or `ren` at `<username>@grove.reilly.live` using the
passwords set during seeding. See [Seeding accounts](#seeding-accounts).

Build for production:

```bash
npm run build
npm run preview           # preview the production build locally
```

---

## Environment variables

All vars live in `.env` locally and in the Vercel project dashboard for
production. `.env` is gitignored — never commit it.

```
# .env  (copy from .env.example)

VITE_SUPABASE_URL=https://ceomcgjbizynplactgiq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # anon PUBLIC key — NEVER service_role

VITE_MODE=alpha                  # alpha | beta (governs the four seams)
VITE_AUTH_EMAIL_DOMAIN=grove.reilly.live

# Google Calendar ICS proxy — server-side only, no VITE_ prefix.
# Set in Vercel: Settings → Environment Variables
GCAL_ICS_URL=https://calendar.google.com/calendar/ical/...
```

> **Key safety:** `VITE_SUPABASE_ANON_KEY` is the anon/public key from
> Supabase → Settings → API. Using the `service_role` secret in a browser
> build throws "Forbidden use of secret API key" and is a real credential leak.

### Seeding accounts

Alpha has no open sign-up. Create the Ren + Mav accounts once with the admin
API (uses the service-role key — server/CLI only, never the browser bundle):

```bash
SUPABASE_URL=https://...supabase.co \
SUPABASE_SERVICE_KEY=eyJ...         \
AUTH_EMAIL_DOMAIN=grove.reilly.live \
REN_PASSWORD='...' MAV_PASSWORD='..' \
node scripts/seed-users.js
```

Idempotent — safe to re-run (resets passwords rather than duplicating users).

---

## Architecture

### Database

One `grove` schema on the shared `reilly-home` Supabase project. All data
lives in a **single table**:

```sql
grove.records (
  id           uuid  primary key,
  household_id uuid,          -- tenancy (alpha: one constant)
  app          text,          -- 'journal' | 'pantry' | 'ledger' | ...
  type         text,          -- 'symptom_event' | 'transaction' | 'recipe' | ...
  occurred_at  timestamptz,   -- plaintext for ordering + range queries
  payload      jsonb,         -- alpha: plaintext JSON; beta: { iv, ct }
  enc          boolean,       -- false in alpha, true in beta
  created_at   timestamptz,
  updated_at   timestamptz,
  deleted_at   timestamptz    -- soft delete
)
```

Relationships (a transaction's category, a meal plan's recipe ids) are stored
as ids inside the payload and resolved client-side after the household's records
are loaded.

### The four seams

These four modules are the only place beta changes land. No call site outside
them should branch on `VITE_MODE` directly:

| Seam | File | Alpha | Beta |
|---|---|---|---|
| 1 — Data | `src/lib/data.js` | Reads/writes `grove.records` | Adds household-scoped RLS |
| 2 — Crypto | `src/lib/crypto.js` | Passthrough (plain JSON) | AES-256-GCM, real E2EE |
| 3 — Identity | `src/lib/identity.js` | Hardcoded Ren + Mav household | Derives from Auth session |
| 4 — Config | `src/config.js` | `VITE_MODE=alpha` flags | `VITE_MODE=beta` flips all |

> **Law:** every tab reads and writes through `src/lib/data.js` only — never
> `supabase.from()` directly. If a tab bypasses this, beta becomes a
> hunt-and-patch.

### Serverless API functions

Vercel functions live in `api/`. The SPA rewrite in `vercel.json` already
excludes `api/` paths, so each file is accessible at `/api/<name>`.

| Function | What it does |
|---|---|
| `api/gcal.js` | Fetches the private Google Calendar ICS, parses it, returns JSON events filtered to a date range. Requires `GCAL_ICS_URL` env var (server-side only). |
| `api/import-recipe.js` | Proxy for recipe URL scraping (avoids CORS on external food sites). |

---

## Layout system

### Breakpoints

Two breakpoints. CSS vars can't be read inside `@media` queries, so the
values are documented here and used as raw pixels in the stylesheets:

| Name | Pixel value | What changes |
|---|---|---|
| `--bp-md` | `720px` | Bottom nav → left rail; sheets → centered dialogs; desktop padding |
| `--bp-lg` | `1080px` | Two-column layouts (Ledger Overview, Journal Log 2-col) |

**Rule:** only use `720` and `1080` in media queries across the whole codebase.
A different value means something is wrong.

### Page wrappers

Every tab's outermost div uses one of two shared classes — never ad-hoc
`max-width` / `padding` / `margin` on a page div:

```jsx
<div className="page">       {/* 640px centered — logs, forms, lists */}
<div className="page wide">  {/* 1080px centered — Ledger, Almanac */}
```

`.page` handles: `max-width`, `margin: 0 auto`, responsive horizontal
padding, and bottom padding (no bottom-nav on desktop). The 88px rail offset
at ≥720px comes automatically from `app-root[data-app] { padding-left: 88px }`.

The exception: Ledger (`.ledger-page`) and Settings (`.settings-page`) mirror
`.page` behavior in their own CSS files because they have many JSX page files.
Their breakpoints are aligned to 720px. Don't add new exceptions — new tabs
get `.page` directly.

### Navigation

`BottomNav` renders two layouts via CSS only — no JS branching:

- **< 720px** — fixed bottom bar, horizontal grid
- **≥ 720px** — fixed left rail, 88px wide, vertical flex

`app-root[data-app]` gets `padding-left: 88px` at ≥720px to clear the rail.
The top bar is sticky inside the content column. The first 88px at the top
(under the rail brand mark) is filled by the Grove mark in `BottomNav`.

### Sheets

`Sheet` renders two ways via CSS only:

- **< 720px** — slides up from the bottom
- **≥ 720px** — centered dialog with `border-radius: var(--r-xl)`

Use the single canonical `src/components/Sheet.jsx`. Do not fork it per app.

---

## Adding an app

1. Create `src/apps/<name>/index.jsx` — default-exports the React component,
   named-exports `meta = { id, name, tagline }`.
2. Add tables to the `grove` schema. Grant API access; expose the schema in
   Supabase → Settings → API → Exposed schemas.
3. Register in `src/App.jsx`:
   ```js
   import MyApp, { meta as myMeta } from './apps/myapp'
   // add to REGISTRY:
   myapp: { Component: MyApp, meta: myMeta },
   ```
4. Add `'myapp'` to `exposedApps` in `src/config.js`.
5. Pick a nature-derived accent from the reserved list in `BRAND-GUIDE.md §3.3`
   and add it to `TILE_ACCENT` in `src/components/Launcher.jsx`.
6. Use `.page` / `.page.wide` on page wrappers. All data goes through
   `src/lib/data.js`.

---

## Alpha → Beta

When the alpha is solid and outside testers join, beta is:

1. New Supabase project (zero family data); run the `grove` schema SQL there.
2. Set `VITE_MODE=beta`; point env vars at the new project.
3. Fill `src/lib/crypto.js` — AES-256-GCM, Argon2id KEK, data-key wrapping,
   recovery key (see `GROVE-ALPHA-BUILD-GUIDE.md §3.3`).
4. Fill `src/lib/identity.js` — household-scoped RLS from the Auth session.
5. Tighten RLS from permissive-anon to `household_id = session's`.
6. Enable sign-up + passphrase + recovery-key UI in the setup gate.
7. Set `exposedApps` in `config.js` to the polished apps only.

Nothing above touches a call site outside the four seams. That's the point.

---

## QA checklist

Test at **360×800, 390×844, 768×1024, 1280×800, 1536×960** — dark + light
theme — Chrome + Safari (iOS Safari for `safe-area-inset-bottom`).

Per-app smoke test (run in each app after any significant change):

- [ ] Create / read / update / delete in every tab
- [ ] Theme toggle — no hardcoded hex leaks through
- [ ] Back-to-launcher — rail disappears, launcher shows
- [ ] Browser back button — path routing handles it cleanly

Layout:
- [ ] No 560px strip on desktop (Ledger fills ~1080px, Journal centers at 640px)
- [ ] Resize through 720px — nav bar morphs to rail, no layout jump
- [ ] Open a Sheet on desktop — centered dialog, not bottom sheet
- [ ] No horizontal scroll at 360px in any tab

Interaction:
- [ ] Delete a Journal timeline entry — undo toast appears, 5s window works
- [ ] Unmark a period start in Journal — consequence Sheet, not `confirm()`
- [ ] Delete a Ledger transaction — row hides immediately, undo toast appears

Accessibility:
- [ ] Tab through the Launcher — all tiles focusable, focus ring visible
- [ ] Tab into a Sheet — focus moves in, Escape closes, focus restores
- [ ] Skip-nav link appears on first Tab press, jumps past top bar

---

*Grove — rooted, quiet, warm.*
