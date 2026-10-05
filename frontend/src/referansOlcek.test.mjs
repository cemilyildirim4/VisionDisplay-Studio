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
  referansAcisi,
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

console.log()
console.log('J) REFERANS ACISI — IKI NOKTADAN CIKAN TEK ACI')
{
  const d = (x, y) => ({ x: x / W, y: y / H })
  /* Saf yatay ve saf dikey */
  esit('yatay cizgi 0 derece', referansAcisi(d(100, 500), d(900, 500), W, H).derece, 0, 1e-9)
  esit('dikey cizgi 90 derece', Math.abs(referansAcisi(d(500, 100), d(500, 900), W, H).derece), 90, 1e-9)
  /* 3-4-5: 900 yatay, 1200 dikey -> atan(1200/900) = 53,13 derece */
  esit('3-4-5 egimi', referansAcisi(d(100, 100), d(1000, 1300), W, H).derece, (Math.atan2(1200, 900) * 180) / Math.PI, 1e-9)
  /* 45 derece */
  esit('45 derece', referansAcisi(d(100, 100), d(600, 600), W, H).derece, 45, 1e-9)
  /* Yon fark etmiyor: cizginin yonu yok */
  esit('ters yonde ayni aci', referansAcisi(d(900, 560), d(100, 500), W, H).derece, referansAcisi(d(100, 500), d(900, 560), W, H).derece, 1e-9)
  /* Normalize uzayda hesaplasaydik yanlis cikardi: x ve y farkli bolunuyor */
  {
    const a = referansAcisi(d(100, 100), d(900, 700), W, H)
    const yanlis = (Math.atan2((700 - 100) / H, (900 - 100) / W) * 180) / Math.PI
    console.log(`     gorsel pikselinde ${a.derece.toFixed(3)} derece, normalize uzayda ${yanlis.toFixed(3)} derece`)
    dogru('normalize uzaydaki aci FARKLI (o yuzden piksel uzayinda hesaplaniyor)', Math.abs(a.derece - yanlis) > 1)
  }
  dogru('nokta yoksa null', referansAcisi(null, d(1, 1), W, H) === null)
  dogru('ayni nokta -> null', referansAcisi(d(5, 5), d(5, 5), W, H) === null)
}

console.log()
console.log('K) KUTUYU REFERANSA HIZALAMA')
{
  const d = (x, y) => ({ x: x / W, y: y / H })
  /* Yataya yakin cizgi: kutunun ENI cizgiye paralel */
  const yat = referansAcisi(d(100, 500), d(900, 560), W, H)
  dogru('yataya yakin', yat.dikeyeYakin === false)
  esit('kutuAci = cizgi acisi', yat.kutuAci, yat.rad, 1e-12)
  /* Dikeye yakin cizgi: kutunun BOYU cizgiye paralel, kutu 90 derece donmuyor */
  const dik = referansAcisi(d(500, 100), d(560, 900), W, H)
  dogru('dikeye yakin', dik.dikeyeYakin === true)
  dogru('kutuAci 45 dereceden kucuk', Math.abs((dik.kutuAci * 180) / Math.PI) < 45, ((dik.kutuAci * 180) / Math.PI).toFixed(2) + ' derece')
}

console.log()
console.log('L) DONMUS KUTU — OLCU BOZULMUYOR')
{
  const pxCm = { x: 20, y: 20 }
  const aci = (30 * Math.PI) / 180
  const k = kutuDortgeni(30, 21, pxCm, W, H, { x: 0.5, y: 0.5 }, aci)
  /* Kenarlari GORSEL pikselinde olc: normalize -> piksel */
  const gp = (q) => ({ x: q.x * W, y: q.y * H })
  const p = k.koseler.map(gp)
  const uz = (i, j) => Math.hypot(p[j].x - p[i].x, p[j].y - p[i].y)
  console.log(`     30x21 cm, 30 derece donmus -> kenarlar ${uz(0, 1).toFixed(3)} ve ${uz(1, 2).toFixed(3)} px`)
  esit('en kenari 30 x 20 = 600 px', uz(0, 1), 600, 1e-6)
  esit('karsi kenar ayni', uz(3, 2), 600, 1e-6)
  esit('boy kenari 21 x 20 = 420 px', uz(1, 2), 420, 1e-6)
  esit('karsi kenar ayni', uz(0, 3), 420, 1e-6)
  /* Dik acilar korunuyor mu? */
  const nokta = (i, j, k2) => {
    const ux = p[j].x - p[i].x
    const uy = p[j].y - p[i].y
    const vx = p[k2].x - p[j].x
    const vy = p[k2].y - p[j].y
    return (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))
  }
  esit('kose 1 dik (cos = 0)', nokta(0, 1, 2), 0, 1e-12)
  esit('kose 2 dik (cos = 0)', nokta(1, 2, 3), 0, 1e-12)
  /* Kutunun en ekseni gercekten 30 derecede mi? */
  const enAci = (Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) * 180) / Math.PI
  esit('en ekseni 30 derece', enAci, 30, 1e-9)
  esit('aciRad geri donuyor', k.aciRad, aci, 1e-12)
}

console.log()
console.log('M) KULLANICININ KATALOGU — kutu referans egiminde dogmali')
{
  /* Katalogun ust kenari: (415,70) -> (1900,150) */
  const a = referansAcisi(k1, k2, W, H)
  console.log(`     referans egimi: ${a.derece.toFixed(3)} derece`)
  esit('egim atan2(80, 1485)', a.derece, (Math.atan2(80, 1485) * 180) / Math.PI, 1e-9)
  dogru('yataya yakin, kutu eni hizalanacak', a.dikeyeYakin === false)
  const olcek = referansOlcek(k1, k2, 30, W, H)
  const kutu = kutuDortgeni(30, 21, olcek.pxPerCm, W, H, refOrtaNokta(k1, k2), a.kutuAci)
  const p = kutu.koseler.map((q) => ({ x: q.x * W, y: q.y * H }))
  const enAci = (Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) * 180) / Math.PI
  esit('kutunun en ekseni referansla ayni acida', enAci, a.derece, 1e-9)
  esit('kutu eni hala 30 x px/cm', Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y), 30 * olcek.pxPerCm.x, 1e-6)
  esit('kutu boyu hala 21 x px/cm', Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y), 21 * olcek.pxPerCm.x, 1e-6)
}

console.log()
console.log('N) ACI VERILMEZSE ESKI DAVRANIS')
{
  const pxCm = { x: 20, y: 20 }
  const a = kutuDortgeni(30, 21, pxCm, W, H, { x: 0.5, y: 0.5 })
  const b = kutuDortgeni(30, 21, pxCm, W, H, { x: 0.5, y: 0.5 }, 0)
  dogru('aci yoksa eksenlere paralel', Math.abs(a.koseler[0].y - a.koseler[1].y) < 1e-12)
  dogru('0 ile ayni sonuc', a.koseler.every((q, i) => Math.abs(q.x - b.koseler[i].x) < 1e-12))
}
console.log(`\n${kalan === 0 ? 'TUMU GECTI' : 'BASARISIZ'}  (gecen ${gecen}, kalan ${kalan})`)
if (kalan > 0) process.exit(1)
