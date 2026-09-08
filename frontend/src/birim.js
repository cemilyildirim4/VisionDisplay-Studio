/**
 * Birim biçimlendirme.
 *
 * MİLİMETRE her yerde NOKTALI yazılıyor: 12.5 mm, 125.75 mm, 3124 mm.
 * Türkçe yerel biçim ondalığı virgülle yazıyor ("12,5") ve binliği noktayla
 * ayırıyor ("1.920"); mm değerlerinde bu iki işaret birbirine karışıyordu.
 * Bu yüzden mm'de binlik ayracı hiç kullanılmıyor, ondalık ayracı nokta:
 * okunan sayı her zaman tek anlama geliyor.
 *
 * Yalnızca GÖSTERİM içindir; hesaplarda sayının kendisi kullanılır.
 * Metre, santimetre ve piksel biçimleri değişmedi.
 */

/**
 * Milimetre değerini metinleştirir.
 * @param {number|string} deger mm cinsinden sayı
 * @param {number} enCokBasamak gösterilecek en fazla ondalık basamak
 * @returns {string} örn. "1920", "12.5", "125.75"
 */
export function mmYazi(deger, enCokBasamak = 2) {
  const n = Number(deger)
  if (!Number.isFinite(n)) return ''
  /* Gereksiz sıfırlar atılıyor: 320.00 → 320, 12.50 → 12.5 */
  return String(Number(n.toFixed(enCokBasamak)))
}
