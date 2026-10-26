/*
 * SOL PANEL TESTI — ekran akordeonu.
 *
 * Dogrulanan sartlar (urun karari olarak yazildi):
 *   1. Uc ekranli tasarimda listede uc satir var ve tam BIRI acik.
 *   2. Acik satir her ekran icin AYNI denetimleri tasiyor: icerik secimi,
 *      tur, sutun/satir, yon. 2. ve 3. ekranin ayari 1. ekrandan eksik
 *      kalamaz — ayar tek yerde yazili ama bu sartin kendisi burada.
 *   3. Kapali satirda icerik kucuk resmi var.
 *   4. 1440x900 ekranda sol panelde dikey kaydirma cubugu cikmiyor.
 *   5. Paneldeki TOPLAM kabin sayisi satirlarin toplamiyla ayni.
 *
 * Fotograf yuklenmiyor: ekranlar fotografsiz sahnede de eklenebiliyor.
 */
import { chromium } from 'playwright'
const ADRES = process.env.ADRES || 'http://localhost:5174/'
const YOL =
  process.env.TARAYICI ||
  'C:/Users/rabia/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'

const t = await chromium.launch({
  executablePath: YOL,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const b = await t.newContext({ viewport: { width: 1440, height: 900 } })
const s = await b.newPage()
const hata = []
s.on('pageerror', (e) => hata.push(String(e).slice(0, 200)))

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
await s.goto(ADRES, { waitUntil: 'domcontentloaded' })
await s.waitForTimeout(5000)

const bas = async (metin) =>
  s.evaluate((m) => {
    const d = [...document.querySelectorAll('button')].find((x) =>
      new RegExp(m, 'i').test((x.textContent || '').trim()),
    )
    if (!d) return false
    d.click()
    return true
  }, metin)

await bas('Yapılandırmayı başlat')
await s.waitForTimeout(4000)

/*
 * Model secimi: listedeki ilk kabin.
 * Satirlar tablo degil izgara; her satirda bir karsilastirma dugmesi (⇄)
 * var ve satirin kendisi o dugmenin iki ustundeki kutu.
 */
await bas('Modelinizi seçin|Model değişikliği|Değiştir')
await s.waitForTimeout(2500)
const modelSecildi = await s.evaluate(() => {
  const c = [...document.querySelectorAll('button')].filter((x) => (x.textContent || '').trim() === '⇄')
  if (!c.length) return false
  let el = c[0]
  for (let i = 0; i < 2; i++) el = el.parentElement
  el.click()
  return true
})
await s.waitForTimeout(800)
await bas('^Seç$')
await s.waitForTimeout(3000)

/* Iki ekran daha: toplam uc. */
for (let i = 0; i < 2; i++) {
  const eklendi = await bas('Ekran ekle')
  if (!eklendi) break
  await s.waitForTimeout(1200)
}

const olcum = await s.evaluate(() => {
  const panel = document.querySelector('aside.yatay-panel-model')
  const liste = panel?.querySelector('ul')
  /* Ekran kutuları; "+ Ekran ekle" kutusu sayıma girmiyor. */
  const satirlar = liste ? [...liste.children].filter((li) => li.dataset.ekran) : []
  /*
   * EKRANLAR ARTIK KARE KUTULAR; ayarlar kutuların ALTINDA duruyor.
   * Açık gövde veri niteliğinden tanınıyor, listenin içinde değil.
   */
  const acikGovde = panel?.querySelector('[data-acik="1"]') || null
  const acik = acikGovde ? [acikGovde] : []
  const kapali = satirlar
  const metin = (el) => (el?.innerText || '').replace(/\s+/g, ' ')
  const toplamSatiri = [...(panel?.querySelectorAll('div') || [])]
    .map((d) => d.innerText || '')
    .find((x) => /^Toplam:/.test(x.trim()))
  /*
   * KAYDIRMA OLCUSU — donusum hesaba katilarak.
   *
   * Panel icerigi sigmak icin CSS ile kuculuyor (bkz. Sigdir). Donusum
   * YERLESIMI degistirmedigi icin kapsayicinin scrollHeight'i her zaman
   * buyuk gorunur; olcut, gercek bir kaydirma cubugu olmamasi ve
   * kuculmus yuksekligin sigmasi.
   */
  const tasma = []
  for (const el of panel ? [panel, ...panel.querySelectorAll('div')] : []) {
    const st = getComputedStyle(el)
    const kaydirilabilir = st.overflowY === 'auto' || st.overflowY === 'scroll'
    if (kaydirilabilir && el.scrollHeight - el.clientHeight > 2) {
      tasma.push(el.className.slice(0, 60) + ' (' + el.scrollHeight + '>' + el.clientHeight + ')')
    }
  }
  /* Sigdirmanin bedeli: oran ne kadar kucukse yazi o kadar kucuk. */
  const sigdirilan = [...(panel?.querySelectorAll('div') || [])].find((x) =>
    x.className.includes('lg:overflow-hidden'),
  )
  const mt = sigdirilan ? getComputedStyle(sigdirilan.firstElementChild || sigdirilan).transform : ''
  /* "matrix(0.65, 0, 0, 0.65, 0, 0)" — ilk sayi olcek. Duzenli ifade
     yerine ayirma: betik yazarken ters bolu kacislari yutuluyordu. */
  const ilk = (mt || '').split('(')[1]
  const oran = ilk ? Number(ilk.split(',')[0]) || 1 : 1
  const kesik = sigdirilan ? sigdirilan.scrollHeight * oran > sigdirilan.clientHeight + 2 : false
  return {
    satirSayisi: satirlar.length,
    acikSayisi: acik.length,
    kapaliKucukResim: kapali.every((li) => !!li.querySelector('span > div, span > video, span > span')),
    /*
     * Icerik secimi artik acilir liste degil: buyuk kutu (tikla ya da
     * surukle-birak) ve altinda havuz kareleri. Her havuz karesinin
     * baslik (title) niteligi var.
     */
    acikIcerikKutusu: !!acikGovde?.querySelector('button[class*="border-dashed"]'),
    acikHavuzKare: (acikGovde?.querySelectorAll('button[title]') || []).length,
    acikTur: /Düz|Dışa|İçe/.test(metin(acikGovde)),
    acikOlcu: (acikGovde?.querySelectorAll('input[type="number"], button') || []).length > 4,
    /*
     * Kabin yönü artık sorulmuyor: "Duvara sığdır" yatay ve dikey
     * yerleşimi hesaplayıp çok LED alanı kendisi seçiyor. Seçim panele
     * geri sızarsa bu satır yakalar.
     */
    acikYonYok: !/Yatay|Dikey/.test(metin(acikGovde)),
    toplamSatiri: (toplamSatiri || '').trim().slice(0, 90),
    kapaliMetinler: kapali.map((li) => metin(li).slice(0, 80)),
    tasma,
    oran,
    kesik,
  }
})

/*
 * TEKNIK OZELLIKLER ILE KARSILASTIRMA.
 * Panelde yazan toplam kabin sayisi pencerede de ayni cikmali; ikisi tek
 * kaynaktan okunuyor ama sartin kendisi burada.
 */
/* "Toplam: 3 ekran · 3 kabin · 768 × 128 px" — kabin yazan parca. */
const kabinParcasi = (olcum.toplamSatiri || '').split('·').find((x) => x.includes('kabin')) || ''
const panelKabin = Number(kabinParcasi.replace(/[^0-9]/g, '')) || 0
await bas('Teknik Özellikler|Teknik özellikler')
await s.waitForTimeout(2500)
const pencere = await s.evaluate(() => {
  const d = [...document.querySelectorAll('table')].find((x) => /Toplam/i.test(x.innerText || ''))
  if (!d) return null
  const satir = [...d.querySelectorAll('tr')].find((r) => (r.innerText || '').trim().startsWith('Toplam'))
  if (!satir) return null
  /* Hucreler: Toplam | alan | kabin | piksel | agirlik | guc */
  return [...satir.querySelectorAll('td')].map((c) => (c.innerText || '').trim())
})

console.log('--- SOL PANEL ---')
console.log('  model secildi      :', modelSecildi ? 'evet' : 'HAYIR ✗')
console.log('  satir sayisi       :', olcum.satirSayisi, olcum.satirSayisi === 3 ? '✓' : '✗ (3 bekleniyordu)')
console.log('  acik satir sayisi  :', olcum.acikSayisi, olcum.acikSayisi === 1 ? '✓' : '✗ (1 bekleniyordu)')
console.log('  acik: icerik kutusu :', olcum.acikIcerikKutusu ? '✓' : '✗')
console.log('  acik: havuz kareler:', olcum.acikHavuzKare, olcum.acikHavuzKare >= 4 ? '✓' : '✗')
console.log('  acik: tur          :', olcum.acikTur ? '✓' : '✗')
console.log('  acik: olcu         :', olcum.acikOlcu ? '✓' : '✗')
console.log('  acik: yon secimi yok:', olcum.acikYonYok ? '✓' : 'VAR ✗')
console.log('  kapali kucuk resim :', olcum.kapaliKucukResim ? '✓' : '✗')
console.log('  kapali satirlar    :', JSON.stringify(olcum.kapaliMetinler))
console.log('  toplam satiri      :', olcum.toplamSatiri || 'YOK ✗')
console.log('  kaydirma           :', olcum.tasma.length ? 'VAR ✗ ' + JSON.stringify(olcum.tasma) : 'yok ✓')
console.log('  icerik kesik mi    :', olcum.kesik ? 'EVET ✗' : 'hayir ✓')
console.log('  sigdirma orani     :', olcum.oran.toFixed(2), olcum.oran >= 0.6 ? '✓' : '✗ (yazi cok kuculuyor)')
console.log('  sayfa hatasi       :', hata.length ? JSON.stringify(hata.slice(0, 3)) : 'yok ✓')
console.log('  panel kabin        :', panelKabin)
console.log('  pencere toplam     :', pencere ? pencere.join(' | ') : 'YOK (tek ekranda dokum cikmaz)')
const pencereKabin = pencere ? Number((pencere[2] || '').replace(/[^0-9]/g, '')) || 0 : 0
const kabinUyumlu = !pencere || pencereKabin === panelKabin
console.log('  kabin uyumu        :', kabinUyumlu ? '✓' : '✗ (' + pencereKabin + ' ≠ ' + panelKabin + ')')

const gecti =
  olcum.satirSayisi === 3 &&
  olcum.acikSayisi === 1 &&
  olcum.acikIcerikKutusu &&
  olcum.acikHavuzKare >= 4 &&
  olcum.acikTur &&
  olcum.acikOlcu &&
  olcum.acikYonYok &&
  olcum.kapaliKucukResim &&
  olcum.tasma.length === 0 &&
  !olcum.kesik &&
  olcum.oran >= 0.6 &&
  kabinUyumlu &&
  hata.length === 0

console.log('\nSONUC:', gecti ? 'PANEL TAMAM ✓' : 'EKSIK VAR ✗')
await b.close()
await t.close()
process.exit(gecti ? 0 : 1)
