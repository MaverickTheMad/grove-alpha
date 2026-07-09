import { useState } from 'react'
import Sheet from '../../../components/Sheet'
import { useToast } from '../../../components/Toast'
import { DIFFICULTIES, QUEST_CATEGORIES, DEFAULT_HABITS } from '../constants'

const diffById = Object.fromEntries(DIFFICULTIES.map(d => [d.id, d]))

function DifficultyChip({ id }) {
  const d = diffById[id] || diffById.easy
  return <span className={`quest-diff-chip quest-diff-${d.id}`}>{d.label}</span>
}

function QuestRow({ quest, onComplete, onDelete }) {
  const [completing, setCompleting] = useState(false)

  async function handleComplete() {
    setCompleting(true)
    await onComplete()
  }

  return (
    <div className={`quest-row${completing ? ' quest-row--completing' : ''}`}>
      <button
        className={`quest-check${completing ? ' quest-check--done' : ''}`}
        onClick={handleComplete}
        aria-label={`Complete: ${quest.title}`}
      >
        {completing && <span className="quest-check-mark">✓</span>}
      </button>
      <div className="quest-row-body">
        <span className="quest-row-title">{quest.title}</span>
        <div className="quest-row-meta">
          <DifficultyChip id={quest.difficulty} />
          <span className="quest-xp-chip">+{quest.xp_reward ?? 10} XP</span>
          {quest.category && <span className="quest-cat-chip">{quest.category}</span>}
          {quest.due && <span className="quest-due-chip">{quest.due}</span>}
        </div>
      </div>
      <button className="quest-del" onClick={onDelete} aria-label={`Remove quest: ${quest.title}`}>×</button>
    </div>
  )
}

function AddQuestForm({ onSave, onCancel }) {
  const [title, setTitle]         = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [category, setCategory]   = useState('')
  const [due, setDue]             = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)

  const xp_reward = diffById[difficulty]?.xp ?? 25
  const sortedCategories = [...QUEST_CATEGORIES].sort()

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), difficulty, xp_reward, category: category || null, due: due || null, notes: notes.trim() || null })
    } finally {
      setSaving(false)
    }
  }

  function useTemplate(t) {
    setTitle(t.title)
    setDifficulty(t.difficulty)
    setCategory(t.category || '')
  }

  return (
    <div className="quest-add-form">
      <div className="field">
        <span className="label">Quest name</span>
        <input
          className="field-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="What needs doing?"
          autoFocus
        />
      </div>

      <div className="field">
        <span className="label">Difficulty</span>
        <div className="pill-wrap">
          {DIFFICULTIES.map(d => (
            <button key={d.id} className={'pill' + (difficulty === d.id ? ' sel' : '')} onClick={() => setDifficulty(d.id)}>
              {d.label} · {d.xp} XP
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Category</span>
        <div className="pill-wrap">
          {sortedCategories.map(c => (
            <button key={c} className={'pill' + (category === c ? ' sel' : '')} onClick={() => setCategory(prev => prev === c ? '' : c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Due (optional)</span>
        <input type="date" className="field-input" value={due} onChange={e => setDue(e.target.value)} />
      </div>

      <div className="field">
        <span className="label">Notes (optional)</span>
        <input className="field-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any details…" />
      </div>

      {title === '' && (
        <div className="quest-templates">
          <div className="quest-templates-label">Or start with a common quest</div>
          <div className="pill-wrap">
            {DEFAULT_HABITS.map(t => (
              <button key={t.title} className="pill" onClick={() => useTemplate(t)}>{t.title}</button>
            ))}
          </div>
        </div>
      )}

      <div className="quest-add-footer">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : 'Add quest'}
        </button>
      </div>
    </div>
  )
}

export default function QuestsTab({ ctx }) {
  const { prog, rank, streak, totalXp, activeQuests, handleComplete, handleDelete, handleRestore, handleAdd } = ctx
  const [adding, setAdding] = useState(false)
  const { show: showToast } = useToast()

  function onDelete(quest) {
    handleDelete(quest.id)
    showToast('Quest removed', {
      actionLabel: 'Undo',
      onAction: () => handleRestore(quest.id),
    })
  }

  async function onComplete(quest) {
    await handleComplete(quest)
    showToast(`+${quest.xp_reward ?? 10} XP — ${quest.title}`, { duration: 2200 })
  }

  async function onAdd(fields) {
    await handleAdd(fields)
    setAdding(false)
  }

  // Sort active quests: by due date (soonest first), then by creation order
  const sorted = [...activeQuests].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due)
    if (a.due) return -1
    if (b.due) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  return (
    <>
      {/* Quiet status chips */}
      <div className="quest-status">
        <span className="quest-status-chip">{rank}</span>
        <span className="quest-status-chip num">Lv {prog.level}</span>
        <span className="quest-status-chip num">{totalXp} XP</span>
        {streak > 0 && <span className="quest-status-chip quest-streak">🔥 {streak} day{streak === 1 ? '' : 's'}</span>}
      </div>

      {sorted.length === 0 ? (
        <div className="card quest-empty-card">
          <p className="quest-empty-line">No quests yet — add your first.</p>
          <button className="btn primary" onClick={() => setAdding(true)}>Add a quest</button>
        </div>
      ) : (
        <>
          <div className="quest-list card">
            {sorted.map(q => (
              <QuestRow key={q.id} quest={q} onComplete={() => onComplete(q)} onDelete={() => onDelete(q)} />
            ))}
          </div>
          <button className="btn primary block" onClick={() => setAdding(true)}>Add a quest</button>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="New quest">
        <AddQuestForm onSave={onAdd} onCancel={() => setAdding(false)} />
      </Sheet>
    </>
  )
}
