import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@fontsource/noto-sans-kannada/400.css'
import '@fontsource/noto-sans-kannada/700.css'

// Start the app directly without strict environment validation
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Load web-only CSS overrides when not running inside Electron
try {
  const isElectron = !!(window as any).electronAPI || !!(window as any).process?.versions?.electron;
  if (!isElectron) {
    import('./web-overrides.css');
  }
} catch {}