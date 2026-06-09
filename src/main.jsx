import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Self-hosted fonts (SIL OFL) bundled by Vite — no Google hotlink (§8).
import '@fontsource-variable/fraunces'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

import './index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
