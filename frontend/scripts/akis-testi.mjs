/**
 * UÇTAN UCA AKIŞ TESTİ.
 *
 * Açılış testi yetmedi: uygulama açılıyordu ama 4. köşe konunca çöküyordu.
 * Hata ancak o kartın çizildiği anda ortaya çıkıyor, yani akışın GERÇEKTEN
 * yürütülmesi gerekiyor.
 *
 * Denenen akış (yeni sıra):
 *   model seç → fotoğraf yükle → REFERANS (2 nokta + santim) → tek seçim
 *   A) "Alanı işaretle"    → 4 köşe → onayla → en/boy → sığdır → bitir
 *   B) "Serbest yerleştir" → kutu kabin sayısıyla büyüyor mu → bitir
 *
 * Çökme denetiminin yanında iki ÜRÜN denetimi daha var, ikisi de canlıda
 * çıkan hatalardan geliyor:
 *   • Tasarım alan onaylanınca GERÇEKTEN görünüyor mu (saydamlık > 0,
 *     ölçüsü var mı). Bir ara sığdırma kabin sayısını hesaplıyor ama
 *     tasarım çizilmiyordu.
 *   • Serbest yerleştirmede kutu, sütun artırılınca büyüyor mu.
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

/** Tuvalin dikdörtgeni — köşeler buna göre tıklanıyor. */
const tuval = (s) =>
  s.evaluate(() => {
    const m = document.querySelector('#pdf-onizleme')
    const r = m.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

/** Sihirbaz kartının düğmeleri ve sayı kutusu var mı. */
const kartBilgisi = (s) =>
  s.evaluate(() => {
    const k = [...document.querySelectorAll('div')].find(
      (d) => /border-brand/.test(d.className || '') && /rounded-xl/.test(d.className || ''),
    )
    if (!k) return { yok: true, sayiKutusu: false }
    return {
      dugmeler: [...k.querySelectorAll('button')].map((b) => (b.textContent || '').trim()),
      sayiKutusu: !!k.querySelector('input[type="number"]'),
    }
  })

/**
 * TASARIM GERÇEKTEN GÖRÜNÜYOR MU.
 *
 * Yalnızca "çökmedi" yetmiyor: tasarım opacity 0 ile çizilip hiç
 * görünmeyebiliyor (canlıda tam olarak bu oldu). Yüzün kendi saydamlığı
 * ve bütün atalarınınki çarpılıyor, ölçüsü de denetleniyor.
 */
const tasarimGorunur = (s) =>
  s.evaluate(() => {
    const e = document.querySelector('[data-tasarim-yuz]')
    if (!e) return { var: false }
    let saydamlik = 1
    for (let d = e; d && d !== document.documentElement; d = d.parentElement) {
      saydamlik *= Number(getComputedStyle(d).opacity || 1)
    }
    const r = e.getBoundingClientRect()
    return { var: true, saydamlik: Number(saydamlik.toFixed(2)), en: Math.round(r.width), boy: Math.round(r.height) }
  })

/** Sihirbaz kartının içindeki ilk sayı kutusuna yazar (referans santimi). */
const kartaSayiYaz = (s, deger) =>
  s.evaluate((v) => {
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

/** Kartın "en" / "boy" kutularını doldurur (alan onaylandıktan sonra çıkıyorlar). */
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

/**
 * DÖRT KENAR ÇİZGİSİ ÇİZER.
 *
 * Her kenar iki tıklama: kenarın göründüğü yerin iki ucu. Sıra kasten
 * KARIŞIK veriliyor (alt, sağ, üst, sol) — uygulamanın hangi çizginin
 * hangi kenar olduğunu kendisi bulması gerekiyor. Çizgiler kenarın
 * tamamını değil ORTA parçasını kaplıyor; köşeler kesişimden çıkmalı.
 */
async function dortKenar(s) {
  const t = await tuval(s)
  const sol = t.x + t.w * 0.33
  const ust = t.y + t.h * 0.26
  const sag = sol + t.w * 0.26
  const alt = ust + t.h * 0.28
  const ic = (a, b, p) => a + (b - a) * p
  const cizgiler = [
    /* alt */ [[ic(sol, sag, 0.2), alt], [ic(sol, sag, 0.8), alt]],
    /* sağ */ [[sag, ic(ust, alt, 0.2)], [sag, ic(ust, alt, 0.8)]],
    /* üst */ [[ic(sol, sag, 0.2), ust], [ic(sol, sag, 0.8), ust]],
    /* sol */ [[sol, ic(ust, alt, 0.2)], [sol, ic(ust, alt, 0.8)]],
  ]
  for (const c of cizgiler) {
    for (const [px, py] of c) {
      await s.mouse.move(px, py)
      await s.mouse.down()
      await s.mouse.up()
      await s.waitForTimeout(380)
    }
  }
}

/** Sol paneldeki bir adımlayıcıyı bir artırır (etiketine göre bulunuyor). */
const kabinArtir = (s, etiketMetni) =>
  s.evaluate((q) => {
    const etiket = [...document.querySelectorAll('aside *')].find(
      (e) => e.children.length === 0 && (e.textContent || '').trim() === q,
    )
    if (!etiket) return false
    /* Adımlayıcı etiketin yakınındaki kutuda; "+" son düğme. */
    let kutu = etiket.parentElement
    for (let i = 0; i < 4 && kutu; i++) {
      const d = [...kutu.querySelectorAll('button')]
      if (d.length >= 2) {
        d[d.length - 1].click()
        return true
      }
      kutu = kutu.parentElement
    }
    return false
  }, etiketMetni)

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
  const dus = (neden) => {
    console.log('  ✗ ' + neden)
    hataSayisi++
    return false
  }

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

    /* YENİ SIRA: eski giriş sorusu kalkmış, ilk adım referans olmalı. */
    if (await icerir('Belirli bir alanım')) return dus('eski giriş sorusu hâlâ çıkıyor')
    if (!(await icerir('Referans ölçü'))) return dus('fotoğraftan sonra referans adımı açılmadı')
    if (!(await denetle('ilk adım referans'))) return false

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
    if (!(await bas('Devam', 1600))) return dus('iki noktadan sonra "Devam" bulunamadı')
    if (!(await kartaSayiYaz(s, 210))) return dus('referans santim kutusu bulunamadı')
    await s.waitForTimeout(900)
    if (!(await icerir('Ölçek alındı'))) return dus('ölçek alınmadı (santim yazıldığı hâlde)')
    if (!(await bas('Devam', 1800))) return dus('ölçekten sonra "Devam" bulunamadı')
    if (!(await denetle('referans tamamlandı, seçim adımı açıldı'))) return false

    /* Her kart tek iş yapmalı: seçim kartında santim kutusu olmamalı. */
    if ((await kartBilgisi(s)).sayiKutusu) {
      return dus('seçim kartında santim kutusu da var (kart iki iş yapıyor)')
    }

    const sonuc = await yol({ s, bas, denetle, icerir, dus })
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

/* ── A) ALANI İŞARETLE ───────────────────────────────────────────────── */
const a = await akis('A — ALANI İŞARETLE', async ({ s, bas, denetle, icerir, dus }) => {
  if (!(await bas('Alanı işaretle', 1800))) return dus('"Alanı işaretle" düğmesi bulunamadı')
  if (!(await denetle('alan işaretlemeye geçildi'))) return false

  /* Eski köşe adımı ve ayrı "kenarlardan bul" kipi kalkmış olmalı. */
  if (await icerir('Köşe görünmüyor')) return dus('eski "kenarlardan bul" kipi hâlâ var')
  if (!(await icerir('kenarını çizin'))) return dus('kenar çizim adımı açılmadı')

  await dortKenar(s)
  if (!(await denetle('4 kenar çizildi'))) return false

  /* Çizgilerin kesişiminden geçerli bir dörtgen çıkmalı: onay açılmış olmalı. */
  const kart = await kartBilgisi(s)
  const onayAcik = (kart.dugmeler || []).includes('Alanı onayla')
  console.log('  · onay düğmesi açık        :', onayAcik ? 'evet' : 'HAYIR')
  if (!onayAcik) return dus('kenarlardan geçerli bir alan çıkmadı')

  await bas('Alanı onayla', 2500)
  if (!(await denetle('alan onaylandı'))) return false

  const g1 = await tasarimGorunur(s)
  console.log('  · tasarım onaydan sonra    :', JSON.stringify(g1))
  if (!g1.var || !(g1.saydamlik > 0.05) || !(g1.en > 10)) {
    return dus('tasarım görünmüyor (alan onaylandığı hâlde)')
  }

  if ((await olcuYaz(s, 300, 150)) < 2) return dus('en/boy kutuları bulunamadı')
  if (!(await denetle('gerçek en/boy yazıldı'))) return false

  if (!(await bas('Tasarımı ölçüye sığdır', 2500))) {
    return dus('"Tasarımı ölçüye sığdır" çıkmadı (en/boy yazıldığı hâlde)')
  }
  if (!(await denetle('ölçüye sığdırıldı'))) return false

  const g2 = await tasarimGorunur(s)
  console.log('  · tasarım sığdırmadan sonra:', JSON.stringify(g2))
  if (!(g2.saydamlik > 0.05) || !(g2.en > 10)) return dus('sığdırmadan sonra tasarım görünmüyor')

  await bas('Bitir ve tasarımı göster', 2500)
  if (!(await denetle('bitirildi'))) return false
  console.log('  · sihirbaz kapandı         :', (await icerir('Alanı onayla')) ? 'HAYIR' : 'evet')
  return true
})

/* ── B) SERBEST YERLEŞTİR ────────────────────────────────────────────── */
const b = await akis('B — SERBEST YERLEŞTİR', async ({ s, bas, denetle, icerir, dus }) => {
  if (!(await bas('Serbest yerleştir', 2500))) return dus('"Serbest yerleştir" düğmesi bulunamadı')
  if (!(await denetle('serbest yerleştirmeye geçildi'))) return false

  if (await icerir('henüz hazır değil')) return dus('"henüz hazır değil" notu hâlâ çıkıyor')
  if (!(await icerir('Kutuyu gövdesinden tutup'))) return dus('yerleştirme adımı açılmadı')
  if (await icerir('Yerleşim alanının ölçüsü')) return dus('eski santim kutusu adımına düştü')

  const once = await tasarimGorunur(s)
  console.log('  · başlangıç kutusu         :', JSON.stringify(once))
  if (!once.var || !(once.saydamlik > 0.05) || !(once.en > 10)) {
    return dus('serbest yerleştirmede tasarım görünmüyor')
  }

  const artti = (await kabinArtir(s, 'Sütunlar')) || (await kabinArtir(s, 'Sütun'))
  if (!artti) return dus('sütun adımlayıcısı bulunamadı')
  await s.waitForTimeout(2200)
  const sonra = await tasarimGorunur(s)
  console.log('  · sütun artınca            :', JSON.stringify(sonra))
  if (!(sonra.en > once.en + 2)) return dus('kutu kabin sayısıyla büyümedi')
  if (!(await denetle('kutu kabin sayısıyla büyüdü'))) return false

  await bas('Bitir ve tasarımı göster', 2500)
  if (!(await denetle('bitirildi'))) return false
  return true
})

await tarayici.close()

console.log('\n─────────────────────────────')
console.log('A (alanı işaretle)   :', a ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('B (serbest yerleştir):', b ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
if (hataSayisi > 0) {
  console.log('\nAKIS TESTI DUSTU — yayina alinmamali.')
  process.exitCode = 1
} else {
  console.log('\nAkis testi gecti.')
}
