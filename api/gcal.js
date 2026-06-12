// Vercel serverless function — Google Calendar ICS proxy.
// The browser can't fetch calendar.google.com directly (CORS), so this
// server-side function fetches the private ICS URL and returns JSON events
// filtered to the requested date range.
//
// Setup: add GCAL_ICS_URL to Vercel environment variables (Settings → Env Vars).
// Secret stays server-side only (no VITE_ prefix = never in the browser bundle).
//
// Usage (from the browser):
//   GET /api/gcal?start=2024-01-01&end=2024-01-31
//
// Response:
//   { events: [{ uid, date, start, end, title, location }] }

// ── ICS parser ──────────────────────────────────────────────────────────────

function unfoldLines(text) {
  // ICS allows long lines to be folded with \r\n<SPACE|TAB>; unfold them first.
  return text.replace(/\r?\n[ \t]/g, '')
}

function parseProperty(line) {
  // Splits "DTSTART;TZID=America/New_York:20240115T100000" into
  // { name: 'DTSTART', params: 'TZID=America/New_York', value: '20240115T100000' }
  const colon = line.indexOf(':')
  if (colon < 0) return null
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const semi = head.indexOf(';')
  const name = (semi < 0 ? head : head.slice(0, semi)).toUpperCase()
  const params = semi < 0 ? '' : head.slice(semi + 1)
  return { name, params, value }
}

function icsDateToISO(value, params = '') {
  // VALUE=DATE or 8-digit all-day: return { date, start:null, allDay:true }
  if (params.includes('VALUE=DATE') || /^\d{8}$/.test(value)) {
    const d = value.slice(0, 8)
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      iso: null,
      allDay: true,
    }
  }
  // UTC datetime (ends with Z): easy path
  if (value.endsWith('Z')) {
    const raw = value.replace('Z', '')
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`
    return { date: iso.slice(0, 10), iso, allDay: false }
  }
  // Local datetime with TZID (no Z): best-effort — treat as date + time, no TZ convert.
  // For a household app this is good enough (events show the right day).
  const d = value.slice(0, 8)
  const t = value.slice(9)
  const dateStr = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  const timeStr = `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`
  return { date: dateStr, iso: `${dateStr}T${timeStr}`, allDay: false }
}

function unescape(s) {
  // ICS text escaping: \n → newline, \, → comma, \; → semicolon, \\ → backslash
  return (s || '').replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

function parseICS(text) {
  const lines = unfoldLines(text).split(/\r?\n/)
  const events = []
  let cur = null

  for (const raw of lines) {
    const prop = parseProperty(raw)
    if (!prop) continue
    const { name, params, value } = prop

    if (name === 'BEGIN' && value === 'VEVENT') { cur = {}; continue }
    if (name === 'END' && value === 'VEVENT') { if (cur) events.push(cur); cur = null; continue }
    if (!cur) continue

    switch (name) {
      case 'UID':         cur.uid = value; break
      case 'SUMMARY':     cur.title = unescape(value); break
      case 'LOCATION':    cur.location = unescape(value); break
      case 'DESCRIPTION': cur.description = unescape(value); break
      case 'STATUS':      cur.status = value; break
      case 'DTSTART':     cur.dtstart = icsDateToISO(value, params); break
      case 'DTEND':       cur.dtend   = icsDateToISO(value, params); break
      default: break
    }
  }

  return events
}

// ── Request handler ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS — same-origin only (the Vercel deployment serves the SPA and this API)
  res.setHeader('Cache-Control', 'no-store')

  const icsUrl = process.env.GCAL_ICS_URL
  if (!icsUrl) {
    return res.status(500).json({ error: 'GCAL_ICS_URL environment variable not set.' })
  }

  const { start, end } = req.query
  if (!start || !end) {
    return res.status(400).json({ error: 'Provide start and end query params (YYYY-MM-DD).' })
  }

  let icsText
  try {
    const r = await fetch(icsUrl, {
      headers: { 'User-Agent': 'GroveCalendar/1.0 (household app)' },
    })
    if (!r.ok) throw new Error(`ICS fetch returned ${r.status}`)
    icsText = await r.text()
  } catch (e) {
    return res.status(502).json({ error: `Could not fetch calendar: ${e.message}` })
  }

  let parsed
  try {
    parsed = parseICS(icsText)
  } catch (e) {
    return res.status(500).json({ error: `Could not parse ICS: ${e.message}` })
  }

  // Filter to the requested date range and exclude cancelled events
  const events = parsed
    .filter((ev) => {
      if (!ev.dtstart) return false
      if (ev.status === 'CANCELLED') return false
      const d = ev.dtstart.date
      return d >= start && d <= end
    })
    .map((ev) => ({
      uid:      ev.uid || '',
      title:    ev.title || '(No title)',
      date:     ev.dtstart.date,
      start:    ev.dtstart.allDay ? null : ev.dtstart.iso,
      end:      ev.dtend ? (ev.dtend.allDay ? null : ev.dtend.iso) : null,
      allDay:   ev.dtstart.allDay,
      location: ev.location || null,
    }))

  return res.status(200).json({ events })
}
