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

/**
 * Verilen kaynak için oynatılmaya hazır bir <video> öğesi üretir.
 * DOM'a eklenmez — tuvale çizmek için kullanılır.
 */
export function createVideoElement(src) {
  const v = document.createElement('video')
  v.src = src
  v.loop = true
  v.muted = true // sessiz olmadan tarayıcı otomatik oynatmaya izin vermez
  v.playsInline = true
  v.preload = 'auto'
  v.play().catch(() => {}) // sekme arka plandaysa reddedilebilir, sorun değil
  return v
}
