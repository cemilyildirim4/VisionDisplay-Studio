/**
 * KENDİ FOTOĞRAFIM — TARAYICIDA KALICI KAYIT.
 *
 * Fotoğraf `URL.createObjectURL` ile gösteriliyor; o adres yalnızca onu
 * üreten sayfa yaşarken geçerli. Sayfa yenilenince (ya da sunucu bağlantısı
 * koptuğunda uygulama kendini tazelediğinde) adres ölüyor, fotoğrafla
 * birlikte referans ölçüsü ve ekranların yerleşimi de gidiyordu.
 *
 * Dosyanın kendisi bu yüzden IndexedDB'de saklanıyor: localStorage yalnızca
 * metin tutar, birkaç megabaytlık bir fotoğraf oraya sığmaz. IndexedDB Blob'u
 * olduğu gibi saklıyor ve sayfa açılışında yeni bir adres üretiliyor.
 *
 * KAYITTA NE VAR:
 *   blob   — fotoğrafın kendisi
 *   sahne  — fotoğrafın incelenmesinden çıkan kayıt (aday kareler, derinlik,
 *            zemin çizgisi…). Yeniden hesaplamak saniyeler sürüyor; sonuç
 *            düz veri olduğu için olduğu gibi saklanıyor.
 *   taslak — tasarımın tamamı (model, ekranlar, birleşim, yerleşim oranları)
 *   foto   — fotoğrafa ait ölçüm durumu: referans noktaları, işaretlenen
 *            alan, yerleştirilen ekranlar
 *
 * Her çağrı kendi hatasını yutuyor: gizli sekmede ya da depolama kapalıyken
 * IndexedDB açılmayabilir. Kayıt tutulamıyorsa uygulama eskisi gibi çalışır,
 * yalnızca geri yükleme olmaz.
 */

const VT_ADI = 'vds-mekan'
const VT_SURUM = 1
const DEPO = 'kayit'
const ANAHTAR = 'aktif'

function veritabani() {
  return new Promise((coz, at) => {
    if (typeof indexedDB === 'undefined') {
      at(new Error('IndexedDB yok'))
      return
    }
    const istek = indexedDB.open(VT_ADI, VT_SURUM)
    istek.onupgradeneeded = () => {
      const vt = istek.result
      if (!vt.objectStoreNames.contains(DEPO)) vt.createObjectStore(DEPO)
    }
    istek.onsuccess = () => coz(istek.result)
    istek.onerror = () => at(istek.error || new Error('IndexedDB açılamadı'))
    istek.onblocked = () => at(new Error('IndexedDB kilitli'))
  })
}

function islem(kip, is) {
  return veritabani().then(
    (vt) =>
      new Promise((coz, at) => {
        const t = vt.transaction(DEPO, kip)
        const depo = t.objectStore(DEPO)
        let sonuc
        try {
          sonuc = is(depo)
        } catch (e) {
          at(e)
          return
        }
        t.oncomplete = () => coz(sonuc && sonuc.result !== undefined ? sonuc.result : null)
        t.onerror = () => at(t.error || new Error('IndexedDB işlemi düştü'))
        t.onabort = () => at(t.error || new Error('IndexedDB işlemi iptal'))
      }),
  )
}

/** Kaydı yazar. Hata yutuluyor: kayıt tutulamaması uygulamayı durdurmaz. */
export async function mekaniKaydet(kayit) {
  try {
    await islem('readwrite', (depo) => depo.put({ ...kayit, zaman: Date.now() }, ANAHTAR))
    return true
  } catch {
    return false
  }
}

/** Kayıt varsa döner, yoksa null. */
export async function mekaniOku() {
  try {
    const k = await islem('readonly', (depo) => depo.get(ANAHTAR))
    return k && k.blob ? k : null
  } catch {
    return null
  }
}

/** Kaydı siler — yeni fotoğrafta ve "Sıfırla"da. */
export async function mekaniSil() {
  try {
    await islem('readwrite', (depo) => depo.delete(ANAHTAR))
    return true
  } catch {
    return false
  }
}
