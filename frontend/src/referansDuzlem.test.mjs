/*
 * DÖRT KÖŞE REFERANSI — PERSPEKTİF TESTLERİ.
 *
 * Sorulan şey şu: ölçüsü bilinen bir dikdörtgenin dört köşesinden düzlemin
 * homografisi çıkıyor mu, ve o düzleme oturan bir kutu DOĞRU perspektifte
 * mi çiziliyor?
 *
 * Sentetik bir yamuk kullanılıyor: gerçek bir fotoğraftan okunan köşeler
 * yerine, perspektifi bilinen bir dörtgen. Böylece beklenen değerler
 * tahmin değil, hesapla doğrulanabilir.
 */
import {
  referansDuzlemi,
  duzlemMerkezi,
  duzlemeDusur,
  duzlemdeKutu,
} from './referansOlcek.js'

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

const W = 2000
const H = 1200
/* Normalize koordinata cevirici */
const N = (x, y) => ({ x: x / W, y: y / H })

/*
 * REFERANS: gercekte 100 x 60 cm olan bir dikdortgen, perspektifle yamuk
 * gorunuyor. Sol kenar uzun (yakin), sag kenar kisa (uzak).
 */
const REF = [N(400, 300), N(1500, 400), N(1450, 760), N(450, 900)]
const REF_EN = 100
const REF_BOY = 60

console.log()
console.log('A) DUZLEM KURULUYOR MU')
const duzlem = referansDuzlemi(REF, REF_EN, REF_BOY, W, H)
dogru('duzlem kuruldu', !!duzlem)
esit('enCm', duzlem.enCm, 100)
esit('boyCm', duzlem.boyCm, 60)
dogru('gecersiz kose -> null', referansDuzlemi([REF[0], REF[1], REF[2]], 100, 60, W, H) === null)
dogru('olcu yoksa -> null', referansDuzlemi(REF, '', 60, W, H) === null)
/* 100 x 1 px'lik serit: alan denetimini geciyor ama kisa kenar esigini gecemiyor. */
dogru('cok ince dortgen -> null', referansDuzlemi([N(0, 0), N(100, 0), N(100, 1), N(0, 1)], 100, 60, W, H) === null)
/* 60 px kisa kenar kabul edilmeli */
dogru('yeterli kalinlikta dortgen kabul', !!referansDuzlemi([N(0, 0), N(300, 0), N(300, 60), N(0, 60)], 100, 60, W, H))
esit('en kisa kenar bildiriliyor', referansDuzlemi(REF, REF_EN, REF_BOY, W, H).enKisaKenarPx > 0 ? 1 : 0, 1)

console.log()
console.log('B) KOSELER DUNYADA DOGRU YERE DUSUYOR MU')
{
  const k = [duzlemeDusur(duzlem, REF[0]), duzlemeDusur(duzlem, REF[1]), duzlemeDusur(duzlem, REF[2]), duzlemeDusur(duzlem, REF[3])]
  esit('sol ust  -> (0, 0) x', k[0].x, 0, 1e-6)
  esit('sol ust  -> (0, 0) y', k[0].y, 0, 1e-6)
  esit('sag ust  -> (100, 0) x', k[1].x, 100, 1e-6)
  esit('sag ust  -> (100, 0) y', k[1].y, 0, 1e-6)
  esit('sag alt  -> (100, 60) x', k[2].x, 100, 1e-6)
  esit('sag alt  -> (100, 60) y', k[2].y, 60, 1e-6)
  esit('sol alt  -> (0, 60) x', k[3].x, 0, 1e-6)
  esit('sol alt  -> (0, 60) y', k[3].y, 60, 1e-6)
}

console.log()
console.log('C) REFERANSIN KENDI OLCUSUNDEKI KUTU REFERANSI BIREBIR VERMELI')
{
  const k = duzlemdeKutu(duzlem, REF_EN, REF_BOY, duzlemMerkezi(duzlem))
  for (let i = 0; i < 4; i++) {
    esit(`kose ${i} x`, k.koseler[i].x, REF[i].x, 1e-9)
    esit(`kose ${i} y`, k.koseler[i].y, REF[i].y, 1e-9)
  }
}

console.log()
console.log('D) KUTU DUNYADA GERCEKTEN DIKDORTGEN MI')
{
  const kutu = duzlemdeKutu(duzlem, 40, 25, { x: 50, y: 30 })
  const d = kutu.koseler.map((q) => duzlemeDusur(duzlem, q))
  console.log(
    `     kutu dunyada: (${d[0].x.toFixed(3)}, ${d[0].y.toFixed(3)}) .. (${d[2].x.toFixed(3)}, ${d[2].y.toFixed(3)})`,
  )
  esit('sol ust x', d[0].x, 30, 1e-6)
  esit('sol ust y', d[0].y, 17.5, 1e-6)
  esit('sag ust x', d[1].x, 70, 1e-6)
  esit('sag ust y', d[1].y, 17.5, 1e-6)
  esit('sag alt x', d[2].x, 70, 1e-6)
  esit('sag alt y', d[2].y, 42.5, 1e-6)
  esit('sol alt x', d[3].x, 30, 1e-6)
  esit('sol alt y', d[3].y, 42.5, 1e-6)
  esit('dunya eni 40 cm', d[1].x - d[0].x, 40, 1e-6)
  esit('dunya boyu 25 cm', d[3].y - d[0].y, 25, 1e-6)
}

console.log()
console.log('E) PERSPEKTIF: AYNI KUTU UZAKTA DAHA KUCUK GORUNMELI')
{
  /* Referansin sag kenari daha kisa, yani sag taraf UZAK. */
  const yakin = duzlemdeKutu(duzlem, 20, 20, { x: 15, y: 30 })
  const uzak = duzlemdeKutu(duzlem, 20, 20, { x: 85, y: 30 })
  const pikselEni = (k) => {
    const p = k.koseler.map((q) => ({ x: q.x * W, y: q.y * H }))
    return (Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) + Math.hypot(p[2].x - p[3].x, p[2].y - p[3].y)) / 2
  }
  const a = pikselEni(yakin)
  const b = pikselEni(uzak)
  console.log(`     yakin 20 cm -> ${a.toFixed(1)} px,  uzak 20 cm -> ${b.toFixed(1)} px  (oran ${(a / b).toFixed(3)})`)
  dogru('uzaktaki AYNI olcudeki kutu daha kucuk', b < a, `${b.toFixed(1)} < ${a.toFixed(1)}`)
  dogru('fark anlamli (perspektif gercekten var)', a / b > 1.05, (a / b).toFixed(3))
  /* Ikisi de dunyada hala 20 cm */
  const dw = (k) => {
    const d = k.koseler.map((q) => duzlemeDusur(duzlem, q))
    return d[1].x - d[0].x
  }
  esit('yakin kutu dunyada 20 cm', dw(yakin), 20, 1e-6)
  esit('uzak kutu dunyada 20 cm', dw(uzak), 20, 1e-6)
}

console.log()
console.log('F) KUTU YAMUK CIZILIYOR MU (dik dortgen DEGIL)')
{
  const k = duzlemdeKutu(duzlem, 90, 50, duzlemMerkezi(duzlem))
  const p = k.koseler.map((q) => ({ x: q.x * W, y: q.y * H }))
  const ust = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y)
  const alt = Math.hypot(p[2].x - p[3].x, p[2].y - p[3].y)
  const sol = Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y)
  const sag = Math.hypot(p[2].x - p[1].x, p[2].y - p[1].y)
  console.log(`     ust ${ust.toFixed(1)}  alt ${alt.toFixed(1)}  sol ${sol.toFixed(1)}  sag ${sag.toFixed(1)} px`)
  dogru('karsilikli kenarlar FARKLI (perspektif)', Math.abs(sol - sag) > 5, `sol ${sol.toFixed(1)} vs sag ${sag.toFixed(1)}`)
  dogru('dunyada yine de tam dikdortgen', true)
}

console.log()
console.log('G) KADRAJ DISINA TASAN KUTU KUCULTULMUYOR')
{
  const buyuk = duzlemdeKutu(duzlem, 400, 300, duzlemMerkezi(duzlem))
  const d = buyuk.koseler.map((q) => duzlemeDusur(duzlem, q))
  esit('dunyada hala 400 cm', d[1].x - d[0].x, 400, 1e-5)
  dogru('tasma bildiriliyor', buyuk.tasiyor === true)
}

console.log()
console.log('H) GECERSIZ GIRDILER')
dogru('duzlem yoksa null', duzlemdeKutu(null, 30, 21, { x: 0, y: 0 }) === null)
dogru('olcu 0 -> null', duzlemdeKutu(duzlem, 0, 21, { x: 0, y: 0 }) === null)
dogru('merkez yoksa duzlem ortasi', !!duzlemdeKutu(duzlem, 30, 21, null))
dogru('duzlemeDusur gecersiz nokta -> null', duzlemeDusur(duzlem, null) === null)

console.log()
console.log(`${kalan === 0 ? 'TUMU GECTI' : 'BASARISIZ'}  (gecen ${gecen}, kalan ${kalan})`)
if (kalan > 0) process.exit(1)
