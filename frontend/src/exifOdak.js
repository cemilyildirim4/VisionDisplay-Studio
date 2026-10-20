/**
 * FOTOĞRAFIN EXIF'İNDEN ODAK UZAKLIĞI (35 mm EŞDEĞERİ).
 *
 * NEDEN. Ölçüm, kameranın görüş açısını bilmeden kesin olamıyor: fotoğraf
 * düz tutulup çekildiyse dikey kenarlar paralel kalır, o yönün kaçış
 * noktası sonsuza gider ve odak uzaklığı kareden türetilemez. Elde tek
 * seçenek tahmin kalıyor (~65° görüş açısı) ve hata doğrudan ölçüye biniyor
 * (ölçüldü: geniş açılı bir karede %26'ya kadar).
 *
 * Oysa telefonlar çektikleri kareye odak uzaklığını YAZIYOR. Okunabildiğinde
 * tahmine hiç gerek kalmıyor.
 *
 * 35 mm EŞDEĞERİ NEDEN. Gerçek odak (mm) tek başına yetmiyor; sensörün
 * fiziksel genişliği de gerekiyor ve o çoğu karede yok. 35 mm eşdeğeri bu
 * ikisini zaten birleştirmiş hâli: 36 mm genişliğinde bir kareye göre
 * verilmiş odak. Pikseldeki karşılığı bu yüzden sensörden bağımsız:
 *
 *     f_piksel = (f35 / 36) × görüntünün piksel genişliği
 *
 * KISITI. WhatsApp ve benzeri uygulamalar EXIF'i siliyor; ekran
 * görüntülerinde zaten yok. Bu yüzden okunamaması olağan sayılıyor ve
 * çağıran taraf o durumda ikinci referansa düşüyor (bkz. App.jsx).
 *
 * Kütüphane kullanılmıyor: ihtiyaç tek bir etiket ve JPEG'in başındaki
 * birkaç yüz bayt. Bütün dosyayı ayrıştıran bir bağımlılık eklemek bu iş
 * için fazla olurdu.
 */

/* Aranan etiketler. */
const ETIKET_35MM = 0xa405 /* FocalLengthIn35mmFilm — SHORT, doğrudan değer */
const ETIKET_EXIF_IFD = 0x8769 /* Exif alt dizinine işaretçi */

/**
 * JPEG baytlarından 35 mm eşdeğeri odak uzaklığını (mm) okur.
 *
 * @param {ArrayBuffer} tampon
 * @returns {number|null} mm cinsinden odak, okunamazsa null
 */
export function exif35mmOdak(tampon) {
  try {
    const g = new DataView(tampon)
    if (g.byteLength < 4) return null
    /* JPEG mi (SOI). */
    if (g.getUint16(0, false) !== 0xffd8) return null

    /* APP1 (Exif) parçasını bul. */
    let yer = 2
    while (yer + 4 <= g.byteLength) {
      if (g.getUint8(yer) !== 0xff) return null
      const im = g.getUint8(yer + 1)
      const uzunluk = g.getUint16(yer + 2, false)
      /* SOS: görüntü verisi başladı, EXIF yok. */
      if (im === 0xda) return null
      if (im === 0xe1 && yer + 10 <= g.byteLength) {
        /* "Exif\0\0" */
        if (
          g.getUint32(yer + 4, false) === 0x45786966 &&
          g.getUint16(yer + 8, false) === 0x0000
        ) {
          return tiffOku(g, yer + 10)
        }
      }
      yer += 2 + uzunluk
    }
    return null
  } catch {
    /* Bozuk dosya ölçümü bozmasın: okunamadı sayılıyor. */
    return null
  }
}

/* TIFF başlığı ve dizinleri. */
function tiffOku(g, bas) {
  if (bas + 8 > g.byteLength) return null
  const duzen = g.getUint16(bas, false)
  /* II = küçük uçlu, MM = büyük uçlu. */
  const kucuk = duzen === 0x4949
  if (!kucuk && duzen !== 0x4d4d) return null
  if (g.getUint16(bas + 2, kucuk) !== 42) return null
  const ifd0 = g.getUint32(bas + 4, kucuk)
  if (!(ifd0 > 0)) return null

  /* Önce ana dizin: bazı kameralar etiketi oraya da yazıyor. */
  const ana = dizindeAra(g, bas, bas + ifd0, kucuk, ETIKET_35MM)
  if (ana > 0) return ana

  /* Yoksa Exif alt dizini. */
  const altYer = dizindeAra(g, bas, bas + ifd0, kucuk, ETIKET_EXIF_IFD)
  if (!(altYer > 0)) return null
  const alt = dizindeAra(g, bas, bas + altYer, kucuk, ETIKET_35MM)
  return alt > 0 ? alt : null
}

/**
 * Bir IFD'de etiketi arar ve sayısal değerini döndürür.
 * SHORT ve LONG okunuyor; aranan iki etiket de bu türlerde.
 */
function dizindeAra(g, tiffBas, dizinYeri, kucuk, aranan) {
  if (dizinYeri + 2 > g.byteLength) return 0
  const adet = g.getUint16(dizinYeri, kucuk)
  /* Saçma sayıda giriş: dosya bozuk. */
  if (!(adet > 0) || adet > 512) return 0
  for (let i = 0; i < adet; i++) {
    const giris = dizinYeri + 2 + i * 12
    if (giris + 12 > g.byteLength) return 0
    if (g.getUint16(giris, kucuk) !== aranan) continue
    const tur = g.getUint16(giris + 2, kucuk)
    /* Değer 4 bayta sığıyorsa girişin içinde duruyor. */
    if (tur === 3) return g.getUint16(giris + 8, kucuk)
    if (tur === 4) return g.getUint32(giris + 8, kucuk)
    return 0
  }
  return 0
}
