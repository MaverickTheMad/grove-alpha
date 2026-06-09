import { useState } from 'react'
import { signIn } from '../lib/auth'
import { signupEnabled } from '../config'
import GroveMark from './GroveMark'

// The wall. Username + password, Grove-branded, dark-first. On success the
// AuthGate flips automatically via onAuthChange — no manual redirect needed.
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password || busy) return
    setBusy(true)
    setError(null)
    try {
      await signIn(username, password)
      // AuthGate re-renders on the auth state change
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'That username or password is not right.'
        : err.message)
      setBusy(false)
    }
  }

  return (
    <div className="app-root">
      <div className="login">
        <GroveMark size={64} color="var(--accent)" />
        <h1 className="wordmark">Grove</h1>
        <p className="sub">Welcome home. Sign in to continue.</p>

        <form className="login-form" onSubmit={submit}>
          <div>
            <label className="field-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="btn primary block" type="submit" disabled={busy || !username || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {!signupEnabled && (
          <p className="sub login-foot">Accounts are set up by the household. No sign-up here yet.</p>
        )}
      </div>
    </div>
  )
}
