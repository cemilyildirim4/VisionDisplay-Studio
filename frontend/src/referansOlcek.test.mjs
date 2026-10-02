/*
 * REFERANS ÖLÇEK TESTLERİ.
 *
 * Zincir: iki normalize nokta -> orijinal görsel pikseli -> px/cm -> kutu.
 * Gerçek sayılarla, kullanıcının katalog fotoğrafı dahil.
 */
import {
  santimOku,
  ikiNoktaPikselMesafesi,
  referansOlcek,
  refOrtaNokta,
  kutuDortgeni,
  EN_AZ_PIKSEL,
} from './referansOlcek.js'

let gecen = 0
let kalan = 0
const esit = (ad, olculen, beklenen, tolerans = 1e-9) => {
  const ok = Math.abs(olculen - beklenen) <= tolerans
  console.log(`  ${ok ? '✓' : '✗'} ${ad}  ${olculen} (beklenen ${beklenen})`)
  ok ? gecen++ : kalan++
}
const dogru = (ad, kosul, ek = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${ek ? '  ' + ek : ''}`)
  kosul ? gecen++ : kalan++
}

/* Normalize koordinat yardimcisi: gorsel pikselinden */
const N = (x, y, W, H) => ({ x: x / W, y: y / H })

console.log('\nA) SANTIM OKUMA')
esit('30', santimOku('30'), 30)
esit('virgullu 30,5', santimOku('30,5'), 30.5)
esit('noktali 30.5', santimOku('30.5'), 30.5)
esit('sayi', santimOku(21), 21)
dogru('bos -> null', santimOku('') === null)
dogru('0 -> null', santimOku('0') === null)
dogru('negatif -> null', santimOku('-5') === null)
dogru('metin -> null', santimOku('abc') === null)

console.log('\nB) PIKSEL MESAFESI — ORIJINAL GORSEL PIKSELINDE')
const W = 2048
const H = 1536
/* 3-4-5 ucgeni: 900 yatay, 1200 dikey -> 1500 */
esit(
  '3-4-5 ucgeni',
  ikiNoktaPikselMesafesi(N(100, 100, W, H), N(1000, 1300, W, H), W, H),
  1500,
  1e-9,
)
/* Saf yatay ve saf dikey */
esit('yatay 1000 px', ikiNoktaPikselMesafesi(N(200, 500, W, H), N(1200, 500, W, H), W, H), 1000, 1e-9)
esit('dikey 800 px', ikiNoktaPikselMesafesi(N(300, 200, W, H), N(300, 1000, W, H), W, H), 800, 1e-9)
/*
 * KRITIK: normalize koordinat en/boy oranini tasimiyor. Ayni normalize fark
 * yatayda ve dikeyde FARKLI piksel eder. Her eksen kendi boyutuyla
 * carpilmazsa olcek bozulur.
 */
{
  const yatay = ikiNoktaPikselMesafesi({ x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, W, H)
  const dikey = ikiNoktaPikselMesafesi({ x: 0.5, y: 0 }, { x: 0.5, y: 0.5 }, W, H)
  esit('normalize 0,5 yatay -> px', yatay, W / 2, 1e-9)
  esit('normalize 0,5 dikey -> px', dikey, H / 2, 1e-9)
  dogru('ikisi FARKLI (oran tasinmiyor)', yatay !== dikey, `${yatay} vs ${dikey}`)
}
dogru('nokta yoksa null', ikiNoktaPikselMesafesi(null, { x: 1, y: 1 }, W, H) === null)
dogru('cozunurluk yoksa null', ikiNoktaPikselMesafesi({ x: 0, y: 0 }, { x: 1, y: 1 }, 0, H) === null)

console.log('\nC) px/cm = pikselMesafesi / gercekCm')
{
  const r = referansOlcek(N(100, 100, W, H), N(1000, 1300, W, H), 30, W, H)
  esit('pxMesafe', r.pxMesafe, 1500, 1e-9)
  esit('pxPerCm.x', r.pxPerCm.x, 1500 / 30, 1e-12)
  esit('pxPerCm.y', r.pxPerCm.y, 1500 / 30, 1e-12)
  dogru('x ve y esit', r.pxPerCm.x === r.pxPerCm.y)
  esit('gercekCm korunuyor', r.gercekCm, 30)
}
{
  /* Ayni piksel mesafesi, iki kat uzunluk -> yari olcek */
  const a = referansOlcek(N(0, 0, W, H), N(1000, 0, W, H), 50, W, H)
  const b = referansOlcek(N(0, 0, W, H), N(1000, 0, W, H), 100, W, H)
  esit('50 cm -> px/cm', a.pxPerCm.x, 20, 1e-12)
  esit('100 cm -> px/cm', b.pxPerCm.x, 10, 1e-12)
  esit('iki kat uzunluk -> yari olcek', a.pxPerCm.x / b.pxPerCm.x, 2, 1e-12)
}

console.log('\nD) GUVENLIK AGLARI — TAHMIN YOK')
dogru('nokta yok -> null', referansOlcek(null, { x: 1, y: 1 }, 30, W, H).pxPerCm === null)
dogru('uzunluk yok -> null', referansOlcek(N(0, 0, W, H), N(1000, 0, W, H), '', W, H).pxPerCm === null)
dogru('uzunluk 0 -> null', referansOlcek(N(0, 0, W, H), N(1000, 0, W, H), '0', W, H).pxPerCm === null)
dogru('cozunurluk yok -> null', referansOlcek(N(0, 0, W, H), N(1000, 0, W, H), 30, 0, 0).pxPerCm === null)
{
  /* Cok kisa referans reddediliyor: 1 px isaretleme hatasi buyuk sapma demek */
  const kisa = referansOlcek({ x: 0.5, y: 0.5 }, { x: 0.5 + 20 / W, y: 0.5 }, 30, W, H)
  dogru('20 px referans reddedildi', kisa.pxPerCm === null && kisa.sebep === 'cokKisa', JSON.stringify(kisa.sebep))
  const yeterli = referansOlcek({ x: 0.5, y: 0.5 }, { x: 0.5 + 60 / W, y: 0.5 }, 30, W, H)
  dogru('60 px referans kabul edildi', yeterli.pxPerCm !== null)
  esit('esik', EN_AZ_PIKSEL, 40)
}

console.log('\nE) KULLANICININ KATALOG FOTOGRAFI (2048 x 1536)')
/*
 * Fotograftaki katalogun ust kenari olculmustu: (415,70) -> (1900,150).
 * Gercek uzunlugu 30 cm.
 */
const k1 = N(415, 70, W, H)
const k2 = N(1900, 150, W, H)
const kat = referansOlcek(k1, k2, 30, W, H)
console.log(`     iki nokta arasi: ${kat.pxMesafe.toFixed(2)} px  /  30 cm  =  ${kat.pxPerCm.x.toFixed(4)} px/cm`)
esit('piksel mesafesi', kat.pxMesafe, Math.hypot(1485, 80), 1e-9)
esit('px/cm', kat.pxPerCm.x, Math.hypot(1485, 80) / 30, 1e-12)
/* Dort kenarin ortalamasindan olculen gercek olcek 50,46 idi. */
dogru(
  'tek kenardan cikan olcek dort kenar ortalamasina yakin',
  Math.abs(kat.pxPerCm.x - 50.46) / 50.46 < 0.03,
  `${kat.pxPerCm.x.toFixed(2)} vs 50,46  (fark %${(((kat.pxPerCm.x - 50.46) / 50.46) * 100).toFixed(2)})`,
)

console.log('\nF) KUTU — cm x px/cm')
{
  const orta = refOrtaNokta(k1, k2)
  esit('orta nokta x', orta.x, (k1.x + k2.x) / 2, 1e-12)
  esit('orta nokta y', orta.y, (k1.y + k2.y) / 2, 1e-12)
  const kutu = kutuDortgeni(30, 21, kat.pxPerCm, W, H, orta)
  console.log(`     30 x 21 cm kutu -> ${kutu.pxW.toFixed(2)} x ${kutu.pxH.toFixed(2)} px`)
  esit('kutu pxW = 30 x px/cm', kutu.pxW, 30 * kat.pxPerCm.x, 1e-9)
  esit('kutu pxH = 21 x px/cm', kutu.pxH, 21 * kat.pxPerCm.x, 1e-9)
  /* Referansin kendi uzunlugunu kutu olarak girersen kutu referansla ayni olmali */
  const ayni = kutuDortgeni(30, 30, kat.pxPerCm, W, H, orta)
  esit('30 cm kutu eni = referans piksel mesafesi', ayni.pxW, kat.pxMesafe, 1e-9)
  /* Kutunun kendi orani fiziksel oranla ayni */
  esit('kutu orani 30/21', kutu.pxW / kutu.pxH, 30 / 21, 1e-12)
  /* Kose dortgeni normalize ve merkezi orta noktada */
  const mx = kutu.koseler.reduce((t, q) => t + q.x, 0) / 4
  const my = kutu.koseler.reduce((t, q) => t + q.y, 0) / 4
  /*
   * Kutu referans ortasina kuruluyor AMA fotografin disina tasmayacak
   * bicimde kisitlaniyor. Buradaki referans fotografin ust kenarina cok
   * yakin (y = 0,072) ve 1041 px'lik kutu oraya sigmiyor; bu yuzden dikeyde
   * kutu asagi itiliyor. Yatayda kisitlama gerekmedigi icin orta nokta
   * birebir tutuyor.
   */
  esit('kutu merkezi x = referans ortasi', mx, orta.x, 1e-9)
  const nH = kutu.pxH / H
  esit('kutu merkezi y kadraja kisitlandi', my, nH / 2, 1e-9)
  dogru('kisitlama gerekti (referans ust kenara yakin)', orta.y < nH / 2, `orta.y ${orta.y.toFixed(4)} < ${(nH / 2).toFixed(4)}`)
  dogru('kutu fotografin icinde kaldi', kutu.koseler.every((q) => q.y >= -1e-9 && q.y <= 1 + 1e-9))

  /* Sigdigi durumda merkez birebir referans ortasinda olmali */
  const kucuk = kutuDortgeni(10, 7, kat.pxPerCm, W, H, { x: 0.5, y: 0.5 })
  const kx = kucuk.koseler.reduce((t, q) => t + q.x, 0) / 4
  const ky = kucuk.koseler.reduce((t, q) => t + q.y, 0) / 4
  esit('sigan kutu: merkez x birebir', kx, 0.5, 1e-12)
  esit('sigan kutu: merkez y birebir', ky, 0.5, 1e-12)
}

console.log('\nG) BUYUK KUTU KUCULTULMUYOR')
{
  const buyuk = kutuDortgeni(200, 100, kat.pxPerCm, W, H, { x: 0.5, y: 0.5 })
  console.log(`     200 x 100 cm -> ${buyuk.pxW.toFixed(0)} x ${buyuk.pxH.toFixed(0)} px  (fotograf ${W} x ${H})`)
  esit('pxW = 200 x px/cm', buyuk.pxW, 200 * kat.pxPerCm.x, 1e-9)
  dogru('kadraji asiyor diye bildiriliyor', buyuk.tasiyor === true)
  dogru('kuculltulmedi', buyuk.pxW > W)
}

console.log('\nH) OLCEK YERELDIR — iki farkli referans iki farkli olcek verir')
{
  /* Ayni fotografta yakindaki ve uzaktaki bir nesne farkli px/cm verir. */
  const yakin = referansOlcek(N(400, 1100, W, H), N(1400, 1100, W, H), 30, W, H)
  const uzak = referansOlcek(N(700, 200, W, H), N(1300, 200, W, H), 30, W, H)
  console.log(`     yakin referans: ${yakin.pxPerCm.x.toFixed(3)} px/cm`)
  console.log(`     uzak referans : ${uzak.pxPerCm.x.toFixed(3)} px/cm`)
  dogru('ikisi farkli (perspektif)', Math.abs(yakin.pxPerCm.x - uzak.pxPerCm.x) > 1)
  esit('yakin 1000 px / 30 cm', yakin.pxPerCm.x, 1000 / 30, 1e-12)
  esit('uzak 600 px / 30 cm', uzak.pxPerCm.x, 600 / 30, 1e-12)
}

console.log('\nI) OLCEK YAKINLASTIRMADAN BAGIMSIZ')
{
  /*
   * Normalize koordinat kullanildigi icin tuval boyutu ve yakinlastirma
   * sonucu degistirmiyor: ayni iki nokta, ayni fotograf -> ayni px/cm.
   * (Tuval pikseliyle hesaplansaydi pencere buyudugunde olcek degisirdi.)
   */
  const a = referansOlcek(k1, k2, 30, W, H)
  const b = referansOlcek({ ...k1 }, { ...k2 }, 30, W, H)
  esit('ayni sonuc', a.pxPerCm.x, b.pxPerCm.x, 0)
  /* Fotograf kucultulmus olsaydi px/cm de ayni oranda kuculurdu — dogal */
  const yari = referansOlcek(k1, k2, 30, W / 2, H / 2)
  esit('yari cozunurlukte olcek yari', yari.pxPerCm.x, a.pxPerCm.x / 2, 1e-9)
}

console.log(`\n${kalan === 0 ? 'TUMU GECTI' : 'BASARISIZ'}  (gecen ${gecen}, kalan ${kalan})`)
if (kalan > 0) process.exit(1)
