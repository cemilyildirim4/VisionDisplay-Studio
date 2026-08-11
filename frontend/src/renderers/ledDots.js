import { MIN_DOT_PX } from '../content.js'

/**
 * LED diyot dokusunu Canvas'a çizer — düz, kavisli ve L tipi ekranların ortak boyacısı.
 *
 * Neden Canvas: CSS deseniyle döşendiğinde hücre boyutu tam sayı piksel olmadığı
 * durumlarda tarayıcı yuvarlama yapıyor ve moiré (karışık, titrek doku) oluşuyordu.
 * Canvas'ta her diyot kendi konumunda çizildiği için desen her ölçekte net kalır.
 *
 * Tüm noktalar TEK yol (path) olarak biriktirilip tek seferde doldurulur;
 * on binlerce diyotta bile hızlı çizer.
 */
export function paintLedDots(ctx, w, h, dotW, dotH) {
  if (!Number.isFinite(dotW) || !Number.isFinite(dotH)) return
  if (Math.min(dotW, dotH) < MIN_DOT_PX) return // çok sık — desen çizilmez

  // Nokta yarıçapı ve opaklıklar kasıtlı olarak DÜŞÜK.
  // Gerçek bir panelde diyotlar yakından bakmadıkça seçilmez; doku
  // "burada LED var" hissini vermeli, delikli levha gibi durmamalı.
  const r = Math.max(0.4, Math.min(dotW, dotH) * 0.15)

  // Diyotlar arasındaki koyu boşluk
  ctx.fillStyle = 'rgba(0,0,0,0.14)'
  ctx.fillRect(0, 0, w, h)

  // Diyot mercekleri
  ctx.fillStyle = 'rgba(185,192,205,0.13)'
  ctx.beginPath()
  for (let y = dotH / 2; y < h; y += dotH) {
    for (let x = dotW / 2; x < w; x += dotW) {
      ctx.moveTo(x + r, y) // her daireden önce yol taşınır, aralar birleşmesin
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
}
