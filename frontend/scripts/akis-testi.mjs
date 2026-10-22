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
 * TASARIMIN GERÇEK ÖLÇÜSÜ — sol panelin kendi yazdığı sayılardan.
 *
 * Panel "SÜTUNLAR 9 × 320 mm = 2880 mm" diyor; kabin ölçüsü de kaç kabin
 * konduğu da orada. Ekrandaki piksel ölçüsü bu soruyu cevaplayamıyor:
 * perspektif yüzünden alanla tasarımın pikselleri karşılaştırılamaz.
 */
/*
 * PANELDEKI OLCU — akordeonun ACIK satirindan.
 *
 * Eskiden panelde eksen basina "SUTUNLAR 9 x 320 mm = 2880 mm" satiri
 * vardi; sol panel sadelestirilince o satirlar kalkti (kabin sayisi
 * yerine kurulacak ekranin olcusu soruluyor). Ayni bilgi su an acik
 * satirda duruyor: kutularda kabin sayisi, altinda toplam metre.
 */
const panelOlcusu = (s) =>
  s.evaluate(() => {
    const panel = document.querySelector('aside.yatay-panel-model')
    const liste = panel && panel.querySelector('ul')
    const acik = liste && [...liste.children].find((li) => li.dataset.acik === '1')
    if (!acik) return { sutun: null, satir: null, tani: 'acik satir yok' }
    /* Stepper kutulari type=text + inputMode=decimal; olcu bolumundeki
       ilk iki kutu sutun ve satir. */
    const adet = [...acik.querySelectorAll('input[inputmode="decimal"]')]
      .map((x) => Number(String(x.value).replace(',', '.')))
      .filter((n) => n > 0)
    const metin = (acik.innerText || '').replace(/\s+/g, ' ')
    const m = metin.match(/([\d.,]+) × ([\d.,]+) m/)
    if (!m || adet.length < 2) {
      return { sutun: null, satir: null, tani: 'adet=' + JSON.stringify(adet) + ' metin=' + metin.slice(0, 160) }
    }
    /* "2,88" -> 2880 mm. Binlik ayirac nokta, ondalik virgul. */
    const mm = (x) => Math.round(Number(x.split('.').join('').replace(',', '.')) * 1000)
    const enMm = mm(m[1])
    const boyMm = mm(m[2])
    return {
      sutun: { adet: adet[0], kabinMm: Math.round(enMm / adet[0]), toplamMm: enMm },
      satir: { adet: adet[1], kabinMm: Math.round(boyMm / adet[1]), toplamMm: boyMm },
    }
  })

/** Alanın dört köşesine sırayla tıklar — varsayılan yol. */
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

/**
 * MODEL SEÇ + FOTOĞRAF YÜKLE.
 *
 * Hem ilk kurulumda hem sıfırlamadan sonraki kurulumda aynı adımlar.
 */
async function modelVeFotograf(s, bas, INCELEME) {
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
    const kabul = await g.getAttribute('accept')
    if (kabul && kabul.includes('webp')) {
      await g.setInputFiles(FOTO)
      break
    }
  }
  await s.waitForTimeout(INCELEME)
}

/** Alanın köşelerinden yalnızca ilk üçünü tıklar. */
async function ucKose(s) {
  const t = await tuval(s)
  const x = t.x + t.w * 0.33
  const y = t.y + t.h * 0.26
  const en = t.w * 0.26
  const boy = t.h * 0.28
  for (const [px, py] of [
    [x, y],
    [x + en, y + boy * 0.06],
    [x + en, y + boy],
  ]) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(420)
  }
  return { x, y, en, boy }
}

/**
 * GÖRÜNMEYEN KÖŞENİN İKİ KENARINI İŞARETLER.
 *
 * Eksik köşe sol alt. Orada birleşen iki kenar: sol kenar (yukarıdan
 * aşağı) ve alt kenar (sağdan sola). Her birinin GÖRÜNEN parçasından
 * ikişer nokta konuyor; köşenin kendisine hiç tıklanmıyor.
 */
async function ikiKenar(s, k) {
  const ic = (a, b, p) => a + (b - a) * p
  const noktalar = [
    /* sol kenar: üstten ortaya kadar */
    [k.x, ic(k.y, k.y + k.boy, 0.1)],
    [k.x, ic(k.y, k.y + k.boy, 0.55)],
    /* alt kenar: sağdan ortaya kadar */
    [ic(k.x, k.x + k.en, 0.9), k.y + k.boy],
    [ic(k.x, k.x + k.en, 0.45), k.y + k.boy],
  ]
  for (const [px, py] of noktalar) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(420)
  }
}

/**
 * AYARLAR PENCERESİ.
 *
 * Duvar, yapılandırma, ekran dizilimi ve içerik panelden buraya taşındı;
 * testin de oraya girip çıkması gerekiyor.
 */
const ayarlariAc = async (s, bas) => {
  const acik = await s.evaluate(() => /Ekran ayarları/.test(document.body.innerText || ''))
  if (!acik) return false
  const oldu = await bas('Ekran ayarları', 1200)
  return oldu
}
const ayarlariKapat = (s, bas) => bas('Tamam', 1200)

/** Bir adımlayıcıyı bir artırır (etiketine göre bulunuyor). */
const kabinArtir = (s, etiketMetni) =>
  s.evaluate((q) => {
    const etiket = [...document.querySelectorAll('*')].find(
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
  /*
   * TEK YOL CALISTIRMA: YOL=A gibi. Dort yol birden uzun suruyor ve
   * dusen yolu ayikla gormek icin hepsini yeniden kosmak gerekiyordu.
   */
  if (process.env.YOL && !baslik.startsWith(process.env.YOL)) return true
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
      /* Dugme metni mastardan emir kipine gecti: "Secmek" -> "Sec". */
  const d = [...document.querySelectorAll('button')].find((x) => /^(Seç|Seçmek)$/.test((x.innerText || '').trim()) && !x.disabled)
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

  /* Varsayılan yol köşe seçme; kenar çizimi düğmenin arkasında durmalı. */
  if (!(await icerir('köşesini işaretleyin'))) return dus('köşe işaretleme adımı açılmadı')
  if (!(await icerir('Köşe görünmüyor'))) return dus('"Köşe görünmüyor" düğmesi yok')

  await dortKose(s)
  if (!(await denetle('4 köşe işaretlendi'))) return false

  /* Çizgilerin kesişiminden geçerli bir dörtgen çıkmalı: onay açılmış olmalı. */
  const kart = await kartBilgisi(s)
  const onayAcik = (kart.dugmeler || []).includes('Alanı onayla')
  console.log('  · onay düğmesi açık        :', onayAcik ? 'evet' : 'HAYIR')
  if (!onayAcik) return dus('kenarlardan geçerli bir alan çıkmadı')

  await bas('Alanı onayla', 2500)
  if (!(await denetle('alan onaylandı'))) return false

  /*
   * ÜRÜN KARARI: ölçü sürerken tasarım görünmüyor; onay da göstermiyor.
   * Tasarım "Tasarımı ölçüye sığdır" deyince çıkıyor.
   */
  /*
   * ÜRÜN KARARI: ölçü sürerken tasarım görünmüyor ama ALAN ONAYLANINCA
   * görünüyor — onayla birlikte ölçü işi bitiyor.
   */
  const g1 = await tasarimGorunur(s)
  console.log('  · onaydan sonra (görünmeli)   :', JSON.stringify(g1))
  if (!g1.var || !(g1.saydamlik > 0.05) || !(g1.en > 10)) {
    return dus('alan onaylandığı hâlde tasarım görünmüyor')
  }

  if ((await olcuYaz(s, 300, 150)) < 2) return dus('en/boy kutuları bulunamadı')
  if (!(await denetle('gerçek en/boy yazıldı'))) return false

  if (!(await bas('Tasarımı ölçüye sığdır', 2800))) {
    return dus('"Tasarımı ölçüye sığdır" çıkmadı (en/boy yazıldığı hâlde)')
  }
  if (!(await denetle('ölçüye sığdırıldı'))) return false

  const g2 = await tasarimGorunur(s)
  console.log('  · sığdırdıktan sonra          :', JSON.stringify(g2))
  if (!g2.var || !(g2.saydamlik > 0.05) || !(g2.en > 10)) {
    return dus('sığdırmadan sonra tasarım görünmüyor')
  }

  /*
   * TEK SEFERDE TAM OTURMA.
   *
   * Kural: taşma yok ve alana sığan EN FAZLA kabin. Yani her eksende
   *   0 ≤ alan − tasarım < bir kabin
   * olmalı. Bir kabinden büyük boşluk kalıyorsa bir sıra daha sığardı.
   */
  /*
   * TEK SEFERDE TAM OTURMA.
   *
   * Kural: taşma yok ve alana sığan EN FAZLA kabin. Yani her eksende
   *   0 ≤ alan − tasarım < bir kabin
   * olmalı; artan bir kabinden büyükse bir sıra daha sığardı.
   * Alan 300 × 150 cm = 3000 × 1500 mm (yukarıda yazıldı).
   */
  const ilk = await panelOlcusu(s)
  console.log('  · panel ölçüsü                :', JSON.stringify(ilk))
  if (!ilk.sutun || !ilk.satir) return dus('panelde sütun/satır ölçüsü okunamadı')
  const denetleEksen = (ad, o, alanMm) => {
    const artan = alanMm - o.toplamMm
    console.log('  · ' + ad + ': ' + o.adet + ' × ' + o.kabinMm + ' = ' + o.toplamMm + ' mm, artan ' + artan + ' mm')
    if (artan < 0) return ad + ' taşıyor'
    if (artan >= o.kabinMm) return ad + ' tam oturmuyor, bir tane daha sığardı'
    return null
  }
  const h1 = denetleEksen('en', ilk.sutun, 3000) || denetleEksen('boy', ilk.satir, 1500)
  if (h1) return dus(h1)

  /* İkinci basış hiçbir şeyi değiştirmemeli: tek seferde oturmuş olmalı. */
  await bas('Tasarımı ölçüye sığdır', 2500)
  const ikinci = await panelOlcusu(s)
  if (ikinci.sutun?.adet !== ilk.sutun.adet || ikinci.satir?.adet !== ilk.satir.adet) {
    return dus('ikinci sığdırma sonucu değiştirdi: ' + JSON.stringify(ikinci))
  }
  if (!(await denetle('tek seferde tam oturdu'))) return false

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

  /*
   * Kutu konurken tasarım GİZLİ: taşınan şey kesikli kutu, altındaki
   * duvarın görünmesi gerekiyor. Ölçüsü yine de okunuyor — büyüyüp
   * büyümediği saydamlıktan bağımsız.
   */
  const once = await tasarimGorunur(s)
  console.log('  · başlangıç kutusu (gizli)    :', JSON.stringify(once))
  if (!once.var || !(once.en > 10)) return dus('serbest yerleştirmede kutu kurulmadı')
  if (once.saydamlik > 0.05) return dus('kutu konurken tasarım görünüyor (gizli olmalıydı)')

  const artti = (await kabinArtir(s, 'Sütunlar')) || (await kabinArtir(s, 'Sütun'))
  if (!artti) return dus('sütun adımlayıcısı bulunamadı')
  await s.waitForTimeout(2200)
  const sonra = await tasarimGorunur(s)
  console.log('  · sütun artınca            :', JSON.stringify(sonra))
  if (!(sonra.en > once.en + 2)) return dus('kutu kabin sayısıyla büyümedi')
  if (!(await denetle('kutu kabin sayısıyla büyüdü'))) return false

  await bas('Bitir ve tasarımı göster', 2500)
  if (!(await denetle('bitirildi'))) return false
  /* "Bitir ve tasarımı göster" adını hak etmeli. */
  const son = await tasarimGorunur(s)
  console.log('  · bitirince                   :', JSON.stringify(son))
  if (!(son.saydamlik > 0.05)) return dus('bitirildiği hâlde tasarım görünmüyor')
  return true
})

/* ── C) KÖŞE GÖRÜNMÜYOR → KENARLARDAN ─────────────────────────────── */
const c = await akis('C — KÖŞE GÖRÜNMÜYOR', async ({ s, bas, denetle, icerir, dus }) => {
  if (!(await bas('Alanı işaretle', 1800))) return dus('"Alanı işaretle" düğmesi bulunamadı')
  if (!(await denetle('alan işaretlemeye geçildi'))) return false

  /* Üç köşe normal; dördüncü köşe görünmüyor varsayılıyor. */
  const k = await ucKose(s)
  if (!(await denetle('3 köşe işaretlendi'))) return false

  if (!(await bas('Köşe görünmüyor — kenarlardan bul', 1500))) {
    return dus('"Köşe görünmüyor" düğmesi bulunamadı')
  }
  if (!(await icerir('birleşen iki kenarı'))) return dus('köşe bulma kipi açılmadı')
  if (!(await denetle('köşe bulma kipine geçildi'))) return false

  await ikiKenar(s, k)
  if (!(await denetle('iki kenar işaretlendi'))) return false

  if (!(await bas('Köşeyi ekle', 1800))) return dus('"Köşeyi ekle" açılmadı (kesişim bulunamadı)')
  if (!(await denetle('köşe kenarlardan bulundu'))) return false

  /* Kip kapanmalı, köşe seçmeye dönülmeli ve dördüncü köşe eklenmiş olmalı. */
  if (await icerir('birleşen iki kenarı')) return dus('köşe bulma kipi kapanmadı')
  if (!(await icerir('4 / 4'))) return dus('dördüncü köşe eklenmedi')

  const kart = await kartBilgisi(s)
  if (!(kart.dugmeler || []).includes('Alanı onayla')) {
    return dus('kenarlardan bulunan köşeyle alan onaylanabilir değil')
  }
  await bas('Alanı onayla', 2500)
  if (!(await denetle('alan onaylandı'))) return false
  return true
})

/* ── D) SIFIRLA, SONRA BAŞTAN KUR ─────────────────────────────────── */
const dYol = await akis('D — SIFIRLA VE BAŞTAN KUR', async ({ s, bas, denetle, icerir, dus }) => {
  /* Akışın ORTASINDA sıfırlanıyor: en çok artık state burada kalıyor. */
  if (!(await bas('Alanı işaretle', 1800))) return dus('"Alanı işaretle" düğmesi bulunamadı')
  await ucKose(s)
  if (!(await denetle('3 köşe işaretlendi (yarım bırakılacak)'))) return false

  if (!(await bas('Sıfırla', 1200))) return dus('"Sıfırla" düğmesi bulunamadı')
  if (!(await icerir('tüm ayarları sıfırlar'))) return dus('sıfırlama onayı açılmadı')
  if (!(await bas('Tamam', 3500))) return dus('sıfırlama onaylanamadı')
  if (!(await denetle('sıfırlandı'))) return false

  /* Sıfırlama gerçekten baştan başlatmalı. */
  const temiz = await s.evaluate(() => {
    const g = (document.body.innerText || '').replace(/\s+/g, ' ')
    const kart = [...document.querySelectorAll('div')].find(
      (d) => /border-brand/.test(d.className || '') && /rounded-xl/.test(d.className || ''),
    )
    return {
      baslat: /Yapılandırmayı başlat/.test(g),
      kart: !!kart,
      foto: !!document.querySelector('#pdf-onizleme img'),
      tasarim: !!document.querySelector('[data-tasarim-yuz]'),
      ekran: (g.match(/\d+\. ekran/g) || []).length,
    }
  })
  console.log('  · sıfırlamadan sonra          :', JSON.stringify(temiz))
  if (!temiz.baslat) return dus('başlangıç ekranına dönülmedi')
  if (temiz.kart) return dus('sihirbaz kartı hâlâ açık')
  if (temiz.foto) return dus('fotoğraf hâlâ duruyor')
  if (temiz.tasarim) return dus('tasarım hâlâ duruyor')
  if (temiz.ekran) return dus('ekran listesi temizlenmedi')

  /* Baştan kur: ikinci kurulum ilk kurulum gibi davranmalı. */
  await modelVeFotograf(s, bas, INCELEME_SURESI)
  if (!(await denetle('sıfırlamadan sonra yeniden kuruldu'))) return false

  if (!(await icerir('Referans ölçü'))) return dus('ikinci kurulumda referans adımı açılmadı')
  if (await icerir('Ölçek alındı')) return dus('eski fotoğrafın ölçeği taşındı')

  /* Referans ve alan bir kez daha: ikinci kurulum sonuna kadar yürümeli. */
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
  if (!(await bas('Devam', 1600))) return dus('ikinci kurulumda "Devam" yok')
  if (!(await kartaSayiYaz(s, 210))) return dus('ikinci kurulumda santim kutusu yok')
  await s.waitForTimeout(900)
  if (!(await bas('Devam', 1800))) return dus('ikinci kurulumda ölçekten sonra "Devam" yok')
  if (!(await bas('Alanı işaretle', 1800))) return dus('ikinci kurulumda alan adımı açılmadı')

  /* Eski işaretler geride kalmamalı. */
  if (!(await icerir('0 / 4'))) return dus('eski köşeler taşındı (sayaç sıfırdan başlamadı)')

  await dortKose(s)
  await bas('Alanı onayla', 2500)
  if (!(await denetle('ikinci kurulumda alan onaylandı'))) return false
  return true
})

await tarayici.close()

console.log('\n─────────────────────────────')
console.log('A (köşe işaretle)    :', a ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('B (serbest yerleştir):', b ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('C (köşe görünmüyor)  :', c ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('D (sıfırla, baştan)  :', dYol ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
if (hataSayisi > 0) {
  console.log('\nAKIS TESTI DUSTU — yayina alinmamali.')
  process.exitCode = 1
} else {
  console.log('\nAkis testi gecti.')
}
