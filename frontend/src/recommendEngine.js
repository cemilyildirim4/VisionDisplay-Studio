/**
 * Model öneri motoru — sert filtre + 40/40/20 puan.
 *
 * Sert eleme (geçmezse ürün sıralamaya girmez):
 *  1. İç mekan isteğinde Outdoor etiketli ürün yok.
 *  2. Pitch çok kaba ise (pikseller görünür) veya yanlış sınıfta
 *     aşırı ince ise elenir. Satış kuralı: izleme mesafesi (m) ≈ pitch (mm).
 *     Daha ince pitch serbest bırakılır (gelecek kanıtı); daha kaba yasaktır.
 *  3. Dış mekanda bilinen IP < 65 elenir. IP boşsa eleme yok (eski kayıtlara
 *     ceza puanı, katalog silinmesin).
 *
 * Puan (yalnızca geçenler): hedef stok %40, teknik uyum %40, bütçe %20.
 */

export const PITCH_COARSE_RATIO = 1.5
export const PITCH_FINE_RATIO = 0.35

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function blobOf(cab) {
  return norm([cab.usage, cab.filterCategory, cab.modelCode, cab.series?.name].filter(Boolean).join(' '))
}

/** Ürün dış mekan mı? Etiket yoksa iç mekan sayılır (mevcut katalog iç mekan ağırlıklı). */
export function isOutdoorProduct(cab) {
  const n = blobOf(cab)
  if (/\boutdoor\b|\bdis mekan\b|\bdismekan\b/.test(n)) return true
  if (/\bindoor\b|\bic mekan\b|\bticari ic\b|\bsinema\b|\bsanal\b|\bpencere\b/.test(n)) return false
  return false
}

export function parseIpRating(cab) {
  const direct = Number(cab.ipRating)
  if (Number.isFinite(direct) && direct > 0) return direct
  const text = `${cab.protection || ''} ${cab.features || ''} ${cab.certification || ''}`
  const m = text.match(/IP\s*(\d{2})/i)
  return m ? Number(m[1]) : null
}

/**
 * @returns {string|null} Eleme kodu; null = geçti.
 */
export function eliminationReason(cab, { outdoor, distanceM }) {
  const productOutdoor = isOutdoorProduct(cab)
  if (!outdoor && productOutdoor) return 'outdoor_in_indoor'
  if (outdoor && !productOutdoor) return 'indoor_in_outdoor'

  const pitch = Number(cab.pixelPitchMm) || 0
  if (pitch > 0 && distanceM > 0) {
    if (pitch > distanceM * PITCH_COARSE_RATIO) return 'pitch_coarse'
    if (pitch < distanceM * PITCH_FINE_RATIO) return 'pitch_fine'
  }

  if (outdoor) {
    const ip = parseIpRating(cab)
    if (ip != null && ip < 65) return 'ip_low'
  }
  return null
}

function techScore(cab, { outdoor, distanceM, purpose }) {
  const pitch = Number(cab.pixelPitchMm) || 0
  const pitchFit = pitch > 0 && distanceM > 0
    ? 1 - clamp01(Math.abs(pitch - distanceM) / distanceM)
    : 0.5
  const finerOk = pitch > 0 && pitch < distanceM
  const pitchPts = finerOk ? Math.max(pitchFit, 0.62) : pitchFit

  const nits = Number(cab.brightnessNits) || 0
  const ideal = outdoor ? 5500 : purpose?.id === 'retail' ? 1500 : 800
  const nitsFit = 1 - clamp01(Math.abs(nits - ideal) / Math.max(ideal, 1))

  let cat = 0.5
  if (purpose?.category && cab.category === purpose.category) cat = 1
  else if (purpose?.category) cat = 0.25
  const usageN = blobOf(cab)
  if (purpose?.id === 'retail' && /pencere/.test(usageN)) cat = 1
  if (purpose?.id === 'studio' && /sanal|sinema/.test(usageN)) cat = 1

  const ip = parseIpRating(cab)
  let ipFit = 0.7
  if (outdoor) ipFit = ip == null ? 0.7 : ip >= 65 ? 1 : 0.2
  else ipFit = ip == null ? 0.8 : ip <= 40 ? 1 : 0.55

  return clamp01(0.5 * pitchPts + 0.25 * nitsFit + 0.15 * cat + 0.1 * ipFit) * 100
}

function priceScore(cab, budget) {
  const price = Number(cab.price)
  if (!(budget > 0) || !Number.isFinite(price) || price < 0) return 55
  const rel = Math.abs(price - budget) / budget
  let s = (1 - clamp01(rel)) * 100
  if (price > budget * 1.15) s *= 0.55
  return s
}

/**
 * @param {object[]} cabinets
 * @param {{ outdoor: boolean, distanceM: number, purpose?: object, budget?: number|null }} query
 */
export function rankCabinets(cabinets, query) {
  const scored = (cabinets || []).map((cab) => {
    const reason = eliminationReason(cab, query)
    const targetPts = cab.featured ? 100 : 0
    const techPts = techScore(cab, query)
    const pricePts = priceScore(cab, query.budget)
    const total = reason ? 0 : 0.4 * targetPts + 0.4 * techPts + 0.2 * pricePts
    return { cab, reason, targetPts, techPts, pricePts, total }
  })
  const passed = scored.filter((x) => !x.reason).sort((a, b) => b.total - a.total)
  return {
    passed,
    eliminated: scored.filter((x) => x.reason),
    primary: passed[0] || null,
    alternative: passed[1] || null,
  }
}
