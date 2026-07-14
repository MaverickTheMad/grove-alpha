import { useEffect, useState } from 'react'
import * as store from '../lib/store.js'
import { levelProgress, levelTitle, REWARD_EMOJIS, fmtRelative, isoToLocalDateStr } from '../constants.js'
import Sheet from '../../../components/Sheet'
import { Button, Card } from '../../../ds'

export default function RewardsTab({ person, profile, onProfileChange }) {
  const [rewards, setRewards] = useState(null)
  const [history, setHistory] = useState([])
  const [edit, setEdit] = useState(null)
  const [redeemTarget, setRedeemTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [r, h] = await Promise.all([
      store.listRewards(person),
      store.listRedemptions(person, { limit: 30 }),
    ])
    setRewards(r || [])
    setHistory(h || [])
  }
  useEffect(() => { setRewards(null); load() }, [person])

  const prog = levelProgress(profile.xp)

  const performRedeem = async (reward) => {
    if (busy || !reward) return
    setRedeemTarget(null)
    setBusy(true)
    try {
      const fresh = await store.getProfile(person)
      const have = fresh?.tokens ?? profile.tokens
      if (have < reward.cost_tokens) { alert('Not enough tokens anymore.'); return }
      await store.addRedemption(person, {
        reward_id: reward.id, name: reward.name, emoji: reward.emoji, cost_tokens: reward.cost_tokens,
      })
      await store.updateProfile(person, { tokens: have - reward.cost_tokens })
      await load()
      onProfileChange?.()
    } finally {
      setBusy(false)
    }
  }

  const saveItem = async (item) => {
    if (item.id) {
      await store.updateReward(item.id, { name: item.name, emoji: item.emoji, cost_tokens: item.cost_tokens })
    } else {
      const maxOrder = (rewards || []).reduce((m, r) => Math.max(m, r.sort_order), 0)
      await store.addReward(person, { name: item.name, emoji: item.emoji, cost_tokens: item.cost_tokens, sort_order: maxOrder + 1 })
    }
    setEdit(null)
    load()
  }

  const removeItem = async (id) => {
    await store.deleteReward(id)
    setEdit(null)
    load()
  }

  if (rewards === null) {
    return <div className="empty"><div className="big">⏳</div><p>Loading rewards…</p></div>
  }

  return (
    <div className="tab-pad">
      <header className="f-page-header">
        <h1 className="f-title">Rewards</h1>
      </header>
      {/* Wallet */}
      <Card className="wallet">
        <div className="wallet-top">
          <div>
            <div className="lvl-title">{levelTitle(profile.level)}</div>
            <div className="muted sm">Level {profile.level}</div>
          </div>
          <div className="token-balance">🪙 {profile.tokens}<span className="muted sm"> tokens</span></div>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: `${prog.pct}%` }} /></div>
        <div className="muted sm">{prog.toNext} XP to Level {prog.level + 1}</div>
      </Card>

      <div className="card-head">
        <h3 className="section-h">Rewards shop</h3>
        <Button variant="ghost" size="sm" onClick={() => setEdit({})}>+ Add</Button>
      </div>

      <div className="reward-grid">
        {rewards.map((r) => {
          const afford = profile.tokens >= r.cost_tokens
          return (
            <div key={r.id} className={`reward-card ${afford ? '' : 'cant'}`}>
              <button className="reward-edit" onClick={() => setEdit(r)} aria-label="Edit">✎</button>
              <div className="reward-emoji">{r.emoji || '🎁'}</div>
              <div className="reward-name">{r.name}</div>
              <div className="reward-cost mono">🪙 {r.cost_tokens}</div>
              <Button variant="primary" size="sm" block disabled={!afford || busy}
                onClick={() => setRedeemTarget(r)}>
                {afford ? 'Redeem' : 'Need more'}
              </Button>
            </div>
          )
        })}
        {rewards.length === 0 && (
          <div className="empty"><div className="big">🎁</div><p>No rewards yet — add a treat to work toward.</p></div>
        )}
      </div>

      {history.length > 0 && (
        <>
          <h3 className="section-h">Redeemed</h3>
          <div className="hist-list">
            {history.map((h) => (
              <Card key={h.id} className="hist-row static">
                <span className="hist-emoji">{h.emoji || '🎁'}</span>
                <span className="grow">
                  <span className="hist-title">{h.name}</span>
                  <span className="sub">{fmtRelative(isoToLocalDateStr(h.redeemed_at))}</span>
                </span>
                <span className="mono muted">−{h.cost_tokens} 🪙</span>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Redeem confirm — Sheet instead of browser confirm() */}
      <Sheet
        open={!!redeemTarget}
        onClose={() => setRedeemTarget(null)}
        title="Redeem reward?"
        footer={
          <div className="row-btns">
            <Button variant="ghost" onClick={() => setRedeemTarget(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy}
              onClick={() => performRedeem(redeemTarget)}>
              Spend {redeemTarget?.cost_tokens} tokens
            </Button>
          </div>
        }
      >
        <div className="redeem-preview">
          <span className="redeem-emoji">{redeemTarget?.emoji || '🎁'}</span>
          <div>
            <div className="ex-name">{redeemTarget?.name}</div>
            <div className="muted sm">{profile.tokens} tokens available</div>
          </div>
        </div>
      </Sheet>

      <RewardEditor item={edit} onClose={() => setEdit(null)} onSave={saveItem} onDelete={removeItem} />
    </div>
  )
}

function RewardEditor({ item, onClose, onSave, onDelete }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [cost, setCost] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name || '')
      setEmoji(item.emoji || '🎁')
      setCost(item.cost_tokens ? String(item.cost_tokens) : '')
    }
  }, [item])

  const valid = name.trim() && Number(cost) > 0
  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item?.id ? 'Edit reward' : 'Add a reward'}
      footer={
        <div className="row-btns">
          {item?.id && <button className="btn ghost danger" onClick={() => onDelete(item.id)}>Delete</button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid}
            onClick={() => onSave({ id: item?.id, name: name.trim(), emoji, cost_tokens: Number(cost) })}>
            Save
          </Button>
        </div>
      }
    >
      <label className="field block"><span>Reward</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spa day" />
      </label>
      <label className="field block"><span>Cost (tokens)</span>
        <input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="100" />
      </label>
      <div className="field block"><span>Icon</span>
        <div className="emoji-grid">
          {REWARD_EMOJIS.map((e) => (
            <button key={e} className={`emoji-opt ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
