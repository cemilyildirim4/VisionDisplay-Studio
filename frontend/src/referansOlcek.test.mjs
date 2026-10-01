/*
 * REFERANS ÖLÇEK TESTİ  —  node src/referansOlcek.test.mjs
 *
 * Tarayıcı gerekmiyor: sınanan şey arayüz değil, ölçüm matematiği.
 * Bir bölümü gerçek bir fotoğrafın ölçülmüş köşeleriyle çalışıyor.
 */

import {
  bosReferans,
  referansDenetle,
  kalibrasyonKur,
  merkezeYerlestir,
  tuvaldenGorsele,
  gorseldenTuvale,
  mToCm,
} from './referansOlcek.js'

let hata = 0
const esit = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
const kontrol = (ad, kosul, ek = '') => {
  console.log(`${kosul ? '  ✓' : '  ✗'} ${ad}${ek ? '  ' + ek : ''}`)
  if (!kosul) hata++
}
const uz = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

/* ================================================================
 * A) KESİN ÖLÇEK: 4 px = 1 cm
 * Referans 100 × 50 cm, fotoğrafta 400 × 200 px.
 * 200 × 100 cm'lik kutu 800 × 400 px olmalı.
 * ================================================================ */
{
  console.log('A) KESIN OLCEK  4 px = 1 cm')
  const ref = {
    koseler: [
      { x: 100, y: 100 },
      { x: 500, y: 100 },
      { x: 500, y: 300 },
      { x: 100, y: 300 },
    ],
    enCm: 100,
    boyCm: 50,
  }
  kontrol('referans gecerli', referansDenetle(ref).tamam)
  const k = kalibrasyonKur(ref)
  kontrol('kalibrasyon kuruldu', !!k)

  const o = k.yerelOlcek(50, 25)
  kontrol('1 cm = 4,00 px (yatay)', esit(o.x, 4), `-> ${o.x.toFixed(4)}`)
  kontrol('1 cm = 4,00 px (dikey)', esit(o.y, 4), `-> ${o.y.toFixed(4)}`)

  const q = k.kutuDortgeni(0, 0, 200, 100)
  const en = uz(q[0], q[1])
  const boy = uz(q[0], q[3])
  kontrol('200 cm -> 800 px', esit(en, 800, 1e-6), `-> ${en.toFixed(4)}`)
  kontrol('100 cm -> 400 px', esit(boy, 400, 1e-6), `-> ${boy.toFixed(4)}`)

  /* Tasarim tarafi metre konusuyor: 2,00 m x 1,00 m ayni sonucu vermeli. */
  const q2 = k.kutuDortgeni(0, 0, mToCm(2), mToCm(1))
  kontrol(
    'metre girisi de ayni (2,00 m x 1,00 m)',
    esit(uz(q2[0], q2[1]), 800) && esit(uz(q2[0], q2[3]), 400),
  )

  /* Ters yon */
  const g = k.gorseldenCm(300, 200)
  kontrol('ters donusum (300,200) px -> (50,25) cm', esit(g.x, 50) && esit(g.y, 25), `-> ${g.x},${g.y}`)

  const m = merkezeYerlestir(k, 40, 20)
  kontrol('ortalama: (100-40)/2=30 , (50-20)/2=15', esit(m.x, 30) && esit(m.y, 15), `-> ${m.x},${m.y}`)
}

/* ================================================================
 * B) GERÇEK FOTOĞRAF: katalog 21 × 30 cm, 1536 × 2048 px
 * Köşeler fotoğraftan ölçüldü.
 * ================================================================ */
{
  console.log('\nB) GERCEK FOTOGRAF  (katalog 21 x 30 cm, gorsel 1536 x 2048)')
  const koseler = [
    { x: 146, y: 108 },
    { x: 1230, y: 120 },
    { x: 1174, y: 1694 },
    { x: 77, y: 1635 },
  ]
  const ref = { koseler, enCm: 21, boyCm: 30 }
  const k = kalibrasyonKur(ref)
  kontrol('kalibrasyon kuruldu', !!k)

  /* Kalibrasyonun kendisi: dort kose birebir oturmali */
  const dny = [
    [0, 0],
    [21, 0],
    [21, 30],
    [0, 30],
  ]
  kontrol(
    'dort kose birebir esleniyor',
    dny.every(([x, y], i) => {
      const p = k.cmdenGorsele(x, y)
      return esit(p.x, koseler[i].x, 1e-6) && esit(p.y, koseler[i].y, 1e-6)
    }),
  )

  /* Ileri/geri tur */
  const p = k.cmdenGorsele(7.5, 22.5)
  const g = k.gorseldenCm(p.x, p.y)
  kontrol('ileri/geri tur (7,5 , 22,5) cm', esit(g.x, 7.5) && esit(g.y, 22.5), `-> ${g.x.toFixed(9)} , ${g.y.toFixed(9)}`)

  /* TEK BIR px/cm YOK: yerel olcek duzlemin her yerinde farkli */
  const noktalar = [
    [0, 0],
    [21, 0],
    [10.5, 15],
    [0, 30],
    [21, 30],
  ]
  const hepsi = noktalar.flatMap(([x, y]) => {
    const o = k.yerelOlcek(x, y)
    return [o.x, o.y]
  })
  const kucuk = Math.min(...hepsi)
  const buyuk = Math.max(...hepsi)
  console.log(
    `     yerel olcek ${kucuk.toFixed(2)} - ${buyuk.toFixed(2)} px/cm  (fark %${(((buyuk - kucuk) / kucuk) * 100).toFixed(1)})`,
  )
  kontrol('perspektif gercek: tek bir px/cm yok', buyuk - kucuk > 1)

  /* Olculen kenarlar gercek olculerle tutarli mi */
  const kenarKisa = (uz(koseler[0], koseler[1]) + uz(koseler[3], koseler[2])) / 2
  const kenarUzun = (uz(koseler[0], koseler[3]) + uz(koseler[1], koseler[2])) / 2
  const oranPx = kenarUzun / kenarKisa
  console.log(`     olculen kenar orani ${oranPx.toFixed(4)}  (gercek 30/21 = ${(30 / 21).toFixed(4)})`)
  kontrol('kenar orani gercek olcuyle tutarli (%3 icinde)', Math.abs(oranPx / (30 / 21) - 1) < 0.03)

  /* Bu fotograf masa duzleminde ne kadar alan kapsiyor */
  const kadraj = [
    [0, 0],
    [1536, 0],
    [1536, 2048],
    [0, 2048],
  ].map(([x, y]) => k.gorseldenCm(x, y))
  const xs = kadraj.map((q) => q.x)
  const ys = kadraj.map((q) => q.y)
  console.log(
    `     kadraj ≈ ${(Math.max(...xs) - Math.min(...xs)).toFixed(1)} cm x ${(Math.max(...ys) - Math.min(...ys)).toFixed(1)} cm`,
  )
  kontrol('kadraj 30-45 cm araliginda (30 cm den cekilmis)', Math.max(...xs) - Math.min(...xs) < 45)
}

/* ================================================================
 * C) TUVAL ÖLÇEĞİ FİZİKSEL ÖLÇÜYÜ DEĞİŞTİRMİYOR
 * ================================================================ */
{
  console.log('\nC) PENCERE BOYUTU FIZIKSEL OLCUYU DEGISTIRMIYOR')
  const ref = {
    koseler: [
      { x: 200, y: 150 },
      { x: 1000, y: 180 },
      { x: 980, y: 700 },
      { x: 180, y: 660 },
    ],
    enCm: 120,
    boyCm: 80,
  }
  const k = kalibrasyonKur(ref)
  const q = k.kutuDortgeni(10, 10, 60, 40)

  /* Ayni dortgen farkli tuval olceklerinde ciziliyor; GERI donunce ayni cm. */
  for (const [s, sol, ust, z, ad] of [
    [0.3, 20, 10, 1, 'kucuk pencere'],
    [1.0, 0, 0, 1, 'birebir'],
    [2.4, -100, -60, 1, 'buyuk pencere'],
    [1.0, 0, 0, 1.6, 'yakinlastirilmis'],
  ]) {
    const fotoYer = { sol, ust, s }
    const tuvalBoyut = { w: 1600, h: 1000 }
    const tuvalda = q.map((p) => gorseldenTuvale(p, fotoYer, z, tuvalBoyut))
    const geri = tuvalda.map((p) => tuvaldenGorsele(p, fotoYer, z, tuvalBoyut))
    const cm = geri.map((p) => k.gorseldenCm(p.x, p.y))
    const en = cm[1].x - cm[0].x
    const boy = cm[3].y - cm[0].y
    kontrol(
      `${ad}: kutu hala 60,00 x 40,00 cm`,
      esit(en, 60, 1e-6) && esit(boy, 40, 1e-6),
      `-> ${en.toFixed(6)} x ${boy.toFixed(6)}`,
    )
  }
}

/* ================================================================
 * D) BOZUK REFERANS KABUL EDİLMİYOR
 * ================================================================ */
{
  console.log('\nD) BOZUK REFERANS REDDEDILIYOR')
  kontrol('bos referans', referansDenetle(bosReferans()).sebep === 'koseYok')
  kontrol(
    'olcu girilmemis',
    referansDenetle({
      koseler: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      enCm: 0,
      boyCm: 10,
    }).sebep === 'olcuYok',
  )
  kontrol(
    'kenar cok kisa',
    referansDenetle({
      koseler: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      enCm: 20,
      boyCm: 20,
    }).sebep === 'kucuk',
  )
  kontrol(
    'kelebek (katlanmis) dortgen',
    referansDenetle({
      koseler: [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
        { x: 0, y: 300 },
        { x: 400, y: 300 },
      ],
      enCm: 20,
      boyCm: 20,
    }).sebep === 'katlanmis',
  )
  kontrol('bozuk referansla kalibrasyon kurulmuyor', kalibrasyonKur(bosReferans()) === null)
}

console.log(hata === 0 ? '\nTUMU GECTI' : `\n${hata} BASARISIZ`)
process.exit(hata ? 1 : 0)
