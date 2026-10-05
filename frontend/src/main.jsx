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

/*
 * YENİ SÜRÜM GELİNCE KENDİLİĞİNDEN GÜNCELLE.
 *
 * Uygulama PWA: service worker eski dosyaları önbellekte tutuyor ve yeni
 * sürüm yayınlansa bile kullanıcı eski ekranı görmeye devam edebiliyordu
 * ("hiçbir şey değişmemiş" denen durum tam buydu). Aşağıdaki kayıt, yeni
 * bir service worker hazır olur olmaz onu devreye alıp sayfayı BİR KEZ
 * yeniliyor. Böylece güncelleme kullanıcıdan bir şey istemeden geliyor.
 *
 * Sonsuz döngü koruması: yenileme yalnızca controller gerçekten
 * değiştiğinde ve oturumda bir kez yapılıyor.
 *
 * ZORLA YENİLEMEDEN SONRA İKİNCİ BİR YENİLEME YOK.
 *
 * Ctrl+Shift+R service worker'ı atlıyor: sayfa doğrudan ağdan geliyor, yani
 * elimizdeki kod ZATEN en yenisi ve sayfa DENETLEYİCİSİZ (controller null)
 * açılıyor. Hemen ardından yeni SW kurulup bu sekmeyi devralınca
 * controllerchange tetikleniyordu ve sayfa 1-2 saniye sonra kendiliğinden bir
 * daha yenileniyordu — kullanıcının gördüğü "iki kere yeniliyor" buydu.
 * Aynısı siteye ilk girişte de oluyordu.
 *
 * Yenilemenin GEREKLİ olduğu tek durum, sayfanın bir SW tarafından
 * SERVİS EDİLMİŞ olması: o zaman ekrandaki dosyalar önbellekten gelen eski
 * sürüm olabilir. Açılışta denetleyici yoksa yenilenecek eski bir şey yok.
 */
if ('serviceWorker' in navigator) {
  let yenilendi = false
  const acilistaDenetleyici = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yenilendi || !acilistaDenetleyici) return
    yenilendi = true
    window.location.reload()
  })

  navigator.serviceWorker.ready
    .then((kayit) => {
      /* Bekleyen bir sürüm varsa hemen devreye al. */
      if (kayit.waiting) kayit.waiting.postMessage({ type: 'SKIP_WAITING' })
      kayit.addEventListener('updatefound', () => {
        const yeni = kayit.installing
        if (!yeni) return
        yeni.addEventListener('statechange', () => {
          if (yeni.state === 'installed' && navigator.serviceWorker.controller) {
            yeni.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
      /* Sayfa her açıldığında sunucuda yeni sürüm var mı diye bak. */
      kayit.update().catch(() => {})
    })
    .catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
