import { useEffect, useRef, useState } from 'react'

const PRESETS = [30, 45, 60, 90]

export default function RestTimer() {
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const tick = useRef(null)

  useEffect(() => {
    if (running && remaining > 0) {
      tick.current = setTimeout(() => setRemaining((r) => r - 1), 1000)
    } else if (remaining === 0 && running) {
      setRunning(false)
      try {
        // Gentle ping at the end of a rest interval.
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 660; gain.gain.value = 0.08
        osc.start(); osc.stop(ctx.currentTime + 0.18)
      } catch { /* no audio, no problem */ }
      if (navigator.vibrate) navigator.vibrate(120)
    }
    return () => clearTimeout(tick.current)
  }, [running, remaining])

  const start = (s) => { setRemaining(s); setRunning(true) }
  const mm = String(Math.floor(remaining / 60)).padStart(1, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="rest-timer">
      <div className="rest-row">
        <span className="rest-label">Rest timer</span>
        <span className={`rest-clock ${running ? 'on' : ''}`}>{mm}:{ss}</span>
        {running ? (
          <button className="btn ghost sm" onClick={() => { setRunning(false); setRemaining(0) }}>Stop</button>
        ) : (
          <span className="rest-presets">
            {PRESETS.map((s) => (
              <button key={s} className="chip" onClick={() => start(s)}>{s}s</button>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
