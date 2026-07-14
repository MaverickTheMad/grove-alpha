import { useState } from 'react'
import { Button, Chip } from '../../../ds'
import Icon from '../../../components/Icon'
import { normIng } from '../lib/shopping'
import { RECIPE_CATEGORIES } from '../constants'
import { sortByName } from '../../../lib/sort'
import { PageHeader, Empty } from '../ui'

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
      <PageHeader title="Recipes" action={
        <button onClick={onAddRecipe} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>+ New recipe</button>
      } />

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
          <Chip key={c} active={filterCat === c} style={{ whiteSpace: 'nowrap' }} onClick={() => setFilterCat(c)}>
            {c === 'Favorites' ? '♥ Favorites' : c}
          </Chip>
        ))}
        <Button size="sm" style={{ whiteSpace: 'nowrap' }} onClick={onAddRecipe}><Icon name="log" size={16} /> New</Button>
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
            return (
              <button key={r.id} className={`rcard ${isSelected ? 'on' : ''}`} onClick={() => onView(r)}>
                <div className="rcard-img">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 3V11M6 3C4.5 3 4 4.5 4 6V9C4 10 4.5 11 6 11M6 11V21M18 3C15.5 3 14 5.5 14 9V11H18M18 3V21" stroke="var(--border)" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '9.5px', fontWeight: 600, color: 'var(--app-accent)', background: 'color-mix(in srgb, var(--app-accent) 14%, transparent)', borderRadius: 6, padding: '2px 6px' }}>{isSelected ? '✓ this week' : (r.category || 'Other')}</span>
                  {r.is_favorite && <span style={{ position: 'absolute', top: 6, right: 6, color: 'var(--app-accent)', fontSize: 14 }}>★</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.25 }}>{r.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-soft)' }}>
                  {[r.cook_time && `${r.cook_time}m`, r.servings && `${r.servings} srv`, ings.length && `${ings.length} ing`].filter(Boolean).join(' · ') || <span>&nbsp;</span>}
                </div>
                <div className="view-cta">View ›</div>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
