/**
 * TASARIM TASLAĞI — yapılandırmanın taşınabilir özeti
 *
 * Aynı veri iki ayrı işi görüyor:
 *
 *   1) GERİ TUŞU. Telefonda geri tuşuna basınca (ya da bir bağlantıya gidip
 *      dönünce) sayfa baştan kuruluyor ve React durumu sıfırdan başlıyordu:
 *      müşterinin kurduğu tasarım kayboluyordu. Taslak her değişiklikte
 *      sessionStorage'a yazılıyor, sayfa açılırken geri okunuyor.
 *
 *   2) "TEKLİFLERİM → DÜZENLE". Teklif kaydında tasarımın yalnızca özeti
 *      vardı; çoklu ekran düzeni okunur bir cümleydi ve geri açılamıyordu.
 *      Artık aynı taslak teklifle birlikte saklanıyor (quotes.config_json) ve
 *      "Düzenle" onu geri yüklüyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * YENİLEME İLE GERİ TUŞU AYRIMI
 *
 * İstenen davranış: geri tuşunda tasarım DURSUN, sayfa yenilenince SIFIRLANSIN.
 * sessionStorage ikisini de atlatır, yani tek başına ayrım yapmaz. Ayrımı
 * Navigation Timing veriyor: tarayıcı sayfanın nasıl açıldığını söylüyor
 * (`reload` | `navigate` | `back_forward`). Yenilemede taslak siliniyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NE SAKLANMIYOR: yüklenen görsel/videonun `contentUrl`'ü. O bir `blob:`
 * adresi ve yalnızca onu üreten sayfa yaşarken geçerli; saklansa geri
 * dönüldüğünde kırık bir bağlantı olurdu. Böyle bir içerik varken taslak
 * içerik türünü LED yüzeye düşürüyor — kırık görsel yerine dürüst bir varsayılan.
 */

const ANAHTAR = 'vds.tasarim.taslak.v1'

/** Yüklenen dosyaya bağlı içerik türleri — blob adresi olmadan anlamsızlar. */
const YUKLENEN_ICERIK = new Set(['upload', 'video'])

/** Yapılandırma durumundan saklanabilir düz bir nesne üretir. */
export function taslakOlustur(durum) {
  const yuklenen = YUKLENEN_ICERIK.has(durum.content)
  return {
    surum: 1,
    modelCode: durum.selectedModel?.modelCode ?? null,
    modelId: durum.selectedModel?.id ?? null,
    width: durum.width ?? 0,
    height: durum.height ?? 0,
    cols: durum.cols ?? 1,
    rows: durum.rows ?? 1,
    screenMode: durum.screenMode ?? 'single',
    screenType: durum.screenType ?? 'flat',
    orientation: durum.orientation ?? 'landscape',
    curveAmount: durum.curveAmount ?? 60,
    resolution: durum.resolution ?? 'FHD',
    sboxRedundancy: durum.sboxRedundancy ?? 'no',
    scene: durum.scene ?? 'none',
    // Çoklu ekranda her ekranın kendi düzeni — teklif özetindeki cümlenin aksine
    // makineye geri verilebilir hâli.
    screens: Array.isArray(durum.screens) ? durum.screens : [],
    content: yuklenen ? 'led' : (durum.content ?? 'led'),
    // Kendi dosyası olan içerik geri yüklenemiyor; kullanıcıya bunu söyleyelim
    icerikDustu: yuklenen,
  }
}

/** Taslak gerçekten bir tasarım taşıyor mu? Boş taslağı geri yüklemek anlamsız. */
export function taslakDolu(taslak) {
  return !!taslak && (!!taslak.modelCode || !!taslak.modelId)
}

/** Bu sayfa açılışı YENİLEME mi? (geri/ileri ve normal gezinme değil) */
export function sayfaYenilendi() {
  try {
    const giris = performance.getEntriesByType?.('navigation')?.[0]
    if (giris?.type) return giris.type === 'reload'
    // Çok eski tarayıcılar: bilgi yoksa yenileme SAYMA — veri kaybetmektense
    // fazladan geri yüklemek yeğdir.
    return false
  } catch {
    return false
  }
}

export function taslagiYaz(taslak) {
  try {
    if (!taslakDolu(taslak)) {
      sessionStorage.removeItem(ANAHTAR)
      return
    }
    sessionStorage.setItem(ANAHTAR, JSON.stringify(taslak))
  } catch {
    /* özel sekme / kota dolu — taslak tutulamıyorsa uygulama yine çalışır */
  }
}

export function taslagiOku() {
  try {
    const ham = sessionStorage.getItem(ANAHTAR)
    if (!ham) return null
    const t = JSON.parse(ham)
    return taslakDolu(t) ? t : null
  } catch {
    return null
  }
}

export function taslagiSil() {
  try {
    sessionStorage.removeItem(ANAHTAR)
  } catch {
    /* yok sayılır */
  }
}

/**
 * "Düzenle" akışı: Kontrol Merkezi taslağı buraya bırakır, konfigüratör
 * açılışta alıp yükler ve kutuyu boşaltır. Ayrı bir anahtar kullanılıyor —
 * geri tuşu taslağının üstüne yazıp kullanıcının o anki işini silmesin.
 */
const DUZENLE_ANAHTAR = 'vds.tasarim.duzenle.v1'

export function duzenlemeyeGonder(taslak) {
  try {
    sessionStorage.setItem(DUZENLE_ANAHTAR, JSON.stringify(taslak))
    return true
  } catch {
    return false
  }
}

/** Bekleyen "Düzenle" isteğini alır ve kutuyu boşaltır (bir kez okunur). */
export function duzenlemeyiAl() {
  try {
    const ham = sessionStorage.getItem(DUZENLE_ANAHTAR)
    if (!ham) return null
    sessionStorage.removeItem(DUZENLE_ANAHTAR)
    const t = JSON.parse(ham)
    return taslakDolu(t) ? t : null
  } catch {
    return null
  }
}
