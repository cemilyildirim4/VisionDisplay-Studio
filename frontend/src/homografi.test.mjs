/*
 * DUNYA <-> GORUNTU DONUSUM TESTI  —  node src/homografi.test.mjs
 *
 * Tarayici gerekmiyor: dogrulanan sey arayuz degil, GEOMETRI. Olcu sisteminin
 * dogrulugu buradan okunuyor; arayuz testleri (Playwright) ayrica calistiriliyor
 * ama matematigin kendisi burada, tek basina ve hizlica sinaniyor.
 */
/*
 * Şartnamedeki 21. madde: 5 × 3 m referans alan, 3 × 2 m tasarım.
 * Dönüşüm katmanı tek başına, arayüzden bağımsız sınanıyor.
 */
const { duvarDunyasi, dunyaDortgeni } = await import(
  './homografi.js'
)

const yaz = (n) => (Math.abs(n) < 1e-9 ? 0 : n)
const esit = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
let hata = 0
const kontrol = (ad, kosul, ek = '') => {
  console.log(`${kosul ? '  ✓' : '  ✗'} ${ad}${ek ? '  ' + ek : ''}`)
  if (!kosul) hata++
}

const ALAN_W = 5
const ALAN_H = 3
const TAS_W = 3
const TAS_H = 2

/* --- A) Düz (perspektifsiz) referans alan --- */
{
  const koseler = [
    { x: 100, y: 50 },
    { x: 1100, y: 50 },
    { x: 1100, y: 650 },
    { x: 100, y: 650 },
  ]
  const d = duvarDunyasi(koseler, ALAN_W, ALAN_H)
  console.log('A) DUZ ALAN  (1000 x 600 px  =  5 x 3 m)')
  kontrol('dunya kuruldu', !!d)

  /* dört köşe birebir */
  const k = [[0, 0], [ALAN_W, 0], [ALAN_W, ALAN_H], [0, ALAN_H]].map(([x, y]) => d.ileri(x, y))
  kontrol(
    'kose eslemesi birebir',
    k.every((q, i) => esit(q.x, koseler[i].x, 1e-6) && esit(q.y, koseler[i].y, 1e-6)),
  )

  /* ileri-geri tur */
  const n = d.ileri(1.25, 0.75)
  const g = d.geri(n.x, n.y)
  kontrol('ileri/geri tur', esit(g.x, 1.25) && esit(g.y, 0.75), `-> ${g.x.toFixed(9)}, ${g.y.toFixed(9)}`)

  /* tasarim ortalanmasi: (5-3)/2 = 1 ; (3-2)/2 = 0,5 */
  const dx = (ALAN_W - TAS_W) / 2
  const dy = (ALAN_H - TAS_H) / 2
  kontrol('designX = 1,00 m', esit(dx, 1), `-> ${dx}`)
  kontrol('designY = 0,50 m', esit(dy, 0.5), `-> ${dy}`)

  const q = dunyaDortgeni(d, dx, dy, TAS_W, TAS_H)
  const bek = [
    { x: 300, y: 150 },
    { x: 900, y: 150 },
    { x: 900, y: 550 },
    { x: 300, y: 550 },
  ]
  kontrol(
    'tasarim dortgeni (px)',
    q.every((p, i) => esit(p.x, bek[i].x, 1e-6) && esit(p.y, bek[i].y, 1e-6)),
    q.map((p) => `${yaz(p.x)},${yaz(p.y)}`).join(' | '),
  )
  const en = q[1].x - q[0].x
  const boy = q[3].y - q[0].y
  kontrol('tasarim/alan en  = 3/5', esit(en / 1000, TAS_W / ALAN_W), `-> ${(en / 1000).toFixed(6)}`)
  kontrol('tasarim/alan boy = 2/3', esit(boy / 600, TAS_H / ALAN_H), `-> ${(boy / 600).toFixed(6)}`)
}

/* --- B) Perspektifli alan: ölçüler dünyada korunuyor mu? --- */
{
  const koseler = [
    { x: 120, y: 80 },
    { x: 1180, y: 190 },
    { x: 1180, y: 610 },
    { x: 120, y: 720 },
  ]
  const d = duvarDunyasi(koseler, ALAN_W, ALAN_H)
  console.log('\nB) PERSPEKTIFLI ALAN')
  const dx = (ALAN_W - TAS_W) / 2
  const dy = (ALAN_H - TAS_H) / 2
  const q = dunyaDortgeni(d, dx, dy, TAS_W, TAS_H)
  console.log('   tasarim dortgeni:', q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' | '))

  /* Dört köşeyi dünyaya geri çevir: 1 / 0,5 ve 4 / 2,5 çıkmalı */
  const geri = q.map((p) => d.geri(p.x, p.y))
  const bek = [
    [1, 0.5],
    [4, 0.5],
    [4, 2.5],
    [1, 2.5],
  ]
  kontrol(
    'dunyaya geri donus 1/0,5 - 4/2,5',
    geri.every((g, i) => esit(g.x, bek[i][0], 1e-6) && esit(g.y, bek[i][1], 1e-6)),
    geri.map((g) => `${g.x.toFixed(4)},${g.y.toFixed(4)}`).join(' | '),
  )

  /* Perspektifte karsilikli kenarlar esit olmak zorunda DEGIL */
  const sol = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y)
  const sag = Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)
  console.log(`   sol kenar ${sol.toFixed(1)} px, sag kenar ${sag.toFixed(1)} px  (perspektif: esit degil)`)
  kontrol('tasarim gercekten yamuk (duz dikdortgen degil)', Math.abs(sol - sag) > 1 || Math.abs(q[1].y - q[0].y) > 1)
}

/* --- C) ZOOM / CANVAS RESIZE: dunya olculeri degismiyor mu? --- */
{
  console.log('\nC) ZOOM VE CANVAS RESIZE')
  const taban = [
    { x: 120, y: 80 },
    { x: 1180, y: 190 },
    { x: 1180, y: 610 },
    { x: 120, y: 720 },
  ]
  const dx = (ALAN_W - TAS_W) / 2
  const dy = (ALAN_H - TAS_H) / 2
  for (const z of [0.5, 1, 2, 3.75]) {
    /* Tuval olcegi: butun goruntu koordinatlari z ile carpiliyor (zoom/resize). */
    const koseler = taban.map((k) => ({ x: k.x * z, y: k.y * z }))
    const d = duvarDunyasi(koseler, ALAN_W, ALAN_H)
    const q = dunyaDortgeni(d, dx, dy, TAS_W, TAS_H)
    const geri = q.map((p) => d.geri(p.x, p.y))
    const dogru =
      esit(geri[0].x, 1, 1e-6) &&
      esit(geri[0].y, 0.5, 1e-6) &&
      esit(geri[2].x, 4, 1e-6) &&
      esit(geri[2].y, 2.5, 1e-6)
    /* Ayrica alanin kendi olcusu degismiyor */
    const alanGeri = d.geri(koseler[2].x, koseler[2].y)
    kontrol(
      `zoom x${z}: tasarim 1,00/0,50 - 4,00/2,50 ve alan ${ALAN_W}x${ALAN_H} m`,
      dogru && esit(alanGeri.x, ALAN_W, 1e-6) && esit(alanGeri.y, ALAN_H, 1e-6),
      `alan -> ${alanGeri.x.toFixed(6)} x ${alanGeri.y.toFixed(6)} m`,
    )
  }
}

/* --- D) Kose surukleme: dunya olcusu korunuyor mu? --- */
{
  console.log('\nD) BIR KOSE SURUKLENDI')
  const once = [
    { x: 120, y: 80 },
    { x: 1180, y: 190 },
    { x: 1180, y: 610 },
    { x: 120, y: 720 },
  ]
  const sonra = once.map((k, i) => (i === 1 ? { x: 980, y: 260 } : k))
  const dx = (ALAN_W - TAS_W) / 2
  const dy = (ALAN_H - TAS_H) / 2
  const d1 = duvarDunyasi(once, ALAN_W, ALAN_H)
  const d2 = duvarDunyasi(sonra, ALAN_W, ALAN_H)
  const q1 = dunyaDortgeni(d1, dx, dy, TAS_W, TAS_H)
  const q2 = dunyaDortgeni(d2, dx, dy, TAS_W, TAS_H)
  const farkli = q1.some((p, i) => Math.abs(p.x - q2[i].x) > 1 || Math.abs(p.y - q2[i].y) > 1)
  kontrol('tasarimin goruntu koseleri yeni perspektife gore degisti', farkli)
  const geri = q2.map((p) => d2.geri(p.x, p.y))
  kontrol(
    'tasarimin DUNYA olcusu ayni kaldi (3,00 x 2,00 m)',
    esit(geri[1].x - geri[0].x, TAS_W, 1e-6) && esit(geri[3].y - geri[0].y, TAS_H, 1e-6),
    `-> ${(geri[1].x - geri[0].x).toFixed(6)} x ${(geri[3].y - geri[0].y).toFixed(6)} m`,
  )
}

console.log(hata === 0 ? '\nTUMU GECTI' : `\n${hata} BASARISIZ`)
process.exit(hata ? 1 : 0)
