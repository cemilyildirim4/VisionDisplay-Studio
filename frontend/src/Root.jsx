import { useEffect, useState, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { guvenliLazy } from './guvenliLazy.js'
import { LanguageProvider } from './LanguageContext.jsx'
import { SessionProvider } from './SessionContext.jsx'
import { useTheme } from './useTheme.js'
import { queryClient } from './queryClient.js'
import ConnectionBanner from './ConnectionBanner.jsx'

// Yönetim / hesap ekranları müşteri ana paketinden ayrı tutulur (kod bölme).
const AdminPanel = guvenliLazy(() => import('./AdminPanel.jsx'))
const ControlCenter = guvenliLazy(() => import('./ControlCenter.jsx'))

/**
 * Basit adres yönlendirmesi (ek kütüphane gerektirmez):
 *   http://localhost:5173/          → Konfigüratör
 *   http://localhost:5173/#yonetim  → Model yönetim ekranı
 *   http://localhost:5173/#hesap    → Kontrol Merkezi / Hesap Yönetimi
 */
function routeFromHash(hash) {
  if (hash === '#yonetim' || hash.startsWith('#yonetim?')) return 'admin'
  if (hash === '#hesap' || hash.startsWith('#hesap?')) return 'account'
  return 'app'
}

export default function Root() {
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))

  /*
   * Tema BURADA kuruluyor, App'in içinde değil. Yönetim ekranı App'i hiç
   * çizmediği için tema orada uygulanmıyordu; koyu temada açılsa bile
   * yönetim sayfası açık kalıyordu.
   */
  const { theme, toggle: temaDegistir } = useTheme()

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SessionProvider>
          <ConnectionBanner />
          {route === 'admin' ? (
            <Suspense fallback={null}>
              <AdminPanel />
            </Suspense>
          ) : route === 'account' ? (
            <Suspense fallback={null}>
              <ControlCenter />
            </Suspense>
          ) : (
            <App theme={theme} onToggleTheme={temaDegistir} />
          )}
        </SessionProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
