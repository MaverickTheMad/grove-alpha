// Parser registry — sniffs text to detect which bank parser to use.
// Adding a new bank: create src/lib/parsers/<bank>.js with {parse<Bank>, is<Bank>},
// then register here.
//
// Detection order matters: list the most specific detectors first. Chase is
// listed before Wealthfront because a Chase statement can mention "Wealthfront
// Brokerage LLC" inside transaction descriptions, while a Wealthfront statement
// never says "Chase"/"JPMorgan".
//
// Parsers receive (text, ctx). `ctx.pageItems` carries the raw positioned text
// items per page for geometry-based parsers (Wealthfront's transposed tables).
// Row-based parsers (Chase) ignore ctx and read `text`.

import { parseChase, isChase } from './chase'
import { parseWealthfront, isWealthfront } from './wealthfront'

export const PARSERS = [
  { id: 'chase',       name: 'Chase',       parse: parseChase,       detect: isChase },
  { id: 'wealthfront', name: 'Wealthfront', parse: parseWealthfront,  detect: isWealthfront }
]

/**
 * Auto-detect bank from raw PDF text. Returns the parser id, or null.
 */
export function detectBank(text) {
  for (const p of PARSERS) {
    if (p.detect(text)) return p.id
  }
  return null
}

/**
 * Parse with a specific bank parser. If id is null/unknown, returns [].
 * @param {string} text
 * @param {string} id
 * @param {object} [ctx]  extra context for parsers (e.g. { pageItems })
 */
export function parseWithBank(text, id, ctx = {}) {
  const parser = PARSERS.find(p => p.id === id)
  if (!parser) return []
  return parser.parse(text, ctx)
}
