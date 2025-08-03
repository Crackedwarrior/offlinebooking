import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { validateEnvConfig } from './config/env'

// Validate environment configuration before starting the app
if (!validateEnvConfig()) {
  console.error('❌ Environment configuration validation failed. Please check your environment variables.');
  // Show a user-friendly error message with instructions
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; background: #f8fafc;">
      <div style="text-align: center; padding: 3rem; border: 1px solid #ef4444; border-radius: 12px; background: #fef2f2; max-width: 600px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        <h1 style="color: #dc2626; margin-bottom: 1.5rem; font-size: 1.875rem;">Configuration Error</h1>
        <p style="color: #7f1d1d; margin-bottom: 1.5rem; font-size: 1.125rem;">The application failed to start due to missing environment configuration.</p>
        
        <div style="background: #f1f5f9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; text-align: left;">
          <h3 style="color: #1e293b; margin-bottom: 1rem; font-size: 1.25rem;">How to fix this:</h3>
          <ol style="color: #475569; line-height: 1.6; margin-left: 1.5rem;">
            <li style="margin-bottom: 0.5rem;">Navigate to the <strong>frontend</strong> directory in your project</li>
            <li style="margin-bottom: 0.5rem;">Copy the <code style="background: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 4px;">env.example</code> file to <code style="background: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 4px;">.env</code></li>
            <li style="margin-bottom: 0.5rem;">Restart your development server</li>
          </ol>
        </div>
        
        <p style="color: #7f1d1d; font-size: 0.875rem; margin-top: 1rem;">Please check the browser console for detailed instructions.</p>
        
        <div style="margin-top: 2rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="color: #475569; font-size: 0.875rem; margin: 0;">
            <strong>Quick fix:</strong> Run this command in your terminal:<br>
            <code style="background: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.5rem;">cd frontend && copy env.example .env</code>
          </p>
        </div>
      </div>
    </div>
  `;
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
