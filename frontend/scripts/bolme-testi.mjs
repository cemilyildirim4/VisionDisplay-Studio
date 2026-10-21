/*
 * BÖLÜNMÜŞ İÇERİK ÖLÇÜMÜ.
 *
 * İki ekran kurulup ikisine de aynı içerik "Bölünmüş" olarak veriliyor,
 * sonra her ekranın içeriği nasıl çizdiği okunuyor: arka planın ölçüsü
 * (backgroundSize) ekranın kendi ölçüsünden büyük olmalı ve konumu
 * (backgroundPosition) her ekranda farklı olmalı. Aynıysa bölme hiç
 * çalışmıyor demektir.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const ADRES = process.env.ADRES || 'http://localhost:5174/'
const FOTO = fileURLToPath(new URL('../public/test-ofis.jpg', import.meta.url))
const t = await chromium.launch({
  executablePath: 'C:/Users/rabia/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const s = await t.newPage({ viewport: { width: 1600, height: 950 } })
const hata = []
s.on('pageerror', (e) => hata.push(String(e).split('\n')[0]))
await s.addInitScript(() => {
  const k = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  const e = Math.floor(Date.now() / 1000) + 86400
  localStorage.setItem(
    'vds-session',
    JSON.stringify({
      accessToken: k({ alg: 'HS256' }) + '.' + k({ role: 'Admin', exp: e }) + '.x',
      refreshToken: 'y',
      role: 'Admin',
      displayName: 'T',
    }),
  )
})
const bas = async (q, w = 1500) => {
  const o = await s.evaluate((x) => {
    const d = [...document.querySelectorAll('button')].find(
      (b) => (b.textContent || '').replace(/\s+/g, ' ').trim() === x && !b.disabled,
    )
    if (d) {
      d.click()
      return true
    }
    return false
  }, q)
  await s.waitForTimeout(w)
  return o
}
const tuval = () =>
  s.evaluate(() => {
    const r = document.querySelector('#pdf-onizleme').getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
const tikla = async (noktalar) => {
  for (const [px, py] of noktalar) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(420)
  }
}
const kartaSayi = (v) =>
  s.evaluate((x) => {
    const k = [...document.querySelectorAll('div')].find(
      (d) => /border-brand/.test(d.className || '') && /rounded-xl/.test(d.className || ''),
    )
    const i = k?.querySelector('input[type="number"]')
    if (!i) return false
    const w = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    w.call(i, String(x))
    i.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }, v)

/** Bir alanı kurup bitiren kısa akış (köşeler oran olarak veriliyor). */
async function alanKur(kx, ky, ken, kboy) {
  const m = await tuval()
  const x = m.x + m.w * kx
  const y = m.y + m.h * ky
  const en = m.w * ken
  const boy = m.h * kboy
  await bas('Alanı işaretle', 1500)
  await tikla([
    [x, y],
    [x + en, y + boy * 0.05],
    [x + en, y + boy],
    [x, y + boy * 0.95],
  ])
  await bas('Alanı onayla', 2500)
  await bas('Bitir ve tasarımı göster', 2000)
}

await s.goto(ADRES, { waitUntil: 'domcontentloaded' })
await s.waitForTimeout(4500)
await bas('Yapılandırmayı başlat', 2500)
await s.getByText('DEMO-P1.25').first().click()
await s.waitForTimeout(900)
await s.evaluate(() => {
  const d = [...document.querySelectorAll('button')].find((x) => /Seçmek/.test(x.innerText) && !x.disabled)
  if (d) d.click()
})
await s.waitForTimeout(4000)
await bas('Kendi fotoğrafım', 2000)
for (const g of await s.$$('input[type="file"]')) {
  const a = await g.getAttribute('accept')
  if (a && a.includes('webp')) {
    await g.setInputFiles(FOTO)
    break
  }
}
await s.waitForTimeout(95000)

/* Referans */
const m0 = await tuval()
await tikla([
  [m0.x + m0.w * 0.3, m0.y + m0.h * 0.7],
  [m0.x + m0.w * 0.3, m0.y + m0.h * 0.3],
])
await bas('Devam', 1500)
await kartaSayi(210)
await s.waitForTimeout(800)
await bas('Devam', 1500)

/* 1. ekran: solda */
await alanKur(0.2, 0.3, 0.2, 0.3)
console.log('1. ekran kuruldu')
/* 2. ekran: sağda */
await bas('Ekran ekle', 2500)
await alanKur(0.48, 0.3, 0.2, 0.3)
console.log('2. ekran kuruldu')
/* Ucuncu ekrana gecerek ilk ikisini de SABITLE: asil kullanim boyle. */
await bas('Ekran ekle', 2500)
console.log('3. ekrana gecildi (ilk iki ekran sabit)')

/* Görsel penceresi: ikisine de ÖRNEK GÖRÜNTÜ + Bölünmüş */
const pencere = await bas('Görselleri düzenle', 1500)
console.log('gorsel penceresi:', pencere)
const atama = await s.evaluate(() => {
  const secimler = [...document.querySelectorAll('select')]
  const sonuc = []
  for (const sec of secimler) {
    const se = [...sec.options].find((o) => /ÖRNEK GÖRÜNTÜ/i.test(o.textContent || ''))
    if (!se) continue
    const yaz = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    yaz.call(sec, se.value)
    sec.dispatchEvent(new Event('change', { bubbles: true }))
    sonuc.push(se.textContent.trim())
  }
  return { secimSayisi: secimler.length, atanan: sonuc }
})
console.log('icerik atamasi:', JSON.stringify(atama))
await s.waitForTimeout(1200)
const bolundu = await s.evaluate(() => {
  const d = [...document.querySelectorAll('button')].filter(
    (b) => (b.textContent || '').trim() === 'Bölünmüş',
  )
  d.forEach((b) => b.click())
  return d.length
})
console.log('bolunmus dugmesi tiklandi:', bolundu)
await s.waitForTimeout(1500)
await bas('Tamam', 1500)
await s.waitForTimeout(1500)

const olcum = await s.evaluate(() => {
  const liste = []
  for (const e of document.querySelectorAll('#pdf-onizleme div')) {
    const st = getComputedStyle(e)
    if (st.backgroundImage.indexOf('url(') < 0) continue
    if (e.offsetWidth < 20 || e.offsetHeight < 20) continue
    /* Hangi ekran: etkin tasarımın içinde mi, sabit katmanda mı. */
    let etkin = false
    for (let d = e; d; d = d.parentElement) if (d.hasAttribute && d.hasAttribute('data-tasarim-yuz')) { etkin = true; break }
    liste.push({
      yer: etkin ? 'ETKIN' : 'SABIT',
      kutu: e.offsetWidth + 'x' + e.offsetHeight,
      bgSize: st.backgroundSize,
      bgPos: st.backgroundPosition,
    })
  }
  return liste
})
console.log('ICERIK CIZEN OGELER:')
for (const o of olcum) console.log('  ', JSON.stringify(o))

/*
 * DENETIMLER.
 *
 * 1. Yeri belli olmayan ekran icerik CIZMEMELI: cizerse gorselin tamamini
 *    gosteriyor ve gorsel tekrarlanmis gibi duruyor.
 * 2. Iki yerlesmis ekran AYNI olcekte (sw) bir icerik kutusu kullanmali:
 *    ikisi tek bir gorseli paylasiyor.
 * 3. Dilimleri CAKISMAMALI: her ekran gorselin baska bir parcasini
 *    gostermeli.
 */
let dustu = 0
const dus = (m) => { console.log('  ✗ ' + m); dustu++ }
const cizenler = olcum.filter((o) => o.yer === 'SABIT')
if (olcum.some((o) => o.yer === 'ETKIN')) dus('yeri belli olmayan ekran da icerik ciziyor (tekrar)')
if (cizenler.length !== 2) dus('beklenen 2 yerlesmis ekran, bulunan ' + cizenler.length)
if (!dustu) {
  const coz = (o) => {
    const [kw] = o.kutu.split('x').map(Number)
    const [bw] = o.bgSize.split(' ').map((x) => parseFloat(x))
    const px = parseFloat(o.bgPos.split(' ')[0])
    return { sw: bw / kw, sx: -px / kw }
  }
  const a1 = coz(cizenler[0])
  const a2 = coz(cizenler[1])
  console.log('  · dilimler: 1 → [' + a1.sx.toFixed(2) + ', ' + (a1.sx + 1).toFixed(2) + '] / ' + a1.sw.toFixed(2) +
              '  2 → [' + a2.sx.toFixed(2) + ', ' + (a2.sx + 1).toFixed(2) + '] / ' + a2.sw.toFixed(2))
  if (Math.abs(a1.sw - a2.sw) > 0.05) dus('iki ekran ayni icerik kutusunu kullanmiyor: ' + a1.sw.toFixed(2) + ' vs ' + a2.sw.toFixed(2))
  if (!(a1.sw > 1.05)) dus('bolme hic uygulanmamis (icerik kutusu ekran kadar)')
  const sol = a1.sx < a2.sx ? a1 : a2
  const sag = a1.sx < a2.sx ? a2 : a1
  if (sag.sx < sol.sx + 1 - 0.02) dus('dilimler cakisiyor: ayni parca iki ekranda')
}
console.log('sayfa hatasi:', hata.slice(0, 2).join(' | ') || 'yok')
if (dustu) {
  console.log('BOLME TESTI DUSTU')
  process.exitCode = 1
} else {
  console.log('Bolme testi gecti.')
}
await t.close()
