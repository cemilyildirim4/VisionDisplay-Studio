/**
 * Video içerik yardımcıları.
 *
 * İki video kaynağı var:
 *   'sample' → public/sample-video.mp4 (örnek video)
 *   'video'  → kullanıcının yüklediği dosya (blob adresi)
 *
 * Fotoğraftan farkı: video canlı akar, bu yüzden hem DOM'da <video> öğesi
 * olarak (düz ve L tipi ekranlar) hem de tuvale kare kare çizilerek
 * (kavisli ekran) kullanılır.
 */

export const SAMPLE_VIDEO_SRC = '/sample-video.mp4'

/** Bu içerik türü video mu? Video ise kaynağını verir, değilse null. */
export function videoSrcFor(content, contentUrl) {
  if (content === 'sample') return SAMPLE_VIDEO_SRC
  if (content === 'video' && contentUrl) return contentUrl
  return null
}

/** Yüklemede kabul edilen video türleri */
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']

/**
 * Yüklenen videonun üst sınırı (MB).
 *
 * Video sunucuya gitmiyor; tarayıcıda bir blob URL olarak tutulup doğrudan
 * oynatılıyor, yani sınır ağ değil bellek kaynaklı. 100 MB fazla düşüktü —
 * kısa bir 4K tanıtım filmi bile geçemiyordu. 250 MB masaüstü tarayıcılarda
 * rahat taşınıyor; bunun üstü mobilde sekme çökmesi riskini artırıyor.
 */
export const VIDEO_MAX_MB = 250

/**
 * Bir görsel VEYA video öğesinin kaynak ölçüsü.
 * Görselde naturalWidth, videoda videoWidth kullanılır; tuvale çizen kod
 * ikisini ayırt etmek zorunda kalmasın diye tek yerden okunur.
 */
export function sourceSize(el) {
  if (!el) return null
  const w = el.videoWidth || el.naturalWidth || 0
  const h = el.videoHeight || el.naturalHeight || 0
  if (!w || !h) return null
  return { w, h }
}

/**
 * Tuvale çizilebilir mi? Görselde yüklenmiş olması, videoda ilk karenin
 * hazır olması (readyState >= 2) gerekir.
 */
export function isDrawable(el) {
  if (!el) return false
  if (el.tagName === 'VIDEO') return el.readyState >= 2
  return el.complete && el.naturalWidth > 0
}

/*
 * BÖLÜNMÜŞ VİDEOLARIN SENKRONU.
 *
 * Aynı videoyu paylaşan ekranların her biri kendi <video> öğesini çalıştırıyor
 * (tek bir öğeyi birden çok yerde göstermenin yolu yok). Ayrı öğeler aynı anda
 * başlasalar bile birbirinden kayıyor: her biri kendi çözme hızında ilerliyor,
 * sekme arka plana düşünce duruyor, döngü başına da farklı anda sarıyor.
 * Birkaç saniye içinde yan yana iki ekran videonun iki ayrı yerini gösteriyor.
 *
 * ÇÖZÜM: aynı kaynağı paylaşanlar bir deftere yazılıyor, saniyede bir
 * BİRİNCİSİNE bakılıyor ve ondan belirgin biçimde ayrılan geri alınıyor.
 * Eşik 0,25 saniye: gözle yakalanmayacak kadar küçük, sürekli ileri geri
 * atlamaya yol açmayacak kadar büyük.
 *
 * Tek bir zamanlayıcı var; defter boşalınca o da duruyor.
 */
const senkronDefteri = new Map() // kaynak → Set<video öğesi>
let senkronSayaci = null

function senkronEsitle() {
  for (const kume of senkronDefteri.values()) {
    if (kume.size < 2) continue
    /* readyState < 2 olan henüz tek kare bile çözmemiş; zamanı anlamsız. */
    const liste = [...kume].filter((v) => v.readyState >= 2 && v.duration > 0)
    if (liste.length < 2) continue
    const lider = liste[0]
    for (let i = 1; i < liste.length; i++) {
      const v = liste[i]
      const fark = Math.abs(v.currentTime - lider.currentTime)
      /* Döngü sarması: 9,9 s ile 0,1 s arasındaki gerçek fark 0,2 s. */
      const gercek = Math.min(fark, Math.abs(lider.duration - fark))
      if (gercek > 0.25) {
        try {
          v.currentTime = lider.currentTime
        } catch {
          /* Henüz aranabilir değilse bir sonraki turda düzelir. */
        }
      }
    }
  }
}

/**
 * Öğeyi senkron defterine yazar; bırakma işlevini döndürür.
 * Aynı kaynağı tek bir ekran kullanıyorsa hiçbir şey yapılmaz (eşitlenecek
 * kimse yok), ama kayıt yine de tutulur: ikinci ekran eklendiğinde ikisi
 * birden eşitlenmeye başlasın.
 */
export function senkronaKatil(kaynak, el) {
  if (!kaynak || !el) return () => {}
  let kume = senkronDefteri.get(kaynak)
  if (!kume) {
    kume = new Set()
    senkronDefteri.set(kaynak, kume)
  }
  kume.add(el)
  if (!senkronSayaci) senkronSayaci = setInterval(senkronEsitle, 1000)
  return () => {
    kume.delete(el)
    if (kume.size === 0) senkronDefteri.delete(kaynak)
    if (senkronDefteri.size === 0 && senkronSayaci) {
      clearInterval(senkronSayaci)
      senkronSayaci = null
    }
  }
}

/**
 * Verilen kaynak için oynatılmaya hazır bir <video> öğesi üretir.
 * DOM'a eklenmez — tuvale çizmek için kullanılır.
 */
export function createVideoElement(src) {
  const v = document.createElement('video')
  v.src = src
  v.loop = true
  v.muted = true // sessiz olmadan tarayıcı otomatik oynatmaya izin vermez
  v.defaultMuted = true
  v.playsInline = true
  v.autoplay = true
  v.preload = 'auto'
  /*
   * Öğe DOM'a eklenmediği için React değil, ETİKETLERİ elle yazıyoruz:
   * iOS otomatik oynatma iznini "muted" ve "playsinline" etiketlerine
   * bakarak veriyor, yalnızca JavaScript özelliğine bakmıyor.
   */
  v.setAttribute('muted', '')
  v.setAttribute('playsinline', '')
  v.play().catch(() => {}) // sekme arka plandaysa reddedilebilir, sorun değil
  /*
   * Kamera açıldığında iOS oynayan videoları duraklatıyor; kavisli ekran
   * o anda tuvale çizecek kare bulamayıp siyah kalıyordu. Duraklarsa
   * yeniden başlat.
   */
  v.addEventListener('pause', () => { v.play().catch(() => {}) })
  return v
}
