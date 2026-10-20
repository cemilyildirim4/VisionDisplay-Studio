/*
 * ACILIS TESTI — sayfa hata ekranina dusmeden aciliyor mu.
 *
 * Iki durum: (1) temiz tarayici (depolama bos), (2) oturum kayitliyken.
 * Fotograf yuklenmiyor; amac yalnizca ilk cizimde TDZ gibi bir hata
 * olmadigini gormek.
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

const dene = async (ad, oturumlu) => {
  const b = await t.newContext({ viewport: { width: 1500, height: 900 } })
  const s = await b.newPage()
  const hata = []
  s.on('pageerror', (e) => hata.push(String(e).slice(0, 180)))
  s.on('console', (m) => {
    if (m.type() === 'error') hata.push('console: ' + m.text().slice(0, 160))
  })
  if (oturumlu) {
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
  }
  await s.goto(ADRES, { waitUntil: 'domcontentloaded' })
  await s.waitForTimeout(6000)
  const govde = await s.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim())
  const cokme = /Bir şeyler ters gitti|Something went wrong/i.test(govde)
  console.log('--- ' + ad + ' ---')
  console.log('  hata ekrani :', cokme ? 'VAR ✗' : 'yok ✓')
  console.log('  govde       :', govde.slice(0, 110))
  console.log('  sayfa hatasi:', hata.length ? JSON.stringify(hata.slice(0, 3)) : 'yok ✓')

  /* Yapilandirmayi baslat: asil bilesen burada kuruluyor. */
  const dugme = await s.evaluate(() => {
    const d = [...document.querySelectorAll('button')].find((x) => /Yapılandırmayı başlat/i.test(x.textContent || ''))
    if (d) { d.click(); return true }
    return false
  })
  await s.waitForTimeout(5000)
  const govde2 = await s.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim())
  const cokme2 = /Bir şeyler ters gitti|Something went wrong/i.test(govde2)
  console.log('  baslat basildi:', dugme)
  console.log('  sonra hata ekrani:', cokme2 ? 'VAR ✗' : 'yok ✓')
  console.log('  sonra govde   :', govde2.slice(0, 110))
  console.log('  sonra hatalar :', hata.length ? JSON.stringify(hata.slice(0, 3)) : 'yok ✓')
  await b.close()
  return !cokme && !cokme2
}

const a = await dene('TEMIZ TARAYICI (depolama bos)', false)
const c = await dene('OTURUM KAYITLI', true)
console.log('\nSONUC:', a && c ? 'IKISI DE ACILDI ✓' : 'EN AZ BIRI COKTU ✗')
await t.close()
