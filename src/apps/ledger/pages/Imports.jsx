import { useState, useMemo } from 'react'
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

const IconUpload = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M12 16V8M12 8l-3.5 3.5M12 8l3.5 3.5" stroke="var(--app-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" stroke="var(--app-accent)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export default function Imports() {
  const toast = useToast()
  const [step, setStep] = useState(STEP_UPLOAD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [file, setFile] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [detectedBank, setDetectedBank] = useState(null)
  const [manualBank, setManualBank] = useState('')
  const [parsed, setParsed] = useState([])
  const [pdfText, setPdfText] = useState('')
  const [pdfPageItems, setPdfPageItems] = useState(null)
  const [batchSummary, setBatchSummary] = useState(null)

  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const { data: rules } = useRecords('rule', { orderBy: 'priority' })
  const { data: imports, refetch: refetchImports } = useRecords('statement_import', { orderBy: 'created_at', ascending: false })
  const { data: allTransactions } = useRecords('transaction')

  const reset = () => {
    setStep(STEP_UPLOAD); setFile(null); setSelectedAccount(''); setDetectedBank(null)
    setManualBank(''); setParsed([]); setPdfText(''); setPdfPageItems(null)
    setBatchSummary(null); setError(null)
  }

  const handleFile = async (f) => {
    if (!f) return
    setFile(f); setError(null); setBusy(true)
    try {
      const { text, pageItems } = await extractPdfText(f)
      setPdfText(text); setPdfPageItems(pageItems)
      const bank = detectBank(text)
      setDetectedBank(bank)
      if (bank) setManualBank(bank)
    } catch (e) { setError('Failed to read PDF: ' + e.message) }
    setBusy(false)
  }

  const handleParse = async () => {
    if (!pdfText) { setError('No PDF loaded'); return }
    if (!manualBank) { setError('Please pick a bank'); return }
    if (!selectedAccount) { setError('Please pick an account'); return }
    setBusy(true); setError(null)
    try {
      const txns = parseWithBank(pdfText, manualBank, { pageItems: pdfPageItems })
      if (txns.length === 0) { setError('No transactions found. This statement format may not be supported yet.'); setBusy(false); return }
      const dates = txns.map(t => t.date).sort()
      const existing = allTransactions.filter(t => t.date >= dates[0] && t.date <= dates[dates.length - 1])
      const { transactions: ruled } = applyRules(txns, rules)
      const flagged = flagDuplicates(ruled, existing || [])
      setParsed(flagged.map(t => ({
        ...t, _import: !t._duplicate, _description: t.description, _date: t.date,
        _amount: t.amount, _category: t._categoryId, _account: selectedAccount, _person: null, _notes: ''
      })))
      setStep(STEP_REVIEW)
    } catch (e) { setError('Parse error: ' + e.message) }
    setBusy(false)
  }

  const updateRow = (i, patch) => setParsed(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r))

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
    setBusy(true); setError(null)
    try {
      const summary = await commitImport({ filename: file?.name || 'unknown.pdf', accountId: selectedAccount, parsed, pdfText })
      setBatchSummary(summary); setStep(STEP_DONE); refetchImports()
      toast.show(`${summary.count} transaction${summary.count !== 1 ? 's' : ''} added.`, {
        actionLabel: 'Undo',
        onAction: async () => { await undoImport(summary.batchId); refetchImports(); reset() }
      })
    } catch (e) { setError('Commit failed: ' + e.message) }
    setBusy(false)
  }

  const handleUndo = async (batchId) => {
    if (!confirm('Undo this entire import? All transactions from this batch will be deleted.')) return
    setBusy(true)
    try { await undoImport(batchId); refetchImports() }
    catch (e) { alert('Undo failed: ' + e.message) }
    setBusy(false)
  }

  return (
    <div className="ledger-page" style={{ paddingTop: 'var(--sp-5)' }}>
      {step !== STEP_UPLOAD && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ← Start over
          </button>
        </div>
      )}
      {error && (
        <div style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {step === STEP_UPLOAD && <UploadStep file={file} onFile={handleFile} busy={busy} detectedBank={detectedBank} manualBank={manualBank} setManualBank={setManualBank} accounts={accounts} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} onParse={handleParse} imports={imports} onUndo={handleUndo} />}
      {step === STEP_REVIEW && <ReviewStep parsed={parsed} updateRow={updateRow} categories={categories} accounts={accounts} stats={stats} onCommit={handleCommit} busy={busy} />}
      {step === STEP_DONE && batchSummary && <DoneStep summary={batchSummary} onReset={reset} />}
    </div>
  )
}

function UploadStep({ file, onFile, busy, detectedBank, manualBank, setManualBank, accounts, selectedAccount, setSelectedAccount, onParse, imports, onUndo }) {
  const [dragging, setDragging] = useState(false)
  const recent = (imports || []).filter(i => i.status === 'committed').slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      <div
        style={{ border: `1.5px dashed ${dragging ? 'var(--app-accent)' : 'var(--border)'}`, borderRadius: 16, padding: '36px 24px', textAlign: 'center', transition: 'border-color 0.15s', background: dragging ? 'color-mix(in srgb, var(--app-accent) 6%, transparent)' : 'transparent' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') onFile(f) }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', background: 'var(--bg-paper)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IconUpload />
        </div>
        {!file ? (
          <>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', color: 'var(--text)', margin: '0 0 6px' }}>Drop a PDF statement</p>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: '0 0 20px' }}>or pick one from your computer</p>
            <label style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '11px 20px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer', display: 'inline-block' }}>
              Choose file
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files[0])} />
            </label>
          </>
        ) : busy ? (
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>Reading PDF...</p>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loaded</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', color: 'var(--text)', margin: '0 0 4px' }}>{file.name}</p>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-xs)', margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p>
          </>
        )}
      </div>

      {file && !busy && (
        <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 20px' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)', margin: '0 0 16px' }}>Confirm details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field">
              <label>Bank</label>
              <select className="select" value={manualBank} onChange={(e) => setManualBank(e.target.value)}>
                <option value="">— Pick bank —</option>
                {PARSERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {detectedBank && detectedBank === manualBank && <small style={{ color: 'var(--ok)', fontSize: 'var(--fs-xs)' }}>Auto-detected</small>}
            </div>
            <div className="field">
              <label>Account</label>
              <select className="select" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                <option value="">— Pick account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '11px 20px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer', opacity: (!manualBank || !selectedAccount || busy) ? 0.5 : 1 }} onClick={onParse} disabled={!manualBank || !selectedAccount || busy}>
            {busy ? 'Parsing...' : 'Parse statement →'}
          </button>
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)' }}>Recent imports</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Undo available</span>
          </div>
          {recent.map(imp => (
            <div key={imp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imp.filename}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 2 }}>{imp.period_start} → {imp.period_end}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{imp.committed_count} rows</span>
              <button onClick={() => onUndo(imp.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--text-soft)', fontFamily: 'inherit', fontSize: 'var(--fs-xs)', cursor: 'pointer' }}>Undo</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewStep({ parsed, updateRow, categories, accounts, stats, onCommit, busy }) {
  const [showDupes, setShowDupes] = useState(true)
  const filtered = parsed.map((r, i) => ({ r, i })).filter(({ r }) => showDupes || !r._duplicate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Parsed', value: stats.total, color: 'var(--text)' },
          { label: 'Will import', value: stats.willImport, color: 'var(--app-accent)' },
          { label: 'Duplicates', value: stats.dupes, sub: 'Skipped by default', color: 'var(--warn)' },
          { label: 'Uncategorized', value: stats.uncategorized, sub: 'No rule matched', color: 'var(--text-soft)' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-soft)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 600, color }}>{value}</div>
            {sub && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>
          Net: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmt(stats.incomeTotal - stats.expenseTotal, { signed: true })}</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          <span style={{ color: 'var(--ok)' }}>+{fmt(stats.incomeTotal, { showCents: false })}</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          <span style={{ color: 'var(--danger)' }}>−{fmt(stats.expenseTotal, { showCents: false })}</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDupes} onChange={(e) => setShowDupes(e.target.checked)} />
          Show duplicates
        </label>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-paper)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={{ width: 40, padding: '12px 14px', textAlign: 'center' }}>
                  <input type="checkbox" checked={parsed.every(p => p._import)} onChange={(e) => { const v = e.target.checked; parsed.forEach((_, i) => updateRow(i, { _import: v && !parsed[i]._duplicate })) }} />
                </th>
                {['Date', 'Description', 'Category', 'Amount'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Amount' ? 'right' : 'left', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ r, i }) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)', background: r._duplicate ? 'color-mix(in srgb, var(--warn) 8%, transparent)' : 'transparent', opacity: r._import ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <input type="checkbox" checked={r._import} onChange={(e) => updateRow(i, { _import: e.target.checked })} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <input type="date" className="input mono" value={r._date} onChange={(e) => updateRow(i, { _date: e.target.value })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', width: 120 }} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r._duplicate && <span title="Likely duplicate" style={{ color: 'var(--warn)', flexShrink: 0 }}>⚠</span>}
                      <input className="input" value={r._description} onChange={(e) => updateRow(i, { _description: e.target.value })} style={{ fontSize: 'var(--fs-sm)', padding: '4px 8px', minWidth: 160 }} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <select className="select" value={r._category || ''} onChange={(e) => updateRow(i, { _category: e.target.value || null })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', minWidth: 130 }}>
                        <option value="">— None —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span style={{ color: 'var(--app-accent)', fontSize: '0.7rem' }}>▾</span>
                      {r._ruleId && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ok)' }}>rule</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <input type="number" step="0.01" className="input mono" value={r._amount} onChange={(e) => updateRow(i, { _amount: parseFloat(e.target.value) || 0 })} style={{ fontSize: 'var(--fs-sm)', padding: '4px 8px', width: 100, textAlign: 'right', color: r._amount < 0 ? 'var(--danger)' : 'var(--ok)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onCommit} disabled={busy || stats.willImport === 0} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '13px 22px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer', opacity: (busy || stats.willImport === 0) ? 0.5 : 1 }}>
          {busy ? 'Adding...' : `Add ${stats.willImport} transaction${stats.willImport !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

function DoneStep({ summary, onReset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--ok) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5L19 7" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>Import complete</h3>
      <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 24px' }}>
        {summary.count} transaction{summary.count !== 1 ? 's' : ''} added to your ledger
        {summary.count < summary.total && ` (${summary.total - summary.count} skipped)`}.
      </p>
      <button onClick={onReset} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 20px', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', color: 'var(--text)', cursor: 'pointer' }}>Import another</button>
    </div>
  )
}
