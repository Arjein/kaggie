import React from 'react'
import ReactDOM from 'react-dom/client'
import OptionsPage from './components/options.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { ConfirmDialogProvider } from './components/ConfirmDialog.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmDialogProvider>
          <OptionsPage />
        </ConfirmDialogProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)