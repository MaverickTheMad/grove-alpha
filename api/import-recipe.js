// Vercel serverless function. The browser can't fetch arbitrary recipe sites
// (CORS), so the URL import goes through here: fetch the page, read its
// schema.org JSON-LD Recipe, return { name, ingredients:[{name,quantity}] }.
// Section detection happens client-side on save. No secrets needed.
//
// (vercel.json excludes /api/* from the SPA rewrite, so this route resolves.)

const UNIT_RE = /^(tablespoons?|tbsps?|tbs|teaspoons?|tsps?|cups?|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|cans?|jars?|packages?|pinch(?:es)?|sprigs?|sticks?|slices?|pieces?|quarts?|qt|pints?|pt)\.?$/i
const UNICODE = { '¼':'1/4','½':'1/2','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8' }

function parseIngredient(raw) {
  let s = String(raw || '')
  for (const [u, r] of Object.entries(UNICODE)) s = s.split(u).join(' ' + r)
  s = s.replace(/\s+/g, ' ').trim()
  const tokens = s.split(' ')
  let qty = []
  // leading numeric / fraction tokens
  while (tokens.length && /^\d+([./-]\d+)?$/.test(tokens[0])) qty.push(tokens.shift())
  // optional unit
  if (tokens.length && UNIT_RE.test(tokens[0])) qty.push(tokens.shift())
  let name = tokens.join(' ')
    .replace(/\([^)]*\)/g, '')
    .replace(/^,\s*/, '')
    .replace(/\s*[,;].*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1)
  return { name, quantity: qty.join(' ').trim() }
}

function findRecipe(node) {
  if (!node) return null
  if (Array.isArray(node)) { for (const n of node) { const r = findRecipe(n); if (r) return r } return null }
  if (typeof node !== 'object') return null
  const type = node['@type']
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
  if (isRecipe) return node
  if (node['@graph']) return findRecipe(node['@graph'])
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  let body = req.body
  if (!body || typeof body === 'string') { try { body = JSON.parse(body || '{}') } catch { body = {} } }
  const url = body.url
  if (!url || !/^https?:\/\//i.test(url)) { res.status(400).json({ error: 'Provide a valid URL.' }); return }

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GroveBot/1.0)' } })
    if (!r.ok) { res.status(200).json({ error: `Site returned ${r.status}.` }); return }
    const html = await r.text()

    const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
    let recipe = null
    for (const b of blocks) {
      try { recipe = findRecipe(JSON.parse(b.trim())); if (recipe) break } catch { /* skip bad json */ }
    }
    if (!recipe) { res.status(200).json({ error: 'No recipe data found on that page.' }); return }

    const name = (recipe.name || '').toString().trim()
    const rawIngs = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient
      : Array.isArray(recipe.ingredients) ? recipe.ingredients : []
    const ingredients = rawIngs.map(parseIngredient).filter((i) => i.name && i.name.length > 1)

    if (!name && ingredients.length === 0) { res.status(200).json({ error: 'Could not read this recipe.' }); return }
    res.status(200).json({ name, ingredients })
  } catch (e) {
    res.status(200).json({ error: `Import failed: ${e.message}` })
  }
}
