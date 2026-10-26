/**
 * UÇTAN UCA AKIŞ TESTİ.
 *
 * Açılış testi yetmedi: uygulama açılıyordu ama 4. köşe konunca çöküyordu.
 * Hata ancak o kartın çizildiği anda ortaya çıkıyor, yani akışın GERÇEKTEN
 * yürütülmesi gerekiyor.
 *
 * Denenen akış (yeni sıra):
 *   model seç → fotoğraf yükle → REFERANS (2 nokta + santim) → tek seçim
 *   A) Referans bitince her ekran sırayla dört köşesinden yerleştirilir
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
    /* Ayarlar artık karelerin ALTINDA, listenin içinde değil. */
    const acik = panel && panel.querySelector('[data-acik="1"]')
    if (!acik) return { sutun: null, satir: null, tani: 'acik satir yok' }
    /*
     * Sayilar artik giris kutusunda degil: "Sutun - 9 + Satir - 9 +".
     * Etiketten sonraki ilk sayi o eksenin degeri.
     */
    const metinHam = (acik.innerText || '').replace(/\s+/g, ' ')
    const eksenSayisi = (etiket) => {
      const i = metinHam.indexOf(etiket)
      if (i < 0) return 0
      for (const parca of metinHam.slice(i + etiket.length, i + etiket.length + 24).split(' ')) {
        const n = Number(parca)
        if (Number.isFinite(n) && n > 0) return n
      }
      return 0
    }
    const adet = [eksenSayisi('Sütun'), eksenSayisi('Satır')].filter((n) => n > 0)
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

/* ── A) EKRAN EKRAN YERLEŞTİR ────────────────────────────────────────── */
/*
 * Referans bitince sıradaki ekran soruluyor. Kullanıcı dört köşeye
 * tıklıyor; perspektif oradan geliyor, sistem fotoğraftan tahmin
 * yapmıyor.
 */
const dortKoseyeTikla = async (s, kx, ky, ken, kboy) => {
  const t = await tuval(s)
  const x = t.x + t.w * kx
  const y = t.y + t.h * ky
  const en = t.w * ken
  const boy = t.h * kboy
  for (const [px, py] of [
    [x, y],
    [x + en, y + boy * 0.05],
    [x + en, y + boy],
    [x, y + boy * 0.95],
  ]) {
    await s.mouse.move(px, py)
    await s.mouse.down()
    await s.mouse.up()
    await s.waitForTimeout(420)
  }
  await s.waitForTimeout(1200)
}

const a = await akis('A — EKRAN EKRAN YERLEŞTİR', async ({ s, denetle, icerir, dus }) => {
  /* Kaldırılan yollar geri sızmamalı. */
  if (await icerir('Duvar diplerini işaretle')) return dus('kaldırılan "duvar dibi" adımı hâlâ çıkıyor')
  if (await icerir('Ortadaki tutamakla')) return dus('kaldırılan tutamak yönergesi hâlâ çıkıyor')
  if (!(await icerir('ekranı yerleştirin'))) return dus('ekran yerleştirme yönergesi çıkmadı')
  if (!(await denetle('yerleştirme adımı açıldı'))) return false

  /* İşaretleme sürerken tasarım gizli olmalı: altındaki yer görünsün. */
  const once = await tasarimGorunur(s)
  if (once.var && once.saydamlik > 0.05) return dus('köşeler konurken tasarım görünüyor')

  await dortKoseyeTikla(s, 0.3, 0.3, 0.25, 0.3)
  if (!(await denetle('ekran yerleştirildi'))) return false

  const g = await tasarimGorunur(s)
  console.log('  · yerleştikten sonra          :', JSON.stringify(g))
  if (!g.var || !(g.en > 10)) return dus('tasarım gelmedi')
  if (!(g.saydamlik > 0.05)) return dus('yerleştiği hâlde tasarım görünmüyor')
  return true
})

/* ── D) SIFIRLA, SONRA BAŞTAN KUR ─────────────────────────────────── */
const dYol = await akis('D — SIFIRLA VE BAŞTAN KUR', async ({ s, bas, denetle, icerir, dus }) => {
  /* Akışın ORTASINDA sıfırlanıyor: en çok artık state burada kalıyor. */
  if (!(await icerir('ekranı yerleştirin'))) return dus('yerleştirme adımı açılmadı')
  if (!(await denetle('yerleştirme adımında (yarım bırakılacak)'))) return false

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
  if (!(await icerir('ekranı yerleştirin'))) return dus('ikinci kurulumda yerleştirme açılmadı')
  if (!(await denetle('ikinci kurulumda yerleştirme adımı açıldı'))) return false
  await dortKoseyeTikla(s, 0.3, 0.3, 0.25, 0.3)
  const g2 = await tasarimGorunur(s)
  console.log('  · ikinci kurulumda            :', JSON.stringify(g2))
  if (!g2.var || !(g2.saydamlik > 0.05)) return dus('ikinci kurulumda tasarım görünmüyor')
  return true
})

await tarayici.close()

console.log('\n─────────────────────────────')
console.log('A (ekran ekran)      :', a ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
console.log('D (sıfırla, baştan)  :', dYol ? 'GEÇTI ✓' : 'DÜŞTÜ ✗')
if (hataSayisi > 0) {
  console.log('\nAKIS TESTI DUSTU — yayina alinmamali.')
  process.exitCode = 1
} else {
  console.log('\nAkis testi gecti.')
}
