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

/** En-boy oranını sadeleştirir: 3840×2160 → "16:9" */
function enBoyOrani(g, y) {
  if (!(g > 0) || !(y > 0)) return DASH
  // Metre yerine milimetre üzerinden: yuvarlama oranı bozmasın (2,88 m / 5,76 m)
  const gm = Math.round(g * 1000)
  const ym = Math.round(y * 1000)
  const obeb = (a, b) => (b < 1 ? a : obeb(b, a % b))
  const b = obeb(gm, ym)
  if (!(b > 0)) return DASH
  return `${Math.round(gm / b)}:${Math.round(ym / b)}`
}

/**
 * KONTROL SİSTEMİ VE TİCARİ ÖZET
 *
 * Bu değerler daha önce yalnızca backend'in ürettiği "resmi teknik şartname"
 * PDF'inde vardı; arayüzden indirilen teknik özellik PDF'inde yoktu. İki belge
 * tek belgede birleştirildiği için hesap buraya taşındı — formüller backend'deki
 * SpecSheetDocument ile birebir aynı tutulmalı.
 *
 *   • RJ45 port ihtiyacı: port başına 650.000 piksel (üst sınır 550.000 ile
 *     bir aralık verir)
 *   • Medya oynatıcı / Pro-AV işlemci: toplam piksel ve port sayısına göre
 *     NovaStar ürün kademesi
 */
export function computeControl(model, specs) {
  if (!model || !specs) return null

  const toplamPiksel = Math.max(0, Math.round(specs.resW) * Math.round(specs.resH))

  const azPort = toplamPiksel > 0 ? Math.max(1, Math.ceil(toplamPiksel / 650000)) : 1
  const cokPort = toplamPiksel > 0 ? Math.max(1, Math.ceil(toplamPiksel / 550000)) : 1
  const portText = azPort === cokPort ? `${azPort}` : `${azPort} - ${cokPort}`

  let mediaBox
  if (toplamPiksel <= 650000 && azPort <= 1) mediaBox = 'NovaStar TB30 (1 Port / Cloud)'
  else if (toplamPiksel <= 1300000 && azPort <= 2) mediaBox = 'NovaStar TB40 (2 Port / Cloud)'
  else if (toplamPiksel <= 2300000 && azPort <= 4) mediaBox = 'NovaStar TB60 (4 Port / Cloud)'
  else mediaBox = 'Harici İşlemci Gerekli'

  let processor
  if (toplamPiksel > 6500000 || azPort > 10) processor = 'NovaStar MCTRL4K (16 Port / 4K)'
  else if (toplamPiksel > 3900000 || azPort > 6) processor = 'NovaStar VX1000 (10 Port)'
  else if (toplamPiksel > 2600000 || azPort > 4) processor = 'NovaStar VX600 (6 Port)'
  else processor = 'NovaStar VX400 (4 Port)'

  const dortK = specs.resW >= 3840 && specs.resH >= 2160
  const fullHd = !dortK && specs.resW >= 1920 && specs.resH >= 1080

  return {
    toplamPiksel,
    mpx: toplamPiksel / 1000000,
    portText,
    mediaBox,
    processor,
    aspect: enBoyOrani(specs.W, specs.H),
    standart: dortK ? '4K Ultra HD' : fullHd ? 'Full HD' : 'Custom',
    standartRenk: dortK ? '#15803d' : fullHd ? '#1d4ed8' : '#c2410c',
    fiyat: specs.total * Number(model.price || 0),
  }
}
