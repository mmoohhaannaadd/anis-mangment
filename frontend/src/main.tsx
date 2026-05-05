import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './contexts/SettingsContext.tsx'
import { OfflineProvider } from './contexts/OfflineContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </OfflineProvider>
  </StrictMode>,
)
