/**
 * LINT ÇALIŞTIRICI — hata bulunursa GERÇEKTEN düşüyor.
 *
 * oxlint, "error" düzeyinde bulgu yazdığı hâlde çıkış kodu olarak 0
 * döndürüyor. Bu yüzden `oxlint && node ...` zinciri hatayı yutuyordu:
 * React kancasının erken return'den sonra çağrıldığı (rules-of-hooks)
 * uygulamayı açılışta çökerten bir hata, çıktının içinde kaybolup yayına
 * gitti. Burası çıktıyı tarıyor ve "error" geçen tek bir satır bile varsa
 * düşüyor; ardından ad/TDZ denetimini çalıştırıyor.
 *
 * Uyarılar (warning) düşürmüyor: depoda öteden beri duran, davranışı
 * etkilemeyen uyarılar var ve hepsini bugün temizlemek bu işin konusu
 * değil. Hata ile uyarı arasındaki fark tam da budur.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const kok = fileURLToPath(new URL('..', import.meta.url))
const calistir = (komut, argumanlar) =>
  spawnSync(komut, argumanlar, { cwd: kok, encoding: 'utf8', shell: process.platform === 'win32' })

const oxlint = calistir('npx', ['oxlint', 'src/'])
const cikti = (oxlint.stdout || '') + (oxlint.stderr || '')
process.stdout.write(cikti)

/* "dosya:satır:sütun: error kural(...)" — uyarılar "warning" yazıyor. */
const hatalar = cikti.split('\n').filter((satir) => /:\s*error\s/.test(satir))
if (hatalar.length > 0 || (oxlint.status !== 0 && oxlint.status !== null)) {
  console.error('\nLINT DÜŞTÜ: ' + hatalar.length + ' hata düzeyinde bulgu var (yukarıda).')
  process.exit(1)
}

const denetim = calistir('node', ['scripts/tdz-denetimi.mjs'])
process.stdout.write(denetim.stdout || '')
process.stderr.write(denetim.stderr || '')
process.exit(denetim.status === 0 ? 0 : 1)
