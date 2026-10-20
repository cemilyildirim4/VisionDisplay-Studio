/**
 * UÇTAN UCA AKIŞ TESTİ.
 *
 * Açılış testi yetmedi: uygulama açılıyordu ama 4. köşe konunca çöküyordu.
 * Hata ancak o kartın çizildiği anda ortaya çıkıyor, yani akışın GERÇEKTEN
 * yürütülmesi gerekiyor.
 *
 * Denenen akış (şartname 1.1'deki iki yol):
 *   model seç → fotoğraf yükle
 *   A) "Belirli bir alanım var"  → 4 köşe → alanı onayla → sığdır → bitir
 *   B) "Belirli bir alanım yok"  → referans (2 nokta + cm) → "Ölçüm ile
 *      ayarla" → 4 köşe → alanı onayla → sığdır → bitir
 *   C) "Manuel düzenle" → köşe işaretlemeden doğrudan yerleştirme adımı
 *
 * Her adımdan sonra iki şey denetleniyor: hata ekranı ("Bir şeyler ters
 * gitti") ve sayfa hatası (konsoldaki ReferenceError vb.). Biri çıkarsa
 * test o anda düşüyor ve hangi adımda olduğu yazılıyor.
 *
 * ÇALIŞTIRMA: önce `npm run build`, sonra API'nin CORS listesindeki bir
 * portta önizleme (`npx vite preview --port 5174`), sonra bu betik.
 * Adres ADRES ortam değişkeniyle değiştirilebilir.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const ADRES = process.env.ADRES || 'http://localhost:5174/'
const TARAYICI =
  process.env.TARAYICI ||
  'C:/Users/rabia/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
const FOTO = fileURLToPath(new URL('../public/test-ofis.jpg', import.meta.url))
/* Fotoğraf yüklenince tarayıcı içi iki model çalışıyor; ilk seferde iniyorlar. */
const INCELEME_SURESI = Number(process.env.INCELEME_MS || 95000)

const tarayici = await chromium.launch({
  executablePath: TARAYICI,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

let hataSayisi = 0

/** Bir akışı yürütür; her adımda çökme denetimi yapar. */
async function akis(baslik, yol) {
  console.log('\n═══ ' + baslik + ' ═══')
  const baglam = await tarayici.newContext({ viewport: { width: 1600, height: 950 } })
  const s = await baglam.newPage()
  const hatalar = []
  s.on('pageerror', (e) => hatalar.push(String(e).split('\n')[0].slice(0, 160)))
  await s.addInitScript(() => {
    const k = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '')
    const e = Math.floor(Date.now() / 1000) + 86400
    localStorage.setItem(
      'vds-session',
      JSON.stringify({
        accessToken: k({ alg: 'HS256' }) + '.' + k({ role: 'Admin', exp: e }) + '.x',
        refreshToken: 'y',
        role: 'Admin',
        displayName: 'Test',
      }),
    )
  })

  let dusuk = false
  /** Adımdan sonra çökme var mı. */
  const denetle = async (adim) => {
    if (dusuk) return false
    const govde = await s.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '))
    const ekran = /Bir şeyler ters gitti|Something went wrong/i.test(govde)
    if (ekran || hatalar.length) {
      console.log('  ✗ ' + adim)
      if (ekran) console.log('      HATA EKRANI')
      for (const h of hatalar.slice(0, 2)) console.log('      ' + h)
      dusuk = true
      hataSayisi++
      return false
    }
    console.log('  ✓ ' + adim)
    return true
  }

  /** Metni tam eşleşen etkin düğmeye basar. */
  const bas = async (metin, bekle = 1500) => {
    const oldu = await s.evaluate((q) => {
      const d = [...document.querySelectorAll('button')].find(
        (x) => (x.textContent || '').replace(/\s+/g, ' ').trim() === q && !x.disabled,
      )
      if (d) {
        d.click()
        return true
      }
      return false
    }, metin)
    await s.waitForTimeout(bekle)
    return oldu
  }
  const icerir = (metin) =>
    s.evaluate((q) => (document.body.innerText || '').replace(/\s+/g, ' ').includes(q), metin)

  try {
    await s.goto(ADRES, { waitUntil: 'domcontentloaded' })
    await s.waitForTimeout(4500)
    if (!(await denetle('sayfa açıldı'))) return false

    await bas('Yapılandırmayı başlat', 2500)
    if (!(await denetle('yapılandırma başladı'))) return false

    await s.getByText('DEMO-P1.25').first().click()
    await s.waitForTimeout(900)
    await s.evaluate(() => {
      const d = [...document.querySelectorAll('button')].find((x) => /Seçmek/.test(x.innerText) && !x.disabled)
      if (d) d.click()
    })
    await s.waitForTimeout(4000)
    if (!(await denetle('model seçildi'))) return false

    await bas('Kendi fotoğrafım', 2000)
    for (const g of await s.$$('input[type="file"]')) {
      const kabul = await g.getAttribute('accept')
      if (kabul && kabul.includes('webp')) {
        await g.setInputFiles(FOTO)
        break
      }
    }
    await s.waitForTimeout(INCELEME_SURESI)
    if (!(await denetle('fotoğraf yüklendi ve incelendi'))) return false

    const sonuc = await yol({ s, bas, denetle, icerir })
    if (dusuk) return false
    return sonuc !== false
  } catch (e) {
    console.log('  ✗ beklenmeyen durum: ' + String(e).split('\n')[0].slice(0, 140))
    hataSayisi++
    return false
  } finally {
    await baglam.close()
  }
}

/** Tuvalin dikdörtgeni — köşeler buna göre tıklanıyor. */
const tuval = (s) =>
  s.evaluate(() => {
    const m = document.querySelector('#pdf-onizleme')
    const r = m.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

/** Dört köşeyi işaretler (saat yönünde, makul bir dikdörtgen). */
async function dortKose(s) {
  const t = await tuval(s)
  const x = t.x + t.w * 0.33
  const y = t.y + t.h * 0.26
  const en = t.w * 0.26
  const boy = t.h * 0.28
  for (const [px, py] of [
    [x, y],
    [x + en, y + boy * 0.06],
    [x + en, y + boy],
    [x, y + boy * 0.94],
  ]) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(420)
  }
}

/** Sihirbaz kartının içindeki ilk sayı kutusuna yazar (referans cm'si). */
async function kartaSayiYaz(s, deger) {
  return s.evaluate((v) => {
    const kart = [...document.querySelectorAll('div')].find(
      (d) => /border-brand/.test(d.className || '') && /rounded-xl/.test(d.className || ''),
    )
    const k = kart?.querySelector('input[type="number"]')
    if (!k) return false
    const yaz = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    yaz.call(k, String(v))
    k.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }, deger)
}

/**
 * Kartın "en" / "boy" kutularını doldurur.
 *
 * Kutular ALAN ONAYLANDIKTAN SONRA, yerleştirme adımında çıkıyor; köşeleri
 * işaretlerken kartta hiç sayı kutusu yok. Testin ilk sürümü bu yüzden
 * ölçüyü hiçbir yere yazamıyor ve sessizce geçiyordu.
 */
async function olcuYaz(s, en, boy) {
  const sayi = await s.evaluate(
    ([e, b]) => {
      const kart = [...document.querySelectorAll('div')].find(
        (d) => /border-brand/.test(d.className || '') && /rounded-xl/.test(d.className || ''),
      )
      if (!kart) return 0
      const yaz = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      let n = 0
      for (const i of kart.querySelectorAll('input[type="number"]')) {
        if (i.placeholder !== 'en' && i.placeholder !== 'boy') continue
        yaz.call(i, String(i.placeholder === 'en' ? e : b))
        i.dispatchEvent(new Event('input', { bubbles: true }))
        n++
      }
      return n
    },
    [en, boy],
  )
  await s.waitForTimeout(1200)
  return sayi
}

/* ── A) "Belirli bir alanım var" ─────────────────────────────────────── */
const a = await akis('A — BELİRLİ BİR ALANIM VAR', async ({ s, bas, denetle, icerir }) => {
  if (!(await bas('Belirli bir alanım var', 1800))) {
    console.log('  ✗ "Belirli bir alanım var" düğmesi bulunamadı')
    hataSayisi++
    return false
  }
  if (!(await denetle('alan yolu seçildi'))) return false

  await dortKose(s)
  if (!(await denetle('4 köşe işaretlendi'))) return false

  await bas('Alanı onayla', 2200)
  if (!(await denetle('alan onaylandı'))) return false

  if ((await olcuYaz(s, 300, 150)) < 2) {
    console.log('  ✗ en/boy kutuları bulunamadı')
    hataSayisi++
    return false
  }
  if (!(await denetle('gerçek en/boy yazıldı'))) return false

  /*
   * Şartname: bu yolda "Tasarımı ölçüye sığdır" ÇALIŞIR. Ölçü yazılınca
   * odak çözülüyor ve düğme açılıyor; çıkmıyorsa kusur vardır.
   */
  if (!(await bas('Tasarımı ölçüye sığdır', 2500))) {
    console.log('  ✗ "Tasarımı ölçüye sığdır" çıkmadı (en/boy yazıldığı hâlde)')
    hataSayisi++
    return false
  }
  if (!(await denetle('ölçüye sığdırıldı'))) return false

  await bas('Bitir ve tasarımı göster', 2500)
  if (!(await denetle('bitirildi'))) return false

  const sihirbazKapandi = !(await icerir('Alanı onayla'))
  console.log('  · sihirbaz kapandı :', sihirbazKapandi ? 'evet' : 'HAYIR')
  return true
})

/* ── B) "Alanım yok" → referans → ölçüm ile ayarla ───────────────────── */
const b = await akis('B — ALANIM YOK → ÖLÇÜM İLE AYARLA', async ({ s, bas, denetle, icerir }) => {
  if (!(await bas('Belirli bir alanım yok', 1800))) {
    console.log('  ✗ "Belirli bir alanım yok" düğmesi bulunamadı')
    hataSayisi++
    return false
  }
  if (!(await denetle('referans yolu seçildi'))) return false

  /* Referans: iki nokta. */
  const t = await tuval(s)
  for (const [px, py] of [
    [t.x + t.w * 0.3, t.y + t.h * 0.7],
    [t.x + t.w * 0.3, t.y + t.h * 0.3],
  ]) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(500)
  }
  if (!(await denetle('referansın iki ucu işaretlendi'))) return false

  if (!(await bas('Devam', 1600))) {
    console.log('  ✗ referanstan sonra "Devam" bulunamadı')
    hataSayisi++
    return false
  }
  if (!(await kartaSayiYaz(s, 210))) {
    console.log('  ✗ referans cm kutusu bulunamadı')
    hataSayisi++
    return false
  }
  await s.waitForTimeout(800)
  if (!(await denetle('referans ölçüsü yazıldı'))) return false

  if (!(await icerir('Ölçek alındı'))) {
    console.log('  ✗ ölçek alınmadı (cm yazıldığı hâlde)')
    hataSayisi++
    return false
  }
  if (!(await denetle('ölçek alındı'))) return false

  if (!(await bas('Ölçüm ile ayarla', 2200))) {
    console.log('  ✗ "Ölçüm ile ayarla" bulunamadı ya da kapalı')
    hataSayisi++
    return false
  }
  if (!(await denetle('ölçüm ile ayarla seçildi'))) return false

  await dortKose(s)
  if (!(await denetle('4 köşe işaretlendi'))) return false

  await bas('Alanı onayla', 2200)
  if (!(await denetle('alan onaylandı'))) return false

  await bas('Tasarımı ölçüye sığdır', 2000)
  await bas('Bitir ve tasarımı göster', 2500)
  if (!(await denetle('bitirildi'))) return false
  return true
})

/* ── C) "Manuel düzenle" ─────────────────────────────────────────────── */
const c = await akis('C — MANUEL DÜZENLE', async ({ s, bas, denetle, icerir }) => {
  await bas('Belirli bir alanım yok', 1800)
  const t = await tuval(s)
  for (const [px, py] of [
    [t.x + t.w * 0.3, t.y + t.h * 0.7],
    [t.x + t.w * 0.3, t.y + t.h * 0.3],
  ]) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(500)
  }
  await bas('Devam', 1600)
  await kartaSayiYaz(s, 210)
  await s.waitForTimeout(900)
  if (!(await denetle('referans tamamlandı'))) return false

  if (!(await bas('Manuel düzenle', 2200))) {
    console.log('  ✗ "Manuel düzenle" düğmesi bulunamadı ya da kapalı')
    hataSayisi++
    return false
  }
  if (!(await denetle('manuel düzenle açıldı'))) return false

  const yakinda = await icerir('henüz hazır değil')
  console.log('  · "henüz hazır değil" notu :', yakinda ? 'HALA VAR ✗' : 'yok ✓')
  if (yakinda) hataSayisi++

  /* 4. adımın kendi metni ve bitir düğmesi: ikisi de oradaysa adım gerçekten açık. */
  const yerlestirmede =
    (await icerir('Kutuyu gövdesinden tutup')) && (await icerir('Bitir ve tasarımı göster'))
  console.log('  · yerleştirme adımı açıldı :', yerlestirmede ? 'evet ✓' : 'HAYIR ✗')
  if (!yerlestirmede) hataSayisi++
  /* Çıkmaz sokak denetimi: eski cm kutusu adımına düşmüş olmamalı. */
  const cikmazSokak = await icerir('Yerleşim alanının ölçüsü')
  console.log('  · eski cm kutusu adımı     :', cikmazSokak ? 'ORAYA DÜŞTÜ ✗' : 'yok ✓')
  if (cikmazSokak) hataSayisi++

  await bas('Bitir ve tasarımı göster', 2500)
  if (!(await denetle('bitirildi'))) return false
  return true
})

await tarayici.close()

console.log('\n─────────────────────────────')
console.log('A (alanım var)      :', a ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('B (ölçüm ile ayarla):', b ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('C (manuel düzenle)  :', c ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
if (hataSayisi > 0) {
  console.log('\nAKIS TESTI DUSTU — yayina alinmamali.')
  process.exitCode = 1
} else {
  console.log('\nAkis testi gecti.')
}
