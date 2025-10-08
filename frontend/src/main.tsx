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
