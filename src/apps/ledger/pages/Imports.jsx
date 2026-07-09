import { useState, useMemo, useEffect } from 'react'
import { useRecords } from '../lib/useRecords'
import { useToast } from '../../../components/Toast'
import { commitImport, undoImport } from '../lib/imports'
import { fmt } from '../lib/format'
import { extractPdfText } from '../lib/pdfParser'
import { detectBank, parseWithBank, PARSERS } from '../lib/parsers'
import { applyRules } from '../lib/rulesEngine'
import { flagDuplicates } from '../lib/duplicateDetector'

const STEP_UPLOAD = 'upload'
const STEP_REVIEW = 'review'
const STEP_DONE   = 'done'

export default function Imports() {
  const toast = useToast()
  const [step, setStep] = useState(STEP_UPLOAD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Upload state
  const [file, setFile] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [detectedBank, setDetectedBank] = useState(null)
  const [manualBank, setManualBank] = useState('')

  // Review state
  const [parsed, setParsed] = useState([])
  const [pdfText, setPdfText] = useState('')
  const [pdfPageItems, setPdfPageItems] = useState(null)
  const [batchSummary, setBatchSummary] = useState(null)

  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const { data: rules } = useRecords('rule', { orderBy: 'priority' })
  const { data: imports, refetch: refetchImports } = useRecords('statement_import', { orderBy: 'created_at', ascending: false })
  const { data: allTransactions } = useRecords('transaction')

  // Reset on step change to upload
  const reset = () => {
    setStep(STEP_UPLOAD)
    setFile(null)
    setSelectedAccount('')
    setDetectedBank(null)
    setManualBank('')
    setParsed([])
    setPdfText('')
    setPdfPageItems(null)
    setBatchSummary(null)
    setError(null)
  }

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    setError(null)
    setBusy(true)
    try {
      const { text, pageItems } = await extractPdfText(f)
      setPdfText(text)
      setPdfPageItems(pageItems)
      const bank = detectBank(text)
      setDetectedBank(bank)
      if (bank) setManualBank(bank)
    } catch (e) {
      console.error(e)
      setError('Failed to read PDF: ' + e.message)
    }
    setBusy(false)
  }

  const handleParse = async () => {
    if (!pdfText) { setError('No PDF loaded'); return }
    if (!manualBank) { setError('Please pick a bank'); return }
    if (!selectedAccount) { setError('Please pick an account'); return }
    setBusy(true)
    setError(null)
    try {
      const txns = parseWithBank(pdfText, manualBank, { pageItems: pdfPageItems })
      if (txns.length === 0) {
        setError('No transactions found. This statement format may not be supported yet.')
        setBusy(false)
        return
      }
      // Existing transactions in the date range for dupe checking (client-side)
      const dates = txns.map(t => t.date).sort()
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]
      const existing = allTransactions.filter(t => t.date >= minDate && t.date <= maxDate)
      // Apply rules + flag dupes
      const { transactions: ruled } = applyRules(txns, rules)
      const flagged = flagDuplicates(ruled, existing || [])
      // Default: skip duplicates, import everything else
      const ready = flagged.map(t => ({
        ...t,
        _import: !t._duplicate,
        _description: t.description,
        _date: t.date,
        _amount: t.amount,
        _category: t._categoryId,
        _account: selectedAccount,
        _person: null,
        _notes: ''
      }))
      setParsed(ready)
      setStep(STEP_REVIEW)
    } catch (e) {
      console.error(e)
      setError('Parse error: ' + e.message)
    }
    setBusy(false)
  }

  const updateRow = (i, patch) => {
    setParsed(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const stats = useMemo(() => {
    const total = parsed.length
    const dupes = parsed.filter(p => p._duplicate).length
    const willImport = parsed.filter(p => p._import).length
    const uncategorized = parsed.filter(p => p._import && !p._category).length
    const expenseTotal = parsed.filter(p => p._import && p._amount < 0).reduce((s, p) => s + Math.abs(p._amount), 0)
    const incomeTotal = parsed.filter(p => p._import && p._amount > 0).reduce((s, p) => s + p._amount, 0)
    return { total, dupes, willImport, uncategorized, expenseTotal, incomeTotal }
  }, [parsed])

  const handleCommit = async () => {
    setBusy(true)
    setError(null)
    try {
      const summary = await commitImport({
        filename: file?.name || 'unknown.pdf',
        accountId: selectedAccount,
        parsed,
        pdfText,
      })
      setBatchSummary(summary)
      setStep(STEP_DONE)
      refetchImports()
      toast.show(`${summary.count} transaction${summary.count !== 1 ? 's' : ''} added.`, {
        actionLabel: 'Undo',
        onAction: async () => {
          await undoImport(summary.batchId)
          refetchImports()
          reset()
        }
      })
    } catch (e) {
      console.error(e)
      setError('Commit failed: ' + e.message)
    }
    setBusy(false)
  }

  const handleUndo = async (batchId) => {
    if (!confirm('Undo this entire import? All transactions from this batch will be deleted.')) return
    setBusy(true)
    try {
      await undoImport(batchId)
      refetchImports()
    } catch (e) {
      alert('Undo failed: ' + e.message)
    }
    setBusy(false)
  }

  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------
  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">v1.1</p>
          <h1>Statement imports</h1>
          <p>Drop a PDF, review the parsed rows, commit what's right.</p>
        </div>
        {step !== STEP_UPLOAD && (
          <button className="btn btn-ghost" onClick={reset}>← Start over</button>
        )}
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--negative-soft)', border: 'none', marginBottom: '1rem', color: 'var(--negative)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {step === STEP_UPLOAD && (
        <UploadStep
          file={file}
          onFile={handleFile}
          busy={busy}
          detectedBank={detectedBank}
          manualBank={manualBank}
          setManualBank={setManualBank}
          accounts={accounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          onParse={handleParse}
          imports={imports}
          onUndo={handleUndo}
        />
      )}

      {step === STEP_REVIEW && (
        <ReviewStep
          parsed={parsed}
          updateRow={updateRow}
          categories={categories}
          accounts={accounts}
          stats={stats}
          onCommit={handleCommit}
          busy={busy}
        />
      )}

      {step === STEP_DONE && batchSummary && (
        <DoneStep summary={batchSummary} onReset={reset} />
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------

function UploadStep({ file, onFile, busy, detectedBank, manualBank, setManualBank, accounts, selectedAccount, setSelectedAccount, onParse, imports, onUndo }) {
  const [dragging, setDragging] = useState(false)
  const recent = (imports || []).filter(i => i.status === 'committed').slice(0, 5)

  return (
    <div>
      <div
        className="card"
        style={{
          border: dragging ? '2px dashed var(--accent)' : '2px dashed var(--line-strong)',
          background: dragging ? 'var(--accent-soft)' : 'var(--surface)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          transition: 'all 0.15s'
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f && f.type === 'application/pdf') onFile(f)
        }}
      >
        {!file ? (
          <>
            <h2 style={{ marginBottom: '0.5rem' }}>Drop a PDF statement</h2>
            <p style={{ color: 'var(--ink-muted)', marginBottom: '1.25rem' }}>or pick one from your computer</p>
            <label className="btn">
              Choose file
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files[0])} />
            </label>
          </>
        ) : busy ? (
          <p>Reading PDF...</p>
        ) : (
          <>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Loaded</p>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', marginBottom: 4 }}>{file.name}</h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{(file.size / 1024).toFixed(0)} KB</p>
          </>
        )}
      </div>

      {file && !busy && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Confirm details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="field">
              <label>Bank</label>
              <select className="select" value={manualBank} onChange={(e) => setManualBank(e.target.value)}>
                <option value="">— Pick bank —</option>
                {PARSERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {detectedBank && detectedBank === manualBank && (
                <small style={{ color: 'var(--positive)' }}>Auto-detected</small>
              )}
              {!detectedBank && (
                <small style={{ color: 'var(--ink-muted)' }}>Couldn't auto-detect — pick manually</small>
              )}
            </div>
            <div className="field">
              <label>Account</label>
              <select className="select" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                <option value="">— Pick account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" onClick={onParse} disabled={!manualBank || !selectedAccount || busy}>
            {busy ? 'Parsing...' : 'Parse statement →'}
          </button>
        </div>
      )}

      {recent.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-head">
            <h3>Recent imports</h3>
            <span className="eyebrow">Undo available</span>
          </div>
          <table className="ledger">
            <thead>
              <tr>
                <th>File</th>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Rows</th>
                <th>Imported</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map(imp => (
                <tr key={imp.id}>
                  <td style={{ fontSize: 13 }}>{imp.filename}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{imp.period_start} → {imp.period_end}</td>
                  <td className="num">{imp.committed_count}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{new Date(imp.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onUndo(imp.id)}>Undo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ReviewStep({ parsed, updateRow, categories, accounts, stats, onCommit, busy }) {
  const [showDupes, setShowDupes] = useState(true)
  const filtered = parsed.map((r, i) => ({ r, i })).filter(({ r }) => showDupes || !r._duplicate)

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="stat-label">Parsed</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Will import</div>
          <div className="stat-value">{stats.willImport}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Duplicates</div>
          <div className="stat-value">{stats.dupes}</div>
          <div className="stat-sub">Skipped by default</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-label">Uncategorized</div>
          <div className="stat-value">{stats.uncategorized}</div>
          <div className="stat-sub">No rule matched</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
          <strong>Net:</strong> <span className="mono">{fmt(stats.incomeTotal - stats.expenseTotal, { signed: true })}</span>
          {' · '}
          <span style={{ color: 'var(--positive)' }}>+{fmt(stats.incomeTotal, { showCents: false })}</span>
          {' · '}
          <span style={{ color: 'var(--negative)' }}>−{fmt(stats.expenseTotal, { showCents: false })}</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={showDupes} onChange={(e) => setShowDupes(e.target.checked)} />
          Show duplicates
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="ledger" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>
                <input
                  type="checkbox"
                  checked={parsed.every(p => p._import)}
                  onChange={(e) => {
                    const v = e.target.checked
                    parsed.forEach((_, i) => updateRow(i, { _import: v && !parsed[i]._duplicate }))
                  }}
                />
              </th>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ r, i }) => (
              <tr key={i} style={{ opacity: r._import ? 1 : 0.5, background: r._duplicate ? 'rgba(168, 90, 90, 0.04)' : 'transparent' }}>
                <td>
                  <input type="checkbox" checked={r._import} onChange={(e) => updateRow(i, { _import: e.target.checked })} />
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  <input
                    type="date"
                    className="input mono"
                    value={r._date}
                    onChange={(e) => updateRow(i, { _date: e.target.value })}
                    style={{ padding: '0.25rem 0.4rem', fontSize: 12, width: 130 }}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={r._description}
                    onChange={(e) => updateRow(i, { _description: e.target.value })}
                    style={{ padding: '0.3rem 0.5rem', fontSize: 13, minWidth: 200 }}
                  />
                </td>
                <td>
                  <select
                    className="select"
                    value={r._category || ''}
                    onChange={(e) => updateRow(i, { _category: e.target.value || null })}
                    style={{ padding: '0.3rem 0.4rem', fontSize: 12, minWidth: 140 }}
                  >
                    <option value="">— None —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {r._ruleId && <div style={{ fontSize: 10, color: 'var(--positive)', marginTop: 2 }}>by rule</div>}
                </td>
                <td className="num">
                  <input
                    type="number"
                    step="0.01"
                    className={'input mono ' + (r._amount < 0 ? 'amount-neg' : 'amount-pos')}
                    value={r._amount}
                    onChange={(e) => updateRow(i, { _amount: parseFloat(e.target.value) || 0 })}
                    style={{
                      padding: '0.3rem 0.5rem',
                      fontSize: 13,
                      width: 110,
                      textAlign: 'right',
                      fontWeight: 500,
                      color: r._amount < 0 ? 'var(--negative)' : 'var(--positive)'
                    }}
                  />
                </td>
                <td>
                  {r._duplicate && <span className="pill pill-late" title={`Likely matches: ${r._duplicateOfDescription}`}>Duplicate</span>}
                  {!r._duplicate && !r._category && <span className="pill" style={{ background: 'var(--warning-soft)', color: '#8a6a1a' }}>No category</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn" onClick={onCommit} disabled={busy || stats.willImport === 0}>
          {busy ? 'Adding...' : `Add ${stats.willImport} transaction${stats.willImport !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

function DoneStep({ summary, onReset }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ fontSize: 48, marginBottom: '0.5rem' }}>✓</div>
      <h2 style={{ marginBottom: '0.5rem' }}>Imported</h2>
      <p style={{ color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
        {summary.count} transaction{summary.count !== 1 ? 's' : ''} added to your ledger
        {summary.count < summary.total && ` (${summary.total - summary.count} skipped)`}.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        <button className="btn btn-ghost" onClick={onReset}>Import another</button>
      </div>
    </div>
  )
}
