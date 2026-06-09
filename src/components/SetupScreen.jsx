import GroveMark from './GroveMark'

// Generic first-run gate. Each app supplies its own setup content (period
// start date, people, pets...). In beta this gate also covers passphrase +
// recovery-key setup and account creation (§7).
export default function SetupScreen({ appName, prompt, children, onContinue, continueLabel }) {
  return (
    <div className="screen setup">
      <div className="setup-mark">
        <GroveMark size={56} tile />
      </div>
      <h1>{appName}</h1>
      {prompt && <p className="sub" style={{ maxWidth: 'var(--measure)' }}>{prompt}</p>}
      <div className="setup-body stack">{children}</div>
      {onContinue && (
        <button className="btn primary block" onClick={onContinue}>
          {continueLabel || 'Continue'}
        </button>
      )}
    </div>
  )
}
