import { useEffect, useState } from 'react'

/**
 * AÇILIR PANELİ EKRANIN İÇİNDE TUT.
 *
 * Belirti (mobil): dil ve profil düğmelerinin panelleri yarım görünüyordu.
 * Paneller düğmeye göre `absolute right-0` ile sağa hizalıydı; üst şerit
 * telefonda alt satıra sarınca düğme ekranın soluna yaklaşıyor, sağa hizalı
 * panelin sol yarısı ekranın dışına taşıyordu. Taşan kısım kırpıldığı için
 * seçenekler okunamıyordu.
 *
 * Çözüm: panel `fixed` konumlanır ve düğmenin altına, EKRAN SINIRLARINA
 * kıstırılarak yerleştirilir. Sağa hizalama korunur; ancak sola taşacaksa
 * kenardan 8 px içeride durur. Genişlik ve yükseklik de ekrana sığacak
 * şekilde sınırlanır, uzun liste panelin içinde kayar.
 *
 * Ölçüler kaydırma ve döndürmede yeniden hesaplanır.
 */
export function useAcilirKonum(dugmeRef, acik, genislik) {
  const [konum, setKonum] = useState(null)

  useEffect(() => {
    if (!acik) {
      setKonum(null)
      return
    }
    const hesapla = () => {
      const el = dugmeRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const g = Math.min(genislik, window.innerWidth - 16)
      const sol = Math.max(8, Math.min(r.right - g, window.innerWidth - g - 8))
      setKonum({
        position: 'fixed',
        left: Math.round(sol),
        top: Math.round(r.bottom + 8),
        width: Math.round(g),
        maxHeight: Math.max(120, Math.round(window.innerHeight - r.bottom - 16)),
        overflowY: 'auto',
      })
    }
    hesapla()
    window.addEventListener('resize', hesapla)
    // true: içteki kaydırma kutuları da yakalansın
    window.addEventListener('scroll', hesapla, true)
    return () => {
      window.removeEventListener('resize', hesapla)
      window.removeEventListener('scroll', hesapla, true)
    }
  }, [acik, genislik, dugmeRef])

  return konum
}

export default useAcilirKonum
