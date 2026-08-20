import { lazy } from 'react'

/**
 * SÜRÜM ATLAYAN SEKMELER İÇİN GÜVENLİ TEMBEL YÜKLEME.
 *
 * 3D görünüm, yönetim paneli ve kontrol merkezi ayrı parçalar (chunk) hâlinde,
 * yalnızca açıldıklarında indiriliyor. Parça dosyalarının adında içerik özeti
 * var: `Scene3D-DlAscHkW.js`. Yeni sürüm yayınlandığında bu ad değişiyor ve
 * ESKİ ad sunucudan siliniyor.
 *
 * Sonuç: kullanıcı sayfayı sürüm çıkmadan önce açtıysa, sekmesi eski adı
 * hatırlıyor. "3D Görünüm"e bastığında tarayıcı artık var olmayan dosyayı
 * istiyor, içeri alma başarısız oluyor ve uygulama hata ekranına düşüyordu —
 * oysa uygulamada bir arıza yok, sadece sekme eskimiş.
 *
 * Çözüm: yükleme başarısız olursa sayfayı BİR KEZ tazele. Tazeleme yeni
 * index.html'i getiriyor, o da yeni parça adlarını biliyor ve işlem kaldığı
 * yerden yürüyor. "Bir kez" şartı sessionStorage'daki bayrakla korunuyor:
 * gerçekten bozuk bir yükleme (ağ kopuk, dosya bozuk) sonsuz tazeleme
 * döngüsüne girmesin, ikinci denemede hata olduğu gibi yukarı çıksın.
 */
const BAYRAK = 'vds-parca-tazelendi'
// İki tazeleme arasında beklenecek en az süre. Bunun altındaki ikinci hata
// "parça gerçekten yok" demektir; tazeleme çözmez, hata yukarı çıkmalı.
const BEKLEME_MS = 30000

export function guvenliLazy(yukle) {
  return lazy(() =>
    yukle().catch((hata) => {
      const simdi = Date.now()
      let sonTazeleme = 0
      try {
        sonTazeleme = Number(sessionStorage.getItem(BAYRAK)) || 0
      } catch {
        /* gizli sekmede sessionStorage kapalı olabilir */
      }

      // Yakın zamanda zaten tazelendiyse tekrar deneme: sonsuz döngü olur.
      if (simdi - sonTazeleme < BEKLEME_MS) throw hata

      try {
        sessionStorage.setItem(BAYRAK, String(simdi))
      } catch {
        /* yazılamıyorsa tek seferlik koruma yok; yine de bir kez dene */
      }
      window.location.reload()
      // Sayfa yenilenene kadar React'e "hâlâ yükleniyor" de ki bu arada hata
      // ekranı çizilmesin.
      return new Promise(() => {})
    })
  )
}
