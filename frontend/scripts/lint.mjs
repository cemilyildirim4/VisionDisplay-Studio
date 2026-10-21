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
/*
 * ÇIKIŞ KODUNA BAKILMIYOR: oxlint yalnızca uyarı bulduğunda da 1 dönüyor.
 * Bu koşul yüzünden sarmalayıcı HER çalıştırmada düşüyordu; hatayla uyarıyı
 * ayırt etme amacı tam tersine dönmüştü. Karar artık çıktının kendisinden
 * veriliyor, oxlint'in hiç çalışamaması ayrıca yakalanıyor.
 */
if (hatalar.length > 0) {
  console.error('\nLINT DÜŞTÜ: ' + hatalar.length + ' hata düzeyinde bulgu var (yukarıda).')
  process.exit(1)
}
if (!cikti.trim() && oxlint.status !== 0) {
  console.error('\nLINT ÇALIŞTIRILAMADI (oxlint çıkış kodu ' + oxlint.status + ').')
  process.exit(1)
}

const denetim = calistir('node', ['scripts/tdz-denetimi.mjs'])
process.stdout.write(denetim.stdout || '')
process.stderr.write(denetim.stderr || '')
process.exit(denetim.status === 0 ? 0 : 1)
