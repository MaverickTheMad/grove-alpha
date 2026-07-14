import { useState, useEffect } from 'react'
import Sheet from '../../../components/Sheet'
import { useToast } from '../../../components/Toast'
import { sortByName } from '../../../lib/sort'
import { DIFFICULTIES, QUEST_CATEGORIES, DEFAULT_HABITS, todayStr, addDays } from '../constants'
import { Button, Card, Chip } from '../../../ds'

const diffById = Object.fromEntries(DIFFICULTIES.map(d => [d.id, d]))

function DifficultyChip({ id }) {
  const d = diffById[id] || diffById.easy
  return <span className={`quest-diff-chip quest-diff-${d.id}`}>{d.label}</span>
}

function MemberDot({ color, size = 8 }) {
  return <span className="q-member-dot" style={{ background: color, width: size, height: size }} />
}

function AssigneePill({ assignee, members }) {
  if (!assignee) return <span className="q-assignee-anyone">Anyone</span>
  const m = members.find(x => x.id === assignee)
  if (!m) return null
  return (
    <span className="q-assignee-pill">
      <MemberDot color={m.color} />
      {m.name}
    </span>
  )
}

// ── Completion Sheet ──────────────────────────────────────────────────────────
function CompleteSheet({ open, quest, members, defaultPerson, onConfirm, onClose }) {
  const [completedBy, setCompletedBy] = useState(defaultPerson)

  // Reset to default each time the sheet opens
  useEffect(() => { if (open) setCompletedBy(defaultPerson) }, [open, defaultPerson])

  return (
    <Sheet open={open} onClose={onClose} title="Log this quest?"
      footer={
        <div className="row-btns">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(completedBy)}>Log it.</Button>
        </div>
      }
    >
      <p className="q-log-xp">+{quest?.xp_reward ?? 10} XP</p>
      <div className="field">
        <span className="label">Who did this?</span>
        <div className="pill-wrap">
          {members.map(m => (
            <button
              key={m.id}
              className={'pill' + (completedBy === m.id ? ' sel' : '')}
              onClick={() => setCompletedBy(m.id)}
            >
              <MemberDot color={m.color} size={7} />
              {m.name}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

// ── Quest row ─────────────────────────────────────────────────────────────────
function QuestRow({ quest, members, onComplete, onDelete }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className={`quest-row${sheetOpen ? ' quest-row--completing' : ''}`}>
        <button
          className="quest-check"
          onClick={() => setSheetOpen(true)}
          aria-label={`Complete: ${quest.title}`}
        />
        <div className="quest-row-body">
          <div className="quest-row-title-line">
            <span className="quest-row-title">{quest.title}</span>
            <AssigneePill assignee={quest.assignee ?? null} members={members} />
          </div>
          <div className="quest-row-meta">
            <DifficultyChip id={quest.difficulty} />
            <span className="quest-xp-chip">+{quest.xp_reward ?? 10} pts</span>
            {quest.category && <span className="quest-cat-chip">{quest.category}</span>}
            {quest.due && <span className="quest-due-chip">{quest.due}</span>}
          </div>
        </div>
        <button className="quest-del" onClick={onDelete} aria-label={`Remove task: ${quest.title}`}>×</button>
      </div>
      <CompleteSheet
        open={sheetOpen}
        quest={quest}
        members={members}
        defaultPerson={members[0]?.id}
        onConfirm={(completedBy) => { setSheetOpen(false); onComplete(completedBy) }}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}

// ── Add quest form ────────────────────────────────────────────────────────────
function AddQuestForm({ onSave, onCancel, members }) {
  const [title, setTitle]         = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [category, setCategory]   = useState('')
  const [due, setDue]             = useState('')
  const [notes, setNotes]         = useState('')
  const [assignee, setAssignee]   = useState(null)
  const [saving, setSaving]       = useState(false)

  const xp_reward = diffById[difficulty]?.xp ?? 25
  const sortedCategories = [...QUEST_CATEGORIES].sort()
  const sortedMembers = sortByName(members)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), difficulty, xp_reward, category: category || null, due: due || null, notes: notes.trim() || null, assignee })
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
        <span className="label">Task name</span>
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
              {d.label} · {d.xp} pts
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Assign to</span>
        <div className="pill-wrap">
          <button className={'pill' + (assignee === null ? ' sel' : '')} onClick={() => setAssignee(null)}>
            Anyone
          </button>
          {sortedMembers.map(m => (
            <button
              key={m.id}
              className={'pill q-assignee-opt' + (assignee === m.id ? ' sel' : '')}
              onClick={() => setAssignee(m.id)}
            >
              <MemberDot color={m.color} size={7} />
              {m.name}
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
          <div className="quest-templates-label">Or start with a common task</div>
          <div className="pill-wrap">
            {DEFAULT_HABITS.map(t => (
              <button key={t.title} className="pill" onClick={() => useTemplate(t)}>{t.title}</button>
            ))}
          </div>
        </div>
      )}

      <div className="quest-add-footer">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : 'Add task'}
        </Button>
      </div>
    </div>
  )
}

function groupQuests(quests) {
  const today = todayStr()
  const weekEnd = addDays(today, 7)
  const groups = { today: [], week: [], later: [] }
  for (const q of quests) {
    if (!q.due || q.due > weekEnd) groups.later.push(q)
    else if (q.due === today) groups.today.push(q)
    else groups.week.push(q)
  }
  return groups
}

const FILTERS = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'anyone',   label: 'Anyone'   },
  { id: 'mine',     label: 'Mine'     },
]

export default function QuestsTab({ ctx }) {
  const { activeQuests, handleComplete, handleDelete, handleRestore, handleAdd, currentUser, members } = ctx
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('everyone')
  const { show: showToast } = useToast()

  function onDelete(quest) {
    handleDelete(quest.id)
    showToast('Task removed', {
      actionLabel: 'Undo',
      onAction: () => handleRestore(quest.id),
    })
  }

  async function onComplete(quest, completedBy) {
    const m = members.find(x => x.id === completedBy)
    await handleComplete(quest, completedBy)
    showToast(`Logged. +${quest.xp_reward ?? 10} XP to ${m?.name ?? completedBy}.`, { duration: 2400 })
  }

  async function onAdd(fields) {
    await handleAdd(fields)
    setAdding(false)
  }

  const sorted = [...activeQuests].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due)
    if (a.due) return -1
    if (b.due) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const myId = currentUser?.id
  const filtered = sorted.filter(q => {
    if (filter === 'mine')    return q.assignee === myId
    if (filter === 'anyone')  return (q.assignee ?? null) === null
    return true
  })

  const groups = groupQuests(filtered)

  const QuestGroup = ({ label, quests, labelClass }) =>
    quests.length === 0 ? null : (
      <div className="q-group">
        <div className={`q-group-label ${labelClass}`}>{label}</div>
        {quests.map(q => (
          <QuestRow
            key={q.id}
            quest={q}
            members={members}
            onComplete={(completedBy) => onComplete(q, completedBy)}
            onDelete={() => onDelete(q)}
          />
        ))}
      </div>
    )

  return (
    <>
      <div className="q-header">
        <h1 className="q-title">Tasks</h1>
        {activeQuests.length > 0 && (
          <span className="q-count">{activeQuests.length} active</span>
        )}
      </div>

      <div className="q-filter-row">
        {FILTERS.map(f => (
          <Chip
            key={f.id}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 && activeQuests.length === 0 ? (
        <Card className="quest-empty-card">
          <p className="quest-empty-line">No tasks yet — add your first.</p>
          <Button variant="primary" onClick={() => setAdding(true)}>Add a task</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="quest-empty-card">
          <p className="quest-empty-line">No tasks match this filter.</p>
        </Card>
      ) : (
        <>
          <QuestGroup label="Today" quests={groups.today} labelClass="today" />
          <QuestGroup label="This week" quests={groups.week} labelClass="later" />
          <QuestGroup label="Later" quests={groups.later} labelClass="later" />
        </>
      )}

      <button className="q-add-btn" onClick={() => setAdding(true)}>Add a task</button>

      <Sheet open={adding} onClose={() => setAdding(false)} title="New task">
        <AddQuestForm onSave={onAdd} onCancel={() => setAdding(false)} members={members} />
      </Sheet>
    </>
  )
}
