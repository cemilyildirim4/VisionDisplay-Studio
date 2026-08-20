import { useEffect } from 'react'

/**
 * AÇIK PENCERE VARKEN ARKADAKİ SAYFAYI KİLİTLE.
 *
 * Belirti (mobil): pop-up açıkken listenin sonuna gelindiğinde kaydırma
 * arkadaki sayfaya geçiyor, pencerenin altındaki yapılandırıcı kayıyordu.
 * Tarayıcı, kaydırılabilir bir kutu sınırına dayandığında hareketi bir üst
 * kaydırma alanına devrediyor ("scroll chaining"); iOS'ta ayrıca adres
 * çubuğu esnemesi de sayfayı oynatıyor.
 *
 * Çözüm iki katmanlı, çünkü tek başına hiçbiri her telefonda yetmiyor:
 *   1) <html>/<body> `overflow: hidden` — masaüstü ve Android'de sayfayı
 *      tamamen sabitler.
 *   2) body `position: fixed` + o anki kaydırma konumu `top` olarak — iOS
 *      Safari `overflow: hidden`'ı yok sayıp yine kaydırıyor. Kapanışta
 *      sayfa aynı konuma geri götürülür, yoksa pencere kapanınca en başa
 *      atardı.
 *
 * Kaydırma çubuğunun kaybolmasıyla oluşan yatay sıçrama, çubuğun genişliği
 * kadar sağ dolgu eklenerek engellenir (masaüstü).
 *
 * Aynı anda birden çok pencere açılabildiği için sayaç tutulur: en son
 * kapanan pencere sayfayı serbest bırakır.
 */
let acikSayisi = 0
let kayitliKonum = 0
let onceki = null

export function useGovdeKilidi(acik) {
  useEffect(() => {
    if (!acik) return
    const govde = document.body
    const kok = document.documentElement

    if (acikSayisi === 0) {
      kayitliKonum = window.scrollY || kok.scrollTop || 0
      const cubuk = window.innerWidth - kok.clientWidth
      onceki = {
        kokOverflow: kok.style.overflow,
        overflow: govde.style.overflow,
        position: govde.style.position,
        top: govde.style.top,
        left: govde.style.left,
        right: govde.style.right,
        width: govde.style.width,
        paddingRight: govde.style.paddingRight,
      }
      kok.style.overflow = 'hidden'
      govde.style.overflow = 'hidden'
      govde.style.position = 'fixed'
      govde.style.top = `-${kayitliKonum}px`
      govde.style.left = '0'
      govde.style.right = '0'
      govde.style.width = '100%'
      if (cubuk > 0) govde.style.paddingRight = `${cubuk}px`
    }
    acikSayisi += 1

    return () => {
      acikSayisi -= 1
      if (acikSayisi > 0) return
      kok.style.overflow = onceki?.kokOverflow || ''
      govde.style.overflow = onceki?.overflow || ''
      govde.style.position = onceki?.position || ''
      govde.style.top = onceki?.top || ''
      govde.style.left = onceki?.left || ''
      govde.style.right = onceki?.right || ''
      govde.style.width = onceki?.width || ''
      govde.style.paddingRight = onceki?.paddingRight || ''
      onceki = null
      // Kaydırma konumu geri verilir; 'instant' ki kapanışta kayma görünmesin
      window.scrollTo({ top: kayitliKonum, behavior: 'instant' })
    }
  }, [acik])
}

export default useGovdeKilidi
