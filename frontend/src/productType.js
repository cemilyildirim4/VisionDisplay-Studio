/**
 * Ürün tipi yardımcıları — Kabin vs Tekli Panel (Modül).
 * Backend değeri: CABINET | MODULE (cabins.product_type).
 */

export const PRODUCT_TYPES = {
  CABINET: 'CABINET',
  MODULE: 'MODULE',
}

export function normalizeProductType(value) {
  return String(value || PRODUCT_TYPES.CABINET).toUpperCase() === PRODUCT_TYPES.MODULE
    ? PRODUCT_TYPES.MODULE
    : PRODUCT_TYPES.CABINET
}

export function isModule(value) {
  return normalizeProductType(value) === PRODUCT_TYPES.MODULE
}

export function productTypeLabelKey(value) {
  return isModule(value) ? 'type.panel' : 'type.cabinet'
}

/**
 * Seri (model türü) adının o dildeki karşılığı.
 *
 * Ad veritabanından geliyor ve Türkçe yazılı. Kataloğumuzdaki adların
 * karşılığı i18n'de duruyor; listede olmayan bir ad OLDUĞU GİBİ
 * yazılıyor — çevrilmemiş görünmek, boş görünmekten iyidir.
 */
export function seriAdi(ad, t) {
  if (!ad) return ''
  const karsilik = t('seri.' + ad)
  /* Anahtar bulunamazsa i18n anahtarın kendisini döndürüyor. */
  return karsilik === 'seri.' + ad ? ad : karsilik
}
