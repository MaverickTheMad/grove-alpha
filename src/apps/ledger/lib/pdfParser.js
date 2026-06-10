// PDF text extraction using pdf.js.
// Returns the full extracted text, page by page, joined with form feeds.
// Used by parsers downstream — parsers should not need to know about PDF internals.
//
// IMPORTANT: pdf.js returns text items in the PDF's *content stream* order, which
// is NOT guaranteed to be reading order. For multi-column or tabular layouts
// (bank statements, invoices), items can arrive in column-major order — e.g.
// every "amount" on the page in one run, then every "balance", then every
// description row. So we MUST sort by Y position (then X) before reconstructing
// rows, and we MUST cluster rows with a Y tolerance because text within a row
// may have slight baseline jitter.

import * as pdfjsLib from 'pdfjs-dist'

// Worker setup — Vite serves the worker as an asset
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Extract text from a PDF file/blob.
 * @param {File|Blob} file
 * @returns {Promise<{ text: string, pages: string[], pageItems: Array<Array<{x,y,str,width}>>, pageCount: number }>}
 *   - text/pages: reading-order reconstruction (row-based parsers, e.g. Chase)
 *   - pageItems: raw positioned items per page (geometry-based parsers, e.g. Wealthfront)
 */
export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  // Raw positioned text items, per page. Row-based parsers (Chase) work off the
  // reconstructed `text`; table-transposed layouts (Wealthfront) need the original
  // x/y geometry, because sorting by Y collapses each column into its own line.
  const pageItems = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Build {x, y, str, width} from items.
    // transform = [a, b, c, d, e, f] in matrix form; e = x, f = y.
    // PDF Y coords: larger Y = higher on page, so we sort DESC for top-down.
    const items = content.items
      .filter(it => it.str && it.str.length > 0)
      .map(it => ({
        x: it.transform[4],
        y: it.transform[5],
        str: it.str,
        width: it.width || 0
      }))

    pageItems.push(items)

    if (items.length === 0) {
      pages.push('')
      continue
    }

    // Sort top-to-bottom (Y descending), then left-to-right
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 3) return b.y - a.y
      return a.x - b.x
    })

    // Cluster into rows by Y proximity. ~3-unit tolerance handles baseline jitter
    // without merging adjacent rows (Chase uses ~10pt line height).
    const ROW_TOLERANCE = 3
    const rows = []
    let currentRow = []
    let currentY = null
    for (const it of items) {
      if (currentY === null || Math.abs(it.y - currentY) <= ROW_TOLERANCE) {
        currentRow.push(it)
        currentY = currentY === null ? it.y : (currentY + it.y) / 2
      } else {
        if (currentRow.length > 0) rows.push(currentRow)
        currentRow = [it]
        currentY = it.y
      }
    }
    if (currentRow.length > 0) rows.push(currentRow)

    // Build text per row, inserting a space where there's a horizontal gap
    const lines = []
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x)
      let line = ''
      let lastEnd = null
      for (const it of row) {
        if (lastEnd !== null && it.x - lastEnd > 2) {
          line += ' '
        }
        line += it.str
        lastEnd = it.x + it.width
      }
      line = line.replace(/\s+/g, ' ').trim()
      if (line) lines.push(line)
    }

    pages.push(lines.join('\n'))
  }
  return {
    text: pages.join('\n\f\n'),
    pages,
    pageItems,
    pageCount: pdf.numPages
  }
}
