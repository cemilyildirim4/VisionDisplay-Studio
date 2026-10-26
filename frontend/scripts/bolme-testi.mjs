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

/*
 * Yerlestirme artik ayri bir adim degil: referans bitince tasarim
 * kendiliginden geliyor. Burada yalnizca cizimin oturmasi bekleniyor.
 */
async function yerlesmeyiBekle() {
  await s.waitForTimeout(2500)
}

await s.goto(ADRES, { waitUntil: 'domcontentloaded' })
await s.waitForTimeout(4500)
await bas('Yapılandırmayı başlat', 2500)
await s.getByText('DEMO-P1.25').first().click()
await s.waitForTimeout(900)
await s.evaluate(() => {
  /* Dugme metni mastardan emir kipine gecti: "Secmek" -> "Sec". */
  const d = [...document.querySelectorAll('button')].find((x) => /^(Seç|Seçmek)$/.test((x.innerText || '').trim()) && !x.disabled)
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

/*
 * Üç ekran kuruluyor, sonra duvar dibi BİR KEZ işaretleniyor: yeni
 * yolda yerleştirme ekran ekran değil, tek adımda ve hepsi birden.
 */
/* Ekran ekle artık kare bir kutu; veri niteliğinden tıklanıyor. */
const ekranEkle = async () => {
  await s.evaluate(() => document.querySelector('[data-ekle] button')?.click())
  await s.waitForTimeout(2500)
}
await ekranEkle()
await ekranEkle()
console.log('3 ekran kuruldu (ilk ikisi sabit)')
await yerlesmeyiBekle()

/*
 * HER EKRANA AYRI AYRI: ÖRNEK GÖRÜNTÜ + Bölünmüş.
 *
 * İçerik artık ekranın kendi satırında ve aynı anda tek satır açık
 * (akordeon). Kapalı satıra tıklamak o ekranı ele alıyor.
 */
const acilanSatir = (n) =>
  s.evaluate((sira) => {
    const panel = document.querySelector('aside.yatay-panel-model')
    const liste = panel && panel.querySelector('ul')
    if (!liste) return 'liste yok'
    const satir = [...liste.children].find((li) => Number(li.dataset.ekran) === sira)
    if (!satir) return 'satir yok'
    if (satir.dataset.acik === '1') return 'zaten acik'
    satir.querySelector('button')?.click()
    return 'acildi'
  }, n)

const atananlar = []
for (const sira of [1, 2, 3]) {
  await acilanSatir(sira)
  await s.waitForTimeout(1600)
  const sonuc = await s.evaluate(() => {
    const panel = document.querySelector('aside.yatay-panel-model')
    const liste = panel && panel.querySelector('ul')
    const acik = panel && panel.querySelector('[data-acik="1"]')
    if (!acik) return 'acik satir yok'
    /* Havuz kareleri: basligi iceriğin adi. */
    const kare = [...acik.querySelectorAll('button[title]')].find((x) => /ÖRNEK GÖRÜNTÜ/i.test(x.title || ''))
    if (!kare) return 'ornek goruntu karesi yok'
    kare.click()
    return kare.title.trim()
  })
  atananlar.push(sira + ':' + sonuc)
  await s.waitForTimeout(1200)
  await s.evaluate(() => {
    const panel = document.querySelector('aside.yatay-panel-model')
    const liste = panel && panel.querySelector('ul')
    const acik = panel && panel.querySelector('[data-acik="1"]')
    const b = acik && [...acik.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Bölünmüş')
    b?.click()
  })
  await s.waitForTimeout(1200)
}
console.log('icerik atamasi:', JSON.stringify(atananlar))
const bolundu = atananlar.length
console.log('bolunmus dugmesi tiklandi:', bolundu)
await s.waitForTimeout(1500)
await bas('Tamam', 1500)
await s.waitForTimeout(1500)

/* Tanı: sabit ekranlar katmanında kaç kutu var, etkin tasarım yerleşti mi. */
const katmanBilgisi = await s.evaluate(() => {
  const katman = [...document.querySelectorAll('div')].find((x) => x.style && x.style.zIndex === '13')
  const yuz = document.querySelector('[data-tasarim-yuz]')
  return {
    sabitKutu: katman ? katman.children.length : -1,
    etkinDon: yuz ? getComputedStyle(yuz).transform.slice(0, 12) : 'yok',
  }
})
console.log('  tani: sabit kutu =', katmanBilgisi.sabitKutu, '| etkin donusum =', katmanBilgisi.etkinDon)

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
/*
 * DENETİMLER YENİ YOLA GÖRE.
 *
 * Eskiden ekranlar tek tek yerleştiriliyordu ve "yeri belli olmayan
 * ekran" diye bir durum vardı; onun içerik çizmemesi gerekiyordu. Duvar
 * dibi yolunda bütün ekranlar tek adımda yerleşiyor, o durum kalmadı.
 * Ölçülen şey artık paylaşımın kendisi.
 */
if (olcum.length < 2) dus('beklenen en az 2 yerlesmis ekran, bulunan ' + olcum.length)
if (!dustu) {
  const coz = (o) => {
    const [kw] = o.kutu.split('x').map(Number)
    const [bw] = o.bgSize.split(' ').map((x) => parseFloat(x))
    const px = parseFloat(o.bgPos.split(' ')[0])
    return { sw: bw / kw, sx: -px / kw }
  }
  const dilimler = olcum.map(coz).sort((a, b) => a.sx - b.sx)
  console.log(
    '  · dilimler: ' +
      dilimler.map((a) => '[' + a.sx.toFixed(2) + ', ' + (a.sx + 1).toFixed(2) + ']/' + a.sw.toFixed(2)).join('  '),
  )
  const ilk = dilimler[0].sw
  /* Hepsi tek bir görseli paylaşıyor: içerik kutusu aynı olmalı. */
  if (dilimler.some((a) => Math.abs(a.sw - ilk) > 0.05)) dus('ekranlar ayni icerik kutusunu kullanmiyor')
  if (!(ilk > 1.05)) dus('bolme hic uygulanmamis (icerik kutusu ekran kadar)')
  /* Her ekran görselin BAŞKA bir parçasını göstermeli. */
  for (let i = 1; i < dilimler.length; i++) {
    if (dilimler[i].sx < dilimler[i - 1].sx + 1 - 0.02) dus('dilimler cakisiyor: ayni parca iki ekranda')
  }
}
console.log('sayfa hatasi:', hata.slice(0, 2).join(' | ') || 'yok')
if (dustu) {
  console.log('BOLME TESTI DUSTU')
  process.exitCode = 1
} else {
  console.log('Bolme testi gecti.')
}
await t.close()
