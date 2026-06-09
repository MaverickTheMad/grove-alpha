// PDF recipe parser — ported VERBATIM from family-shopping-app (App.jsx
// ~1698-1777). Takes text reconstructed from pdf.js and pulls out the recipe
// name + ingredient lines. Pure (no DOM); the pdf.js text extraction + Storage
// upload live in the RecipeEditor (Part 2).

import { detectSection } from './shopping'

export function parsePdfText(text) {
  const UNICODE_FRACTIONS = { "\u00bc":"1/4","\u00bd":"1/2","\u00be":"3/4","\u2153":"1/3","\u2154":"2/3","\u215b":"1/8","\u215c":"3/8","\u215d":"5/8","\u215e":"7/8" }
  const UNIT_RE = /^(tablespoons?|tbsps?|tbs?|teaspoons?|tsps?|cups?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|cloves?|cans?|jars?|bags?|packages?|slices?|pieces?|stalks?|bunches?|sprigs?|pinch(?:es)?|dash(?:es)?|sticks?|fluid ounces?|fl\.? oz\.?|milliliters?|ml\.?|liters?|l\.?|quarts?|qt\.?|pints?|pt\.?)\b/i

  function parseIngredientLine(raw) {
    let str = raw.trim()
    str = str.replace(/^[.\-–—•*·]\s*/, "")
    for (const uc of Object.keys(UNICODE_FRACTIONS)) str = str.split(uc).join(" " + UNICODE_FRACTIONS[uc])
    str = str.replace(/\s+/g, " ").trim()
    const qtyMatch = str.match(/^(\d+(?:[\/\-]\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s*/)
    let quantity = "", rest = str
    if (qtyMatch) {
      quantity = qtyMatch[1].trim()
      rest = str.slice(qtyMatch[0].length)
      const unitMatch = rest.match(UNIT_RE)
      if (unitMatch) { quantity = quantity + " " + unitMatch[0].trim(); rest = rest.slice(unitMatch[0].length).trim() }
    }
    let ingName = rest
      .replace(/^,\s*/, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/^EACH:\s*/i, "")
      .replace(/\s*[,;]\s*(divided|drained|rinsed|chopped|minced|diced|sliced|halved|quartered|see notes?|optional|to taste|room temp|softened|melted|packed|sifted|heaping|about|approximately).*/i, "")
      .replace(/\s+see notes?.*$/i, "")
      .replace(/\s+or merlot.*$/i, "")
      .replace(/\s+\*optional\*.*$/i, "")
      .replace(/\s+\d+$/, "")
      .replace(/\s+(cut|halved|quartered|sliced|diced|chopped|minced|peeled|trimmed|divided|thawed|frozen|fresh|dried|ground|whole|large|medium|small)\b.*/i, "")
      .replace(/\s+/g, " ")
      .trim()
    if (ingName.length > 0) ingName = ingName.charAt(0).toUpperCase() + ingName.slice(1)
    return { name: ingName, quantity }
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  let inIngredients = false
  const ingredientLines = []
  for (const line of lines) {
    if (/^ingredients?$/i.test(line) || /^what you.?ll need$/i.test(line)) { inIngredients = true; continue }
    if (inIngredients && /^(directions?|instructions?|method|steps?|step 1|preparation|nutrition)$/i.test(line)) break
    if (inIngredients) ingredientLines.push(line)
  }
  const searchLines = ingredientLines.length > 0 ? ingredientLines : lines

  const ingredients = []
  for (const line of searchLines) {
    if (line.length < 3 || line.length > 150) continue
    if (/^(directions?|instructions?|notes?|step \d|serves|yield|prep|cook|total|nutrition|per serving|submitted|tested|gather|preheat|firefox|https?:|calories|carb|protein|fat|sodium|cholesterol|potassium|vitamin)/i.test(line)) continue
    const startsWithQty = /^[\d\u00bc\u00bd\u00be\u2153\u2154\u215b\u215c\u215d\u215e]/.test(line)
    const startsWithBullet = /^[-\u2022*\u00b7]\s/.test(line)
    if (startsWithQty || startsWithBullet) {
      const parsed = parseIngredientLine(line.replace(/^[-\u2022*\u00b7]\s*/, ""))
      if (parsed.name && parsed.name.length > 1 && parsed.name.length < 80) {
        ingredients.push({ name: parsed.name, quantity: parsed.quantity, section: detectSection(parsed.name) })
      }
    }
  }

  let recipeName = ""
  for (const line of lines.slice(0, 20)) {
    if (/\s+\d+$/.test(line) && line.length < 30) continue
    if (line.length > 3 && line.length < 100 && !/^https?:/i.test(line) && !/^firefox/i.test(line) && !/^\d/.test(line)) {
      if (/^(print|save|share|jump|by |author|yield|serves|prep|cook|total|submitted|tested|ingredients?|gather|preheat)/i.test(line)) continue
      recipeName = line.replace(/\s+\d+$/, "").trim()
      break
    }
  }

  return { name: recipeName, ingredients }
}
