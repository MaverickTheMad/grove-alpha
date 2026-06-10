import { useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import Sheet from '../../../components/Sheet'
import { normIng, getSection, detectSection } from '../lib/shopping'
import { parsePdfText } from '../lib/parsePdf'
import { uploadRecipePdf } from '../lib/store'
import { RECIPE_CATEGORIES, SECTION_ORDER } from '../constants'

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174'

export default function RecipeEditor({ recipe, onSave, onCancel, onDelete, sections, onSetSection }) {
  const isNew = String(recipe.id).startsWith('new')
  const [name, setName] = useState(recipe.name)
  const [url, setUrl] = useState(recipe.url || '')
  const [category, setCategory] = useState(recipe.category || 'Other')
  const [notes, setNotes] = useState(recipe.notes || '')
  const [cookTime, setCookTime] = useState(recipe.cook_time || '')
  const [servings, setServings] = useState(recipe.servings || '')
  const [ingredients, setIngredients] = useState((recipe.ingredients || []).map(normIng))
  const [newIngName, setNewIngName] = useState('')
  const [newIngQty, setNewIngQty] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(recipe.pdf_url || '')
  const fileRef = useRef(null)
  const ingredientsRef = useRef(null)

  function applyImportResult(data, sourceUrl) {
    if (data.name && !name) setName(data.name)
    if (sourceUrl && !url) setUrl(sourceUrl)
    const imported = (data.ingredients || []).map((i) => (typeof i === 'string' ? { name: i, quantity: '' } : { name: i.name || '', quantity: i.quantity || '' }))
    if (imported.length > 0) setIngredients(imported)
    ;(data.ingredients || []).forEach((i) => { if (i.name && i.section) onSetSection(i.name, i.section) })
    setTimeout(() => ingredientsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  }

  async function handleUrlImport() {
    if (!importUrl.trim()) return
    setImporting(true); setImportError('')
    try {
      const res = await fetch('/api/import-recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl.trim() }) })
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      applyImportResult(data, importUrl.trim())
      setImportUrl('')
    } catch (e) {
      setImportError(`URL import failed: ${e.message}`)
    } finally { setImporting(false) }
  }

  async function handlePdfImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setImportError('Please select a PDF file.'); return }
    setImporting(true); setImportError('')
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = `${PDFJS}/pdf.min.js`; s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`
      }
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const lineMap = {}
        for (const item of content.items) {
          if (!item.str.trim()) continue
          const y = Math.round(item.transform[5] / 2) * 2
          if (!lineMap[y]) lineMap[y] = []
          lineMap[y].push({ x: item.transform[4], str: item.str })
        }
        const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a)
        for (const y of sortedYs) {
          const items = lineMap[y].sort((a, b) => a.x - b.x)
          const lineText = items.map((it) => it.str).join(' ').trim()
          if (lineText) fullText += lineText + '\n'
        }
      }
      if (!fullText.trim()) { setImportError('PDF appears empty or image-only. Use File → Print → Save as PDF.'); return }
      const { name: parsedName, ingredients: parsedIngredients } = parsePdfText(fullText)
      if (!parsedName && parsedIngredients.length === 0) { setImportError("Couldn't find ingredients. Make sure it's a text-based recipe PDF."); return }
      applyImportResult({ name: parsedName, ingredients: parsedIngredients }, '')
      const publicUrl = await uploadRecipePdf(file).catch(() => null)
      if (publicUrl) setPdfUrl(publicUrl)
    } catch (e) {
      setImportError(`PDF import failed: ${e.message}`)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function addIngredient() {
    if (!newIngName.trim()) return
    const parts = newIngName.split(',').map((s) => s.trim()).filter(Boolean)
    setIngredients((prev) => [...prev, ...parts.map((n, i) => ({ name: n, quantity: i === 0 && parts.length === 1 ? newIngQty : '' }))])
    setNewIngName(''); setNewIngQty('')
  }
  const updateIngredient = (idx, field, value) => setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)))
  const removeIngredient = (idx) => setIngredients((prev) => prev.filter((_, i) => i !== idx))

  async function handleSave() {
    if (!name.trim()) { setImportError('Give the recipe a name first.'); return }
    setSaving(true)
    await onSave({ ...recipe, name: name.trim(), url: url.trim(), category, notes, cook_time: cookTime, servings, pdf_url: pdfUrl, ingredients })
    // parent closes the editor; don't clear saving before that to avoid double-submit
  }

  return (
    <Sheet
      open
      onClose={onCancel}
      title={isNew ? 'New recipe' : 'Edit recipe'}
      footer={
        <div className="spread" style={{ width: '100%' }}>
          {onDelete ? <button className="btn danger sm" onClick={onDelete}><Icon name="trash" size={16} /> Delete</button> : <span />}
          <div className="row" style={{ gap: 'var(--sp-2)' }}>
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save recipe'}</button>
          </div>
        </div>
      }
    >
      {/* import */}
      <div className="card" style={{ background: 'var(--app-weak)' }}>
        <div className="p-eyebrow row" style={{ gap: 6, marginBottom: 4 }}><Icon name="external" size={14} /> Import recipe</div>
        <p className="p-sub" style={{ marginBottom: 'var(--sp-3)' }}>Paste a URL to auto-import, or upload a recipe PDF (File → Print → Save as PDF).</p>
        <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <input className="input" placeholder="https://recipe-site.com/recipe" value={importUrl} disabled={importing}
            onChange={(e) => setImportUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !importing && handleUrlImport()} />
          <button className="btn primary" disabled={importing || !importUrl.trim()} onClick={handleUrlImport} style={{ whiteSpace: 'nowrap' }}>{importing ? 'Importing…' : 'Try URL'}</button>
        </div>
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <span className="p-sub grow" style={{ fontStyle: 'italic' }}>or upload a PDF</span>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handlePdfImport} style={{ display: 'none' }} />
          <button className="btn" disabled={importing} onClick={() => fileRef.current?.click()}><Icon name="log" size={16} /> Upload PDF</button>
        </div>
        {importError && <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>{importError}</p>}
      </div>

      <div>
        <label className="field-label">Name</label>
        <input className="input" placeholder="e.g. chicken alfredo" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Recipe URL (optional)</label>
        <input className="input" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Notes (optional)</label>
        <textarea className="input" rows={3} placeholder="Serving size, variations… e.g. 'double the sauce for 6'" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="row" style={{ gap: 'var(--sp-3)' }}>
        <div className="grow"><label className="field-label">Cook time</label><input className="input" placeholder="e.g. 35 mins" value={cookTime} onChange={(e) => setCookTime(e.target.value)} /></div>
        <div className="grow"><label className="field-label">Servings</label><input className="input" placeholder="e.g. 4" value={servings} onChange={(e) => setServings(e.target.value)} /></div>
      </div>
      <div>
        <label className="field-label">Category</label>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {RECIPE_CATEGORIES.map((c) => <button key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
      </div>

      <div ref={ingredientsRef}>
        <label className="field-label">Ingredients ({ingredients.length})</label>
        <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <input className="input" style={{ width: 72 }} placeholder="qty" value={newIngQty} onChange={(e) => setNewIngQty(e.target.value)} />
          <input className="input grow" placeholder="ingredient name" value={newIngName} onChange={(e) => setNewIngName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addIngredient()} />
          <button className="btn" onClick={addIngredient}><Icon name="log" size={16} /></button>
        </div>
        <div className="stack" style={{ gap: 'var(--sp-2)', maxHeight: 320, overflowY: 'auto' }}>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="item" style={{ gap: 'var(--sp-2)' }}>
              <input className="input" style={{ width: 64, padding: '6px 8px' }} placeholder="qty" value={ing.quantity} onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)} />
              <input className="grow" style={{ background: 'none', border: 'none', color: 'var(--text)' }} placeholder="name" value={ing.name} onChange={(e) => updateIngredient(idx, 'name', e.target.value)} />
              <select className="input" style={{ width: 'auto', padding: '6px 8px', fontSize: 10 }} value={getSection(ing.name, sections)} onChange={(e) => onSetSection(ing.name, e.target.value)}>
                {SECTION_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Remove" onClick={() => removeIngredient(idx)}><Icon name="close" size={16} /></button>
            </div>
          ))}
          {ingredients.length === 0 && <p className="p-sub" style={{ fontStyle: 'italic' }}>no ingredients added yet</p>}
        </div>
      </div>
    </Sheet>
  )
}
