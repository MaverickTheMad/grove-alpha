import { Button, Card } from '../../../ds'
import Icon from '../../../components/Icon'
import Sheet from '../../../components/Sheet'
import { normIng, timeAgo } from '../lib/shopping'

export default function RecipeView({ recipe, isSelected, onToggle, onEdit, onClose, onToggleFavorite, lastCooked }) {
  const ings = (recipe.ingredients || []).map(normIng)
  const ago = timeAgo(lastCooked[recipe.id])
  return (
    <Sheet
      open
      onClose={onClose}
      footer={
        <>
          <Button variant={isSelected ? 'default' : 'primary'} className="grow" style={isSelected ? { color: 'var(--ok)', borderColor: 'var(--ok)' } : {}} onClick={onToggle}>
            {isSelected ? '✓ Added to this week' : '+ Add to this week'}
          </Button>
          <Button onClick={onEdit}><Icon name="edit" size={16} /> Edit</Button>
        </>
      }
    >
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <span className="tag">{recipe.category || 'Other'}</span>
            {recipe.url && <a href={recipe.url} target="_blank" rel="noopener" style={{ color: 'var(--text-soft)' }} onClick={(e) => e.stopPropagation()}><Icon name="external" size={14} /></a>}
            {recipe.pdf_url && <a href={recipe.pdf_url} target="_blank" rel="noopener" className="tag" style={{ color: 'var(--app-accent)', background: 'var(--app-soft)' }} onClick={(e) => e.stopPropagation()}>PDF</a>}
            <span role="button" tabIndex={0} onClick={() => onToggleFavorite(recipe)} style={{ color: recipe.is_favorite ? 'var(--danger)' : 'var(--text-soft)', display: 'inline-flex' }}>
              <Icon name="heart" size={18} filled={!!recipe.is_favorite} />
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', lineHeight: 1.1 }}>{recipe.name}</h2>
          <div className="row" style={{ gap: 'var(--sp-4)', marginTop: 'var(--sp-2)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', flexWrap: 'wrap' }}>
            {recipe.cook_time && <span className="row" style={{ gap: 4 }}><Icon name="clock" size={15} />{recipe.cook_time}</span>}
            {recipe.servings && <span className="row" style={{ gap: 4 }}><Icon name="users" size={15} />{recipe.servings} servings</span>}
            {ings.length > 0 && <span>{ings.length} ingredients</span>}
            {ago && <span>{ago}</span>}
          </div>
        </div>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" size={20} /></button>
      </div>

      {recipe.notes && (
        <Card style={{ borderColor: 'var(--app-accent)', background: 'var(--app-weak)' }}>
          <div className="p-eyebrow" style={{ marginBottom: 4 }}>Notes</div>
          <p style={{ fontSize: 'var(--fs-sm)', maxWidth: 'var(--measure)' }}>{recipe.notes}</p>
        </Card>
      )}

      {ings.length > 0 ? (
        <div>
          <div className="p-eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Ingredients</div>
          <div className="stack" style={{ gap: 'var(--sp-2)' }}>
            {ings.map((ing, i) => (
              <div key={i} className="item" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'var(--fw-med)' }}>{ing.name}</span>
                {ing.quantity && <span className="p-sub mono">{ing.quantity}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="p-sub" style={{ textAlign: 'center', fontStyle: 'italic' }}>No ingredients added yet.</p>
      )}
    </Sheet>
  )
}
