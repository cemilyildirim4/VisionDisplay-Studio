/*
 * KAMERA ÖLÇEĞİ TESTLERİ.
 *
 * Gerçek bir EXIF bloğu ÜRETİLİYOR (exifliJpeg) ve zincir baştan sona
 * doğrulanıyor: bayt -> EXIF alanı -> f_piksel -> px/cm -> kutu pikseli.
 * Böylece hesap, elimizde EXIF'li bir fotoğraf olmasa da sayısal olarak
 * kanıtlanabiliyor.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  exifOku,
  odakPikseli,
  pikselSantim,
  gercekKutuDortgeni,
  kadrajAlani,
  metreyiSantime,
} from './kameraOlcek.js'

const KOK = path.dirname(fileURLToPath(import.meta.url))

let gecen = 0
let kalan = 0
const esit = (ad, olculen, beklenen, tolerans = 1e-6) => {
  const ok = Math.abs(olculen - beklenen) <= tolerans
  console.log(`  ${ok ? '✓' : '✗'} ${ad}  ${olculen} (beklenen ${beklenen})`)
  ok ? gecen++ : kalan++
}
const dogru = (ad, kosul, ek = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${ek ? '  ' + ek : ''}`)
  kosul ? gecen++ : kalan++
}

/* ---------------------------------------------------------------- *
 * EXIF ÜRETİCİ — küçük uçlu TIFF, IFD0 + ExifIFD.
 * ---------------------------------------------------------------- */
const RATIONAL = 5
const SHORT = 3
const LONG = 4
const ASCII = 2

function girdi(tag, tur, say, alan4) {
  const b = Buffer.alloc(12)
  b.writeUInt16LE(tag, 0)
  b.writeUInt16LE(tur, 2)
  b.writeUInt32LE(say, 4)
  alan4.copy(b, 8)
  return b
}
const kisaAlan = (v) => {
  const b = Buffer.alloc(4)
  b.writeUInt16LE(v, 0)
  return b
}
const uzunAlan = (v) => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(v, 0)
  return b
}
const oranBayt = (p, q) => {
  const b = Buffer.alloc(8)
  b.writeUInt32LE(p, 0)
  b.writeUInt32LE(q, 4)
  return b
}

/** Verilen alanlardan bir APP1/Exif bloğu kurup JPEG'in başına yerleştirir. */
function exifliJpeg(temelJpeg, a) {
  /* IFD0: marka, model, ExifIFD işaretçisi */
  const ifd0Say = 3
  const ifd0Ofs = 8
  const ifd0Boy = 2 + ifd0Say * 12 + 4

  const exifGirdileri = []
  if (a.odakMm !== undefined) exifGirdileri.push({ tag: 0x920a, tur: RATIONAL, veri: oranBayt(Math.round(a.odakMm * 100), 100) })
  if (a.odak35 !== undefined) exifGirdileri.push({ tag: 0xa405, tur: SHORT, inline: kisaAlan(a.odak35) })
  if (a.exifW !== undefined) exifGirdileri.push({ tag: 0xa002, tur: LONG, inline: uzunAlan(a.exifW) })
  if (a.exifH !== undefined) exifGirdileri.push({ tag: 0xa003, tur: LONG, inline: uzunAlan(a.exifH) })
  if (a.sensorYog !== undefined) exifGirdileri.push({ tag: 0xa20e, tur: RATIONAL, veri: oranBayt(Math.round(a.sensorYog * 1000), 1000) })
  if (a.sensorBirim !== undefined) exifGirdileri.push({ tag: 0xa210, tur: SHORT, inline: kisaAlan(a.sensorBirim) })

  const exifOfs = ifd0Ofs + ifd0Boy
  const exifBoy = 2 + exifGirdileri.length * 12 + 4
  let veriOfs = exifOfs + exifBoy

  const markaB = Buffer.from((a.marka || 'TestMarka') + '\0', 'latin1')
  const modelB = Buffer.from((a.model || 'TestModel') + '\0', 'latin1')
  const markaOfs = veriOfs
  veriOfs += markaB.length
  const modelOfs = veriOfs
  veriOfs += modelB.length

  const veriParcalari = [markaB, modelB]
  const exifGirdiBayt = []
  for (const g of exifGirdileri) {
    if (g.inline) {
      exifGirdiBayt.push(girdi(g.tag, g.tur, 1, g.inline))
    } else {
      exifGirdiBayt.push(girdi(g.tag, g.tur, 1, uzunAlan(veriOfs)))
      veriParcalari.push(g.veri)
      veriOfs += g.veri.length
    }
  }

  const bas = Buffer.alloc(8)
  bas.write('II', 0, 'latin1')
  bas.writeUInt16LE(0x002a, 2)
  bas.writeUInt32LE(ifd0Ofs, 4)

  const ifd0 = Buffer.concat([
    (() => {
      const n = Buffer.alloc(2)
      n.writeUInt16LE(ifd0Say, 0)
      return n
    })(),
    girdi(0x010f, ASCII, markaB.length, uzunAlan(markaOfs)),
    girdi(0x0110, ASCII, modelB.length, uzunAlan(modelOfs)),
    girdi(0x8769, LONG, 1, uzunAlan(exifOfs)),
    Buffer.alloc(4),
  ])

  const exifIfd = Buffer.concat([
    (() => {
      const n = Buffer.alloc(2)
      n.writeUInt16LE(exifGirdileri.length, 0)
      return n
    })(),
    ...exifGirdiBayt,
    Buffer.alloc(4),
  ])

  const tiff = Buffer.concat([bas, ifd0, exifIfd, ...veriParcalari])
  const govde = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
  const uzunluk = Buffer.alloc(2)
  uzunluk.writeUInt16BE(govde.length + 2, 0)
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), uzunluk, govde])
  return Buffer.concat([temelJpeg.subarray(0, 2), app1, temelJpeg.subarray(2)])
}

const temel = fs.readFileSync(path.join(KOK, '..', 'public', 'test-ofis.jpg'))
const dosyaYap = (bayt) => new Blob([bayt], { type: 'image/jpeg' })

/* ================================================================ */
console.log('\nA) EXIF OKUMA — 35 mm esdegeri')
/* Katalog fotografi olcusu: 1536 x 2048 (dikey) */
const W = 1536
const H = 2048
const jpegA = exifliJpeg(temel, { marka: 'Acme', model: 'Telefon X', odak35: 26, exifW: W, exifH: H })
const exifA = await exifOku(dosyaYap(jpegA))
dogru('EXIF bulundu', !exifA.yok, JSON.stringify(exifA))
esit('odak35Mm', exifA.odak35Mm, 26)
esit('exifW', exifA.exifW, W)
esit('exifH', exifA.exifH, H)
dogru('marka/model okundu', exifA.marka === 'Acme' && exifA.model === 'Telefon X')

console.log('\nB) f_piksel — KOSEGEN uzerinden')
const DIAG35 = Math.hypot(36, 24)
const odakA = odakPikseli(exifA, W, H)
const fpxBek = (26 * Math.hypot(W, H)) / DIAG35
esit('f_piksel', odakA.fpx, fpxBek, 1e-9)
/* Eski (hatali) yontemle farki goster: 1536x2048 = 3:4, yani %4 sapma */
const fpxEski = (26 * Math.max(W, H)) / 36
console.log(
  `     eski yontem (uzunKenar/36): ${fpxEski.toFixed(4)}  ->  dogru olanin %${(((fpxEski / fpxBek) - 1) * 100).toFixed(2)}'i`,
)
dogru('eski yontem %4 kucuk cikiyordu', Math.abs(fpxEski / fpxBek - 1 / 1.0401) < 0.001 || Math.abs((fpxBek / fpxEski - 1) * 100 - 4.01) < 0.05, `fark %${((fpxBek / fpxEski - 1) * 100).toFixed(2)}`)
dogru('yol', odakA.yol === '35mm esdegeri' || odakA.yol === '35mm eşdeğeri', odakA.yol)
dogru('kirpma suphesi yok', odakA.kirpmaSuphesi === false)

console.log('\nC) px/cm — mesafe 30 cm')
const MESAFE = 30
const pxCm = pikselSantim(odakA.fpx, MESAFE)
esit('px/cm x', pxCm.x, fpxBek / 30, 1e-9)
dogru('px/cm x == px/cm y (kare piksel)', pxCm.x === pxCm.y)
const kadraj = kadrajAlani(odakA.fpx, MESAFE, W, H)
esit('kadraj eni cm', kadraj.enCm, (W * 30) / fpxBek, 1e-9)
esit('kadraj boyu cm', kadraj.boyCm, (H * 30) / fpxBek, 1e-9)
console.log(`     -> 30 cm'den kadraj ${kadraj.enCm.toFixed(2)} x ${kadraj.boyCm.toFixed(2)} cm goruyor`)

console.log('\nD) KUTU PIKSEL OLCUSU — ucu ayni fotografta')
const olcular = [
  [30, 21],
  [32, 16],
  [60, 40],
]
const sonuc = olcular.map(([en, boy]) => {
  const k = gercekKutuDortgeni(en, boy, pxCm, W, H)
  return { en, boy, pxW: k.pxW, pxH: k.pxH, tasiyor: k.tasiyor, koseler: k.koseler }
})
for (const r of sonuc) {
  console.log(
    `     ${String(r.en).padStart(3)} x ${String(r.boy).padStart(3)} cm  ->  ${r.pxW.toFixed(1).padStart(7)} x ${r.pxH
      .toFixed(1)
      .padStart(7)} px   kadraja sigiyor: ${r.tasiyor ? 'HAYIR' : 'evet'}`,
  )
}
/* Her kutunun kendi en/boy orani fiziksel oranla ayni olmali */
for (const r of sonuc) esit(`${r.en}x${r.boy} piksel orani`, r.pxW / r.pxH, r.en / r.boy, 1e-9)
/* Kutular arasi oranlar fiziksel olculerle birebir */
esit('30/60 genislik orani', sonuc[0].pxW / sonuc[2].pxW, 30 / 60, 1e-9)
esit('21/40 yukseklik orani', sonuc[0].pxH / sonuc[2].pxH, 21 / 40, 1e-9)
esit('32/30 genislik orani', sonuc[1].pxW / sonuc[0].pxW, 32 / 30, 1e-9)
esit('16/21 yukseklik orani', sonuc[1].pxH / sonuc[0].pxH, 16 / 21, 1e-9)
/* Tek bir px/cm: her kutuda ayni */
for (const r of sonuc) esit(`${r.en}x${r.boy} px/cm tutarli`, r.pxW / r.en, pxCm.x, 1e-9)
dogru('60x40 kadraja sigmiyor ve KUCULTULMEDI', sonuc[2].tasiyor === true && sonuc[2].pxW > W)

console.log('\nE) SENSOR YOLU — 35 mm esdegeri olmadan')
/* 4,8 mm sensor: yogunluk = px / (4,8/25,4) */
const SW = 4000
const SH = 3000
const yog = SW / (4.8 / 25.4)
const jpegE = exifliJpeg(temel, { odakMm: 4.2, exifW: SW, exifH: SH, sensorYog: yog, sensorBirim: 2 })
const exifE = await exifOku(dosyaYap(jpegE))
const odakE = odakPikseli(exifE, SW, SH)
esit('sensor genisligi mm', odakE.sensorMm, 4.8, 1e-3)
esit('f_piksel (sensor yolu)', odakE.fpx, (4.2 * 4000) / 4.8, 1e-3)
dogru('yol sensor', String(odakE.yol).includes('sens'), odakE.yol)

console.log('\nF) KIRPMA DENETIMI')
const jpegF = exifliJpeg(temel, { odak35: 26, exifW: 4000, exifH: 3000 })
const exifF = await exifOku(dosyaYap(jpegF))
const kirpik = odakPikseli(exifF, 4000, 2000) /* 2:1 — 4:3 degil */
dogru('kirpma yakalandi', kirpik.kirpmaSuphesi === true)
const kucultulmus = odakPikseli(exifF, 1000, 750) /* saf kucultme, oran ayni */
dogru('saf kucultme kirpma sayilmiyor', kucultulmus.kirpmaSuphesi === false)
esit('kucultulmus f_piksel olcekli', kucultulmus.fpx, (26 * Math.hypot(1000, 750)) / DIAG35, 1e-9)

console.log('\nF2) EN-BOY ORANINA GORE: KOSEGEN vs UZUN KENAR')
/*
 * Ayni 35 mm esdegeri (26 mm) ve ayni UZUN KENAR (4000 px) ile uc farkli
 * oran. Eski yontem uzun kenara bakip hepsine ayni f_piksel veriyordu; bu
 * yalnizca 3:2'de dogru.
 */
const UZUN = 4000
const oranlar = [
  ['4:3', UZUN, Math.round((UZUN * 3) / 4)],
  ['3:2', UZUN, Math.round((UZUN * 2) / 3)],
  ['16:9', UZUN, Math.round((UZUN * 9) / 16)],
]
console.log('     oran    goruntu px      kosegen f_px   eski f_px   eski/dogru   ')
for (const [ad, w, h] of oranlar) {
  const j = exifliJpeg(temel, { odak35: 26, exifW: w, exifH: h })
  const ex = await exifOku(dosyaYap(j))
  const o = odakPikseli(ex, w, h)
  const dogruFpx = (26 * Math.hypot(w, h)) / DIAG35
  const eskiFpx = (26 * Math.max(w, h)) / 36
  console.log(
    `     ${ad.padEnd(6)} ${String(w)}x${String(h).padEnd(6)} ${dogruFpx.toFixed(2).padStart(10)} ${eskiFpx
      .toFixed(2)
      .padStart(11)}   ${(((eskiFpx / dogruFpx) - 1) * 100).toFixed(2).padStart(7)}%`,
  )
  esit(`${ad} f_piksel kosegen`, o.fpx, dogruFpx, 1e-9)
}
/* 3:2'de iki yontem BIREBIR ayni olmali — 36:24 tam 3:2 */
{
  const w = 3600
  const h = 2400
  const j = exifliJpeg(temel, { odak35: 26, exifW: w, exifH: h })
  const o = odakPikseli(await exifOku(dosyaYap(j)), w, h)
  esit('3:2 kosegen == uzunKenar/36', o.fpx, (26 * w) / 36, 1e-9)
}
/* Dikey ve yatay ayni kosegeni verdigi icin ayni f_piksel cikmali */
{
  const jY = exifliJpeg(temel, { odak35: 26, exifW: 4000, exifH: 3000 })
  const jD = exifliJpeg(temel, { odak35: 26, exifW: 3000, exifH: 4000 })
  const oY = odakPikseli(await exifOku(dosyaYap(jY)), 4000, 3000)
  const oD = odakPikseli(await exifOku(dosyaYap(jD)), 3000, 4000)
  esit('yatay ve dikey ayni f_piksel', oD.fpx, oY.fpx, 1e-9)
}

console.log('\nG) VERI YOKSA: TAHMIN URETILMIYOR')
const exifYok = await exifOku(dosyaYap(temel))
dogru('gercek WhatsApp fotografinda EXIF yok', exifYok.yok === true, exifYok.sebep)
const odakYok = odakPikseli(exifYok, 1280, 853)
dogru('f_piksel null', odakYok.fpx === null)
dogru('eksik bildirildi', Array.isArray(odakYok.eksik) && odakYok.eksik.length > 0, JSON.stringify(odakYok.eksik))
dogru('px/cm null', pikselSantim(odakYok.fpx, 30) === null)
dogru('kutu dortgeni null', gercekKutuDortgeni(30, 21, pikselSantim(odakYok.fpx, 30), 1280, 853) === null)

const jpegOdakYok = exifliJpeg(temel, { exifW: 4000, exifH: 3000 })
const odakSuz = odakPikseli(await exifOku(dosyaYap(jpegOdakYok)), 4000, 3000)
dogru('EXIF var ama odak yok -> null', odakSuz.fpx === null, JSON.stringify(odakSuz.eksik))

console.log('\nI) ÇEKİM MESAFESİ: METRE -> SANTİM')
/*
 * Arayuz METRE soruyor, hesap SANTIM uzerinden yuruyor. Cevrim tek bir
 * yerde: metreyiSantime. Bir ara alan santim isterken kullanici metre
 * yaziyordu ve olcek 100 kat sisiyordu; bu bolum tam o hatayi kolluyor.
 */
esit('0,30 m -> cm (virgullu)', metreyiSantime('0,30'), 30, 0)
esit('0.30 m -> cm (noktali)', metreyiSantime('0.30'), 30, 0)
esit('0,3 m -> cm', metreyiSantime('0,3'), 30, 0)
esit('sayi 0.3 -> cm', metreyiSantime(0.3), 30, 0)
dogru('tam olarak 30 (kayan nokta artigi yok)', metreyiSantime('0,30') === 30, String(metreyiSantime('0,30')))
/* Yuvarlama sus degil: bazi degerlerde ham carpim artik birakiyor. */
dogru('ham carpim 0,29 x 100 artikli', 0.29 * 100 !== 29, String(0.29 * 100))
esit('0,29 m -> tam 29 cm', metreyiSantime('0,29'), 29, 0)
dogru('0,29 tam esit', metreyiSantime('0,29') === 29)

esit('1 m -> 100 cm', metreyiSantime('1'), 100, 0)
esit('2,5 m -> 250 cm', metreyiSantime('2,5'), 250, 0)
esit('0,05 m -> 5 cm', metreyiSantime('0,05'), 5, 0)
esit('0,001 m -> 0,1 cm', metreyiSantime('0,001'), 0.1, 1e-12)
dogru('bos -> null', metreyiSantime('') === null)
dogru('0 -> null', metreyiSantime('0') === null)
dogru('negatif -> null', metreyiSantime('-2') === null)
dogru('metin -> null', metreyiSantime('abc') === null)
dogru('null -> null', metreyiSantime(null) === null)

/* Zincirin tamami: 0,30 m girildiginde px/cm = f_piksel / 30 olmali */
{
  const W2 = 2048
  const H2 = 1536
  const j = exifliJpeg(temel, { odak35: 26, exifW: W2, exifH: H2 })
  const ex = await exifOku(dosyaYap(j))
  const o = odakPikseli(ex, W2, H2)
  const cm = metreyiSantime('0,30')
  const p = pikselSantim(o.fpx, cm)
  const beklenen = o.fpx / 30
  console.log(`     f_piksel ${o.fpx.toFixed(4)}  /  ${cm} cm  =  ${p.x.toFixed(6)} px/cm`)
  esit('0,30 m girisi 30 cm olarak kullanildi', cm, 30, 0)
  esit('px/cm = f_piksel / 30', p.x, beklenen, 1e-12)
  /* Yanlis birim olsaydi (0,30 cm) olcek 100 kat sisecekti */
  const yanlis = pikselSantim(o.fpx, 0.3)
  dogru('0,30 cm olsaydi 100 kat sisecekti', Math.abs(yanlis.x / p.x - 100) < 1e-9, (yanlis.x / p.x).toFixed(1) + ' kat')
  /* 30 x 21 cm kutu, bu olcekte */
  const k = gercekKutuDortgeni(30, 21, p, W2, H2)
  console.log(`     30 x 21 cm kutu -> ${k.pxW.toFixed(2)} x ${k.pxH.toFixed(2)} px`)
  esit('kutu pxW = 30 x px/cm', k.pxW, 30 * beklenen, 1e-9)
  esit('kutu pxH = 21 x px/cm', k.pxH, 21 * beklenen, 1e-9)
}

console.log('\nJ) 96 PPI MODU KALDIRILDI')
const modul = await import('./kameraOlcek.js')
dogru('PPI96_PX_PER_CM artik yok', modul.PPI96_PX_PER_CM === undefined)
dogru('deneme96PikselSantim artik yok', modul.deneme96PikselSantim === undefined)

console.log('\nH) MESAFE YOKSA')
dogru('mesafe 0 -> null', pikselSantim(1479, 0) === null)
dogru('mesafe negatif -> null', pikselSantim(1479, -5) === null)
dogru('mesafe metin -> null', pikselSantim(1479, 'abc') === null)

console.log(`\n${kalan === 0 ? 'TUMU GECTI' : 'BASARISIZ'}  (gecen ${gecen}, kalan ${kalan})`)
if (kalan > 0) process.exit(1)
