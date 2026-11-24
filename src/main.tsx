import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { compteConfigure, initialiserCompte } from './compte/compte'

// Comptes (facultatifs) : reprend la session et termine une connexion en cours
if (compteConfigure) void initialiserCompte()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
