import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.jsx'
import ErrorBoundary, { logClientError } from './ErrorBoundary.jsx'

/*
 * ErrorBoundary yalnızca React render/lifecycle hatalarını yakalar.
 * Event handler'lardaki (onClick, fetch .then vb.) ve Promise
 * reddedilmelerindeki hatalar oraya hiç uğramadan tarayıcıyı sessizce
 * terk ederdi. Bu iki global dinleyici, uygulamanın HERHANGİ bir yerinde
 * oluşan bu tür hataları da aynı yapılandırılmış log fonksiyonuna yönlendirir.
 */
window.addEventListener('error', (event) => {
  logClientError('window.onerror', event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  logClientError('unhandledrejection', event.reason)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
