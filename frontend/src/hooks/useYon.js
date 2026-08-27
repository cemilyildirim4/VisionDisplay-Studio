/**
 * EKRANA YÖN VERME (fotoğraflı mekânlar).
 *
 * Fotoğraflar her zaman karşıdan çekilmiş olmuyor: duvar bir açıyla görünüyor,
 * kaldırım sola doğru kaçıyor, tavan yukarıda daralıyor. Böyle bir kareye tam
 * karşıdan bakan dikdörtgen bir ekran yapıştırılınca yamalama gibi duruyor —
 * mekân yamuk, ekran değil.
 *
 * Bu kanca ekrana İKİ AÇI veriyor:
 *   • yaw  — dikey eksende dönüş (sağa/sola). Ekranın bir kenarı yaklaşır,
 *            öteki uzaklaşır; sonuç bir yamuktur, tam da fotoğraftaki gibi.
 *   • tilt — yatay eksende dönüş (yukarı/aşağı). Yüksekten ya da alçaktan
 *            çekilmiş karelerde gerekiyor.
 *
 * Dönüş üç boyutlu bir perspektif dönüşümüyle uygulanıyor (rotateY/rotateX +
 * perspective), yani kenarlar gerçek perspektifte olduğu gibi birbirine
 * yakınsıyor. İki boyutlu bir "skew" bunu yapamaz: paralel kenarlar paralel
 * kalır, göz de bunun sahte olduğunu hemen anlar.
 *
 * ÖLÇÜ NE OLUYOR? Ekranın metre ölçüsü değişmiyor; değişen yalnızca ona hangi
 * açıdan bakıldığı. Ölçü etiketleri döndürülmüyor (bkz. WallPreview) — çünkü
 * onlar mekânın değil, arayüzün parçası.
 */

import { useCallback, useRef, useState } from 'react'

/** Açı sınırları (derece). Ötesinde ekran şerit gibi inceliyor. */
export const YAW_SINIR = 62
export const TILT_SINIR = 34

/** Sürüklerken kaç pikselde bir derece dönsün. */
const PIKSEL_BASINA_DERECE = 0.32

const kis = (v, s) => Math.max(-s, Math.min(s, v))

export function useYon() {
  const [yon, setYon] = useState({ yaw: 0, tilt: 0 })
  const basRef = useRef(null)

  const dondu = yon.yaw !== 0 || yon.tilt !== 0

  const sifirla = useCallback(() => setYon({ yaw: 0, tilt: 0 }), [])

  /** Ölçülen açıyı doğrudan uygular (fotoğraf çözümlemesi için). */
  const ayarla = useCallback((yeni) => {
    if (!yeni) return setYon({ yaw: 0, tilt: 0 })
    setYon({
      yaw: kis(Number(yeni.yaw) || 0, YAW_SINIR),
      tilt: kis(Number(yeni.tilt) || 0, TILT_SINIR),
    })
  }, [])

  const parmakIndi = useCallback(
    (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      basRef.current = { x: e.clientX, y: e.clientY, baslangic: yon }
    },
    [yon],
  )

  const parmakHareket = useCallback((e) => {
    const b = basRef.current
    if (!b) return
    setYon({
      yaw: kis(b.baslangic.yaw + (e.clientX - b.x) * PIKSEL_BASINA_DERECE, YAW_SINIR),
      /*
       * Yukarı sürüklemek ekranın üstünü GERİYE yatırır — nesneyi elle
       * eğiyormuş gibi. Ters yön, 3B görünümdeki alışkanlığa aykırı düşüyordu.
       */
      tilt: kis(b.baslangic.tilt - (e.clientY - b.y) * PIKSEL_BASINA_DERECE, TILT_SINIR),
    })
  }, [])

  const parmakKalkti = useCallback((e) => {
    basRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [])

  return {
    yon,
    dondu,
    sifirla,
    ayarla,
    tutamak: {
      onPointerDown: parmakIndi,
      onPointerMove: parmakHareket,
      onPointerUp: parmakKalkti,
      onPointerCancel: parmakKalkti,
      onDragStart: (e) => e.preventDefault(),
      'data-dondur': '1',
      style: { cursor: 'ew-resize', touchAction: 'none', userSelect: 'none' },
    },
  }
}

/**
 * Açıları CSS dönüşümüne çevirir.
 *
 * `perspective` uzaklığı ekranın kendi genişliğinden türüyor: sabit bir değer
 * küçük ekranda etkisiz, büyük ekranda aşırı çıkıyordu. Yaklaşık üç ekran boyu
 * uzaklık, fotoğraf mekânlarındaki bakış mesafesine yakın bir yamukluk veriyor.
 */
export function yonDonusumu(yon, ekranWpx = 0) {
  if (!yon || (!yon.yaw && !yon.tilt)) return null
  const uzaklik = Math.max(600, ekranWpx * 3)
  return `perspective(${Math.round(uzaklik)}px) rotateY(${yon.yaw.toFixed(2)}deg) rotateX(${yon.tilt.toFixed(2)}deg)`
}
