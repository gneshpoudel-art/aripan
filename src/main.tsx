import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { StoreProvider } from '@/context/Store'
import { CatalogProvider } from '@/context/CatalogContext'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('ARIPAN could not find the root element.')
}

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <CatalogProvider>
          <ToastProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </ToastProvider>
        </CatalogProvider>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>,
)
