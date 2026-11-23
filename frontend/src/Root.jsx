import { useEffect, useState, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import GirisKapisi from './GirisKapisi.jsx'
import { useSession } from './SessionContext.jsx'
import { guvenliLazy } from './guvenliLazy.js'
import { LanguageProvider } from './LanguageContext.jsx'
import { SessionProvider } from './SessionContext.jsx'
import { useTheme } from './useTheme.js'
import { queryClient } from './queryClient.js'
import ConnectionBanner from './ConnectionBanner.jsx'

// Yönetim UI'sı ana müşteri paketinde durmaz: kod bölme ile ayrı bir chunk
// üretilir, tarayıcı onu yalnızca #yonetim/#hesap açılınca çeker.
// PWA precache bu chunk'ı dahil etmez — bkz. vite.config.js globIgnores.
// guvenliLazy: sürüm atlayan sekmelerde eskimiş chunk adı yüzünden hata
// ekranına düşmesin diye yükleme başarısız olursa sayfa bir kez tazelenir.
const AdminPanel = guvenliLazy(() => import('./admin/AdminPanel.jsx'))
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

/*
 * AÇIK TANITIM KOPYASI.
 *
 * Sunucusuz barındırılan tanıtım kopyasında (GitHub Pages) davet kodu da
 * admin girişi de sunucuya sorulduğu için site giriş ekranında kilitli
 * kalıyor: kapı açılıyor ama içeri girilemiyordu. VITE_ACIK_DEMO=1 ile
 * DERLENEN kopyada konfigüratör doğrudan açılıyor ve API kapalıyken
 * devreye giren yerleşik demo veriyle çalışıyor (bkz. SAMPLE_CABINETS).
 *
 * Asıl yayında bu değişken tanımlı değil; orada kapı yerinde duruyor.
 * Yönetim (#yonetim) ve hesap (#hesap) sayfaları her durumda korumalı.
 */
const ACIK_DEMO = import.meta.env.VITE_ACIK_DEMO === '1'

/**
 * Konfigüratör oturum ister.
 *
 * Site artık herkese açık değil: giriş yapmamış ziyaretçi konfigüratörü
 * görmüyor, önce davet kodu ya da e-posta/parola ile kimliğini söylüyor.
 * Yönetim (#yonetim) ve hesap (#hesap) sayfaları bunun dışında; onların
 * kendi giriş ekranları var.
 */
function KorumaliUygulama({ theme, onToggleTheme }) {
  const { isAuthenticated } = useSession()
  if (!isAuthenticated && !ACIK_DEMO) return <GirisKapisi />
  return <App theme={theme} onToggleTheme={onToggleTheme} />
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
          {/*
            Açık tanıtım kopyasında sunucu OLMADIĞI için "API bağlantısı
            kurulamadı" uyarısı doğru ama anlamsız: ziyaretçinin
            düzeltebileceği bir şey yok, kopya zaten yerleşik demo veriyle
            çalışıyor. Asıl yayında uyarı yerinde duruyor.
          */}
          {!ACIK_DEMO && <ConnectionBanner />}
          {route === 'admin' ? (
            <Suspense fallback={null}>
              <AdminPanel />
            </Suspense>
          ) : route === 'account' ? (
            <Suspense fallback={null}>
              <ControlCenter />
            </Suspense>
          ) : (
            <KorumaliUygulama theme={theme} onToggleTheme={temaDegistir} />
          )}
        </SessionProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
