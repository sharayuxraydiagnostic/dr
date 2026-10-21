import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './components/ui'
import { SiteProvider } from './context/SiteContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <SiteProvider>
            <App />
          </SiteProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  </StrictMode>,
)
