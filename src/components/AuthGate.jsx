import { useEffect, useState } from 'react'
import { getSession, onAuthChange } from '../lib/auth'
import Login from './Login'
import GroveMark from './GroveMark'

// Wraps the whole app. undefined = checking session (splash); null = show Login;
// session = render children. Identity is kept in sync inside lib/auth.
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    let alive = true
    getSession().then((s) => alive && setSession(s))
    const off = onAuthChange((s) => setSession(s))
    return () => { alive = false; off() }
  }, [])

  if (session === undefined) {
    return (
      <div className="app-root">
        <div className="splash">
          <GroveMark size={56} color="var(--accent)" />
        </div>
      </div>
    )
  }

  if (!session) return <Login />
  return children
}
