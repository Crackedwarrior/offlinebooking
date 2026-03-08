import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { loadFonts } from './utils/fontLoader'
import { initializeWebOverrides } from './utils/webOverrides'

// Lazy load fonts after initial render to improve startup performance
loadFonts()

// Initialize web overrides (only in web environment, not Electron)
// This is deferred and uses requestIdleCallback to avoid blocking render
if (typeof window !== 'undefined') {
  // Defer web overrides initialization to avoid blocking React render
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      initializeWebOverrides()
    }, { timeout: 2000 })
  } else {
    setTimeout(() => {
      initializeWebOverrides()
    }, 100)
  }
}

// Start the app directly without strict environment validation
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
