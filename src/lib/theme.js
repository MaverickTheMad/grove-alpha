// Shared theme control so the Settings app and the AppShell toggle stay in sync.
// Theme is one of 'auto' | 'dark' | 'light', persisted in localStorage and applied
// as a class on <html>. Subscribers (App.jsx) re-render when it changes anywhere.

const THEME_KEY = 'grove_theme'
export const THEME_CYCLE = ['auto', 'dark', 'light']
const listeners = new Set()

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.remove('theme-dark', 'theme-light')
  if (theme === 'dark') root.classList.add('theme-dark')
  if (theme === 'light') root.classList.add('theme-light')
}
export function getTheme() { return localStorage.getItem(THEME_KEY) || 'auto' }
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
  listeners.forEach((fn) => fn(theme))
}
export function cycleTheme() {
  const cur = getTheme()
  setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(cur) + 1) % THEME_CYCLE.length])
}
export function resolvedTheme(theme = getTheme()) {
  if (theme !== 'auto') return theme
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
export function subscribeTheme(fn) { listeners.add(fn); return () => listeners.delete(fn) }
