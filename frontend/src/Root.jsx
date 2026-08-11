import { useEffect, useState, Suspense, lazy } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import { useTheme } from './useTheme.js'
import { queryClient } from './queryClient.js'

// Yönetim ekranı müşteri akışından tamamen ayrı bir hedef kitleye (dahili
// ekip) hitap ediyor; kod bölme ile normal ziyaretçinin paketine hiç girmez.
const AdminPanel = lazy(() => import('./AdminPanel.jsx'))

/**
 * Basit adres yönlendirmesi (ek kütüphane gerektirmez):
 *   http://localhost:5173/          → Konfigüratör
 *   http://localhost:5173/#yonetim  → Model yönetim ekranı
 */
export default function Root() {
  const [hash, setHash] = useState(window.location.hash)

  /*
   * Tema BURADA kuruluyor, App'in içinde değil. Yönetim ekranı App'i hiç
   * çizmediği için tema orada uygulanmıyordu; koyu temada açılsa bile
   * yönetim sayfası açık kalıyordu.
   */
  const { theme, toggle: temaDegistir } = useTheme()

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {hash === '#yonetim' ? (
          <Suspense fallback={null}>
            <AdminPanel />
          </Suspense>
        ) : (
          <App theme={theme} onToggleTheme={temaDegistir} />
        )}
      </LanguageProvider>
    </QueryClientProvider>
  )
}
