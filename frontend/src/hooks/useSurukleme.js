/**
 * EKRANI SÜRÜKLEYEREK TAŞIMA (fotoğraflı mekânlar).
 *
 * Sahnenin ortası her tasarım için doğru yer değil: müşteri ekranı vitrinin
 * önünde, kaldırımın solunda ya da girişin yanında görmek isteyebilir. Bu
 * kanca (hook) ekranın varsayılan yerine göre bir KAYMA tutuyor.
 *
 * Kayma piksel değil METRE cinsinden saklanıyor. Sebebi şu: pencere
 * boyutlandığında ya da telefon yan çevrildiğinde piksel/metre oranı
 * değişiyor; piksel saklansaydı ekran mekânın içinde kendiliğinden yer
 * değiştirirdi. Metre saklanınca "vitrinin iki metre solunda" bilgisi pencere
 * ne olursa olsun korunuyor.
 *
 * Ölçek sürüklemeyle DEĞİŞMİYOR: derinlik bilgimiz olmadığı için ekranı yukarı
 * taşımak onu uzaklaştırmıyor, yalnızca kadrajda başka bir yere koyuyor.
 * Ölçüyü bozmamak, olmayan bir derinliği varmış gibi göstermekten iyidir.
 */

import { useCallback, useRef, useState } from 'react'

export function useSurukleme(pxPerM) {
  // Varsayılan yere göre kayma — metre.
  const [ofsetM, setOfsetM] = useState({ x: 0, y: 0 })
  const surukleRef = useRef(null)

  const tasindi = ofsetM.x !== 0 || ofsetM.y !== 0

  const sifirla = useCallback(() => setOfsetM({ x: 0, y: 0 }), [])

  const parmakIndi = useCallback(
    (e) => {
      if (!(pxPerM > 0)) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      surukleRef.current = { x: e.clientX, y: e.clientY, baslangic: ofsetM }
    },
    [ofsetM, pxPerM],
  )

  const parmakHareket = useCallback(
    (e) => {
      const s = surukleRef.current
      if (!s || !(pxPerM > 0)) return
      setOfsetM({
        x: s.baslangic.x + (e.clientX - s.x) / pxPerM,
        y: s.baslangic.y + (e.clientY - s.y) / pxPerM,
      })
    },
    [pxPerM],
  )

  const parmakKalkti = useCallback((e) => {
    surukleRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [])

  return {
    ofsetM,
    tasindi,
    sifirla,
    /* Sürüklenecek öğeye olduğu gibi yayılır. */
    tutamak: {
      onPointerDown: parmakIndi,
      onPointerMove: parmakHareket,
      onPointerUp: parmakKalkti,
      onPointerCancel: parmakKalkti,
      onDragStart: (e) => e.preventDefault(),
      /* Sürüklenebilir gövdeyi işaretler — testler ve hata ayıklama için. */
      'data-surukle': '1',
      style: { cursor: 'grab', touchAction: 'none', userSelect: 'none' },
    },
  }
}

/**
 * Kaymayı kadrajın içinde tutar.
 *
 * Sürüklerken ekranın yarısını dışarı çıkarmak mümkün olmamalı: dışarıda ne
 * olduğu görünmüyor, dolayısıyla oraya konan ekran hiçbir şey anlatmıyor.
 * Piksel cinsinden sınırlanıp metreye geri çevriliyor.
 */
export function kaymayiSinirla(ofsetM, pxPerM, sahne, ekranWpx, tabanY) {
  if (!(pxPerM > 0) || !(sahne?.w > 0)) return { x: 0, y: 0 }

  const enCokX = Math.max(0, (sahne.w - ekranWpx) / 2)
  const x = Math.max(-enCokX, Math.min(enCokX, ofsetM.x * pxPerM))

  // Taban dikeyde: en yukarıda kadrajın dörtte biri, en aşağıda alt kenar.
  const yukari = tabanY - sahne.h * 0.25
  const asagi = sahne.h * 0.98 - tabanY
  const y = Math.max(-yukari, Math.min(asagi, ofsetM.y * pxPerM))

  return { x, y }
}
