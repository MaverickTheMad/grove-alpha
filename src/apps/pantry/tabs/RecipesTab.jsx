import { useState } from 'react'
import Icon from '../../../components/Icon'
import { normIng, timeAgo } from '../lib/shopping'
import { RECIPE_CATEGORIES } from '../constants'
import { sortByName } from '../../../lib/sort'
import { SectionHeader, Empty } from '../ui'

const SORTED_CATEGORIES = sortByName(RECIPE_CATEGORIES.map((c) => ({ name: c }))).map((c) => c.name)

export default function RecipesTab({ recipes, selected, lastCooked, onView, onToggleFavorite, onAddRecipe }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [sortBy, setSortBy] = useState('az')

  const filtered = recipes
    .filter((r) => (filterCat === 'Favorites' ? r.is_favorite : filterCat === 'All' || (r.category || 'Other') === filterCat))
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name)
      if (sortBy === 'za') return b.name.localeCompare(a.name)
      if (sortBy === 'ingredients') return (b.ingredients?.length || 0) - (a.ingredients?.length || 0)
      if (sortBy === 'recent') {
        const ta = lastCooked[a.id] ? new Date(lastCooked[a.id]).getTime() : 0
        const tb = lastCooked[b.id] ? new Date(lastCooked[b.id]).getTime() : 0
        return tb - ta
      }
      return 0
    })

  return (
    <main className="screen">
      <SectionHeader eyebrow="recipe hub" title="All recipes" subtitle={`${recipes.length} recipes · ${recipes.filter((r) => r.is_favorite).length} favorites`} />

      <div className="row" style={{ marginBottom: 'var(--sp-3)', gap: 'var(--sp-2)' }}>
        <div className="grow" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-soft)' }}><Icon name="search" size={16} /></span>
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search recipes" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="recent">Recently made</option>
          <option value="ingredients">Most ingredients</option>
        </select>
      </div>

      <div className="row" style={{ gap: 'var(--sp-2)', overflowX: 'auto', marginBottom: 'var(--sp-4)', paddingBottom: 4 }}>
        {['All', 'Favorites', ...SORTED_CATEGORIES].map((c) => (
          <button key={c} className={`chip ${filterCat === c ? 'on' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setFilterCat(c)}>
            {c === 'Favorites' ? '♥ Favorites' : c}
          </button>
        ))}
        <button className="btn sm" style={{ whiteSpace: 'nowrap' }} onClick={onAddRecipe}><Icon name="log" size={16} /> New</button>
      </div>

      {recipes.length === 0 ? (
        <div className="empty">
          <span className="big"><Icon name="recipes" size={34} /></span>
          <p className="line">No recipes yet — import from a URL or PDF to start planning meals.</p>
          <div className="row" style={{ gap: 'var(--sp-2)', justifyContent: 'center', marginTop: 'var(--sp-3)' }}>
            <button className="btn primary sm" onClick={onAddRecipe}><Icon name="external" size={14} /> Import from URL</button>
            <button className="btn sm" onClick={onAddRecipe}><Icon name="log" size={14} /> Import from PDF</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <Empty icon="recipes" message="No recipes match — try a different filter." />
      ) : (
        <div className="grid2">
          {filtered.map((r) => {
            const ings = (r.ingredients || []).map(normIng)
            const isSelected = selected.includes(r.id)
            const ago = timeAgo(lastCooked[r.id])
            return (
              <button key={r.id} className={`rcard ${isSelected ? 'on' : ''}`} onClick={() => onView(r)}>
                <div className="spread" style={{ marginBottom: 'var(--sp-2)' }}>
                  <span className={`tag ${isSelected ? 'on' : ''}`}>{isSelected ? '✓ this week' : (r.category || 'Other')}</span>
                  <span className="row" style={{ gap: 'var(--sp-2)' }}>
                    {ago && <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>{ago}</span>}
                    <span role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(r) }}
                      style={{ color: r.is_favorite ? 'var(--danger)' : 'var(--text-soft)', display: 'inline-flex' }}>
                      <Icon name="heart" size={16} filled={!!r.is_favorite} />
                    </span>
                    {r.url && <span style={{ color: 'var(--text-soft)' }}><Icon name="external" size={14} /></span>}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', lineHeight: 1.15, marginBottom: 'var(--sp-2)' }}>{r.name}</div>
                <div className="row" style={{ gap: 'var(--sp-3)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {r.cook_time && <span className="row" style={{ gap: 4 }}><Icon name="clock" size={13} />{r.cook_time}</span>}
                  {r.servings && <span className="row" style={{ gap: 4 }}><Icon name="users" size={13} />{r.servings}</span>}
                  {ings.length > 0 && <span>{ings.length} ingredient{ings.length !== 1 ? 's' : ''}</span>}
                </div>
                {r.notes && <div className="p-sub" style={{ fontStyle: 'italic', marginBottom: 'var(--sp-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.notes}</div>}
                {ings.length > 0 && (
                  <div className="row" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 'var(--sp-2)' }}>
                    {ings.slice(0, 4).map((ing, i) => <span key={i} className="ingchip">{ing.name}</span>)}
                    {ings.length > 4 && <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>+{ings.length - 4} more</span>}
                  </div>
                )}
                <div className="view-cta">View <span aria-hidden>›</span></div>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
