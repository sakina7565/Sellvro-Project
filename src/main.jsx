import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { DisputeNotificationProvider } from './context/DisputeNotificationContext.jsx'
import ToastStack from './components/ui/ToastStack.jsx'
import { useDisputeNotifications } from './context/DisputeNotificationContext.jsx'
import './index.css'
import App from './App.jsx'

function AppShell() {
  const { toasts, dismissToast } = useDisputeNotifications()
  return (
    <>
      <App />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DisputeNotificationProvider>
          <AppShell />
        </DisputeNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
