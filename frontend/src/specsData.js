/**
 * Teknik özellik hesapları ve biçimlendirme.
 *
 * Kendi dosyasında duruyor çünkü İKİ yer kullanıyor: ekrandaki pop-up
 * (SpecsSection.jsx) ve PDF çıktısı (SpecsPdf.jsx). Tek kaynak olsun ki
 * birinde değişip diğerinde unutulmasın.
 */

import { viewingDistanceFor } from './viewingDistance.js'

export const DASH = '-'
export const fmt = (n, d = 0) =>
  Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })

// Devre başına kabin sayısı ve devre sayısı (basitleştirilmiş, %80 güvenlik payı)
function circuit(volts, amps, perCabMax, total) {
  const perCircuit = Math.max(1, Math.floor((volts * amps * 0.8) / perCabMax))
  const circuits = Math.ceil(total / perCircuit)
  return { perCircuit, circuits }
}

/**
 * Tüm türetilmiş değerleri hesaplar.
 * Modül seviyesinde: hem ekrandaki pop-up hem PDF çıktısı bunu kullanır,
 * böylece iki yerde ayrı formül tutulmaz.
 */
export function computeSpecs(model, cols, rows) {
  if (!model) return null
  const total = cols * rows
  const W = cols * ((model.widthMm || 500) / 1000)
  const H = rows * ((model.heightMm || 500) / 1000)
  const diagM = Math.sqrt(W * W + H * H)
  const pMax = total * (model.powerMaxWatts || 0)
  const pTyp = total * (model.powerTypicalWatts || 0)
  const perCabMax = model.powerMaxWatts || 1
  return {
    total,
    W,
    H,
    area: W * H,
    diagIn: diagM / 0.0254,
    weight: total * (model.weightKg || 0),
    resW: cols * (model.pixelWidth || 0),
    resH: rows * (model.pixelHeight || 0),
    pMax,
    pTyp,
    btuMax: pMax * 3.412,
    btuTyp: pTyp * 3.412,
    viewDist: viewingDistanceFor(model, cols, rows),
    circuits: {
      c110_20: circuit(110, 20, perCabMax, total),
      c208_20: circuit(208, 20, perCabMax, total),
      c230_13: circuit(230, 13, perCabMax, total),
      c230_16: circuit(230, 16, perCabMax, total),
    },
  }
}
