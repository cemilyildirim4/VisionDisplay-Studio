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
  deneme96PikselSantim,
  PPI96_PX_PER_CM,
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

console.log('\nI) 96 PPI DENEME MODU — kalibrasyon DEGIL')
/*
 * CSS tanimi: 1 inc = 96 px. Cevrim sabit ve fotografin olceginden bagimsiz.
 * Burada sinanan sey OLCU degil, ORAN: ayni cevrimden gecen kutu ile tasarim
 * birbirine dogru oranda cikmali.
 */
esit('96/2,54 px/cm', PPI96_PX_PER_CM, 96 / 2.54, 1e-12)
esit('px/cm degeri', PPI96_PX_PER_CM, 37.79527559055118, 1e-10)
const p96 = deneme96PikselSantim()
dogru('x ve y esit (kare piksel)', p96.x === p96.y)
dogru('mesafe parametresi almiyor', deneme96PikselSantim.length === 0)

/* Kullanicinin verdigi dort sayi birebir cikmali */
const beklenen96 = [
  [30, 1133.86],
  [21, 793.7],
  [32, 1209.45],
  [16, 604.72],
]
for (const [cm, bek] of beklenen96) esit(`${cm} cm -> px`, Math.round(cm * PPI96_PX_PER_CM * 100) / 100, bek, 0.005)

/* Kutu 30x21, tasarim 32x16 — ayni cevrim, oran kesin */
const KW = 1599
const KH = 899
const kutu96 = gercekKutuDortgeni(30, 21, p96, KW, KH)
const tas96 = gercekKutuDortgeni(32, 16, p96, KW, KH)
console.log(`     kutu    30 x 21 cm -> ${kutu96.pxW.toFixed(2)} x ${kutu96.pxH.toFixed(2)} px`)
console.log(`     tasarim 32 x 16 cm -> ${tas96.pxW.toFixed(2)} x ${tas96.pxH.toFixed(2)} px`)
esit('kutu pxW', kutu96.pxW, 1133.8582677165354, 1e-9)
esit('kutu pxH', kutu96.pxH, 793.7007874015748, 1e-9)
esit('tasarim pxW', tas96.pxW, 1209.4488188976377, 1e-9)
esit('tasarim pxH', tas96.pxH, 604.7244094488189, 1e-9)
esit('tasarim/kutu genislik orani', tas96.pxW / kutu96.pxW, 32 / 30, 1e-12)
esit('tasarim/kutu yukseklik orani', tas96.pxH / kutu96.pxH, 16 / 21, 1e-12)
esit('kutunun kendi orani', kutu96.pxW / kutu96.pxH, 30 / 21, 1e-12)
esit('tasarimin kendi orani', tas96.pxW / tas96.pxH, 32 / 16, 1e-12)

/* Fotografin olceginden bagimsiz: mesafe/odak ne olursa olsun ayni */
{
  const a = gercekKutuDortgeni(30, 21, deneme96PikselSantim(), 4000, 3000)
  esit('baska cozunurlukte ayni piksel', a.pxW, kutu96.pxW, 1e-12)
  dogru('normalize olcu cozunurlukle degisiyor (dogal)', Math.abs(a.koseler[1].x - kutu96.koseler[1].x) > 1e-6)
}

console.log('\nH) MESAFE YOKSA')
dogru('mesafe 0 -> null', pikselSantim(1479, 0) === null)
dogru('mesafe negatif -> null', pikselSantim(1479, -5) === null)
dogru('mesafe metin -> null', pikselSantim(1479, 'abc') === null)

console.log(`\n${kalan === 0 ? 'TUMU GECTI' : 'BASARISIZ'}  (gecen ${gecen}, kalan ${kalan})`)
if (kalan > 0) process.exit(1)
