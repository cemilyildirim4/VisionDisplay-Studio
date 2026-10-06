/**
 * MANUEL DÖRT KÖŞE SEÇİMİ.
 *
 * Otomatik yüzey bulma iyi bir başlangıç noktası veriyor ama her fotoğrafta
 * doğru sonuç vermesi beklenemez: eğik çekimler, yansıyan camlar, çok karanlık
 * kareler, ekranı kapatan araç ve insanlar. Bu yüzden güvenilir omurga elle
 * düzeltmedir — kullanıcı dört köşeyi kendisi işaretlediğinde sonuç kesindir.
 *
 * Köşeler FOTOĞRAFA GÖRE 0–1 oranlı tutuluyor (App.jsx); burada yalnızca
 * tuvaldeki piksel karşılıkları çiziliyor ve sürükleme geri bildiriliyor.
 */

import { useEffect, useRef, useState } from 'react'
import { dortgenGecerli, perspektifGecerli } from './homografi.js'

const ADLAR = ['Sol üst', 'Sağ üst', 'Sağ alt', 'Sol alt']

export default function KoseSecici({ koseler, onDegis, tuvalW, tuvalH, sinir = null }) {
  /*
   * KÖŞE FAREYE SIÇRAMIYOR, FAREYLE BİRLİKTE GİDİYOR.
   *
   * Sürükleme köşeyi doğrudan FARENİN BULUNDUĞU NOKTAYA koyuyordu. İki
   * sonucu vardı ve ikincisi yıkıcıydı:
   *
   *  1. Tutamağın ortasından değil kenarından tutulursa köşe o farkı
   *     anında atlıyordu.
   *  2. Tutamak, köşe kadrajın dışına düşerse kenara sabitleniyor (aşağıda,
   *     "TUTAMAK HER ZAMAN KADRAJIN İÇİNDE"). O tutamağa dokunulduğu anda
   *     köşe gerçek yerinden tutamağın bulunduğu kenara IŞINLANIYORDU —
   *     tek piksellik bir harekette dörtgenin tamamı değişiyordu.
   *
   * Artık basıldığı andaki fare ve köşe konumu saklanıp köşeye yalnızca
   * ARADAKİ FARK uygulanıyor. Tutamağın neresinden tutulduğunun önemi yok.
   *
   * Köşeler fotoğrafın dışına da çıkamıyor; çıkamadığı için tutamak da
   * gerçek köşeden kopmuyor, yani ışınlanmanın zemini tamamen kalkıyor.
   */
  const S = {
    sol: sinir?.sol ?? 0,
    ust: sinir?.ust ?? 0,
    sag: sinir?.sag ?? tuvalW,
    alt: sinir?.alt ?? tuvalH,
  }
  const kis = (p) => ({
    x: Math.max(S.sol, Math.min(S.sag, p.x)),
    y: Math.max(S.ust, Math.min(S.alt, p.y)),
  })
  const [secili, setSecili] = useState(0)
  const surukleRef = useRef(null)
  const katmanRef = useRef(null)

  /*
   * Klavyeyle ince ayar: yön tuşları 1 piksel, Shift ile 10 piksel. Fareyle
   * bir köşeyi piksel hassasiyetinde tutturmak zor; asıl işi bu yapıyor.
   */
  useEffect(() => {
    const tus = (e) => {
      const yon = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!yon) return
      e.preventDefault()
      const adim = e.shiftKey ? 10 : 1
      const yeni = koseler.map((k, i) =>
        i === secili ? kis({ x: k.x + yon[0] * adim, y: k.y + yon[1] * adim }) : k,
      )
      /* Perspektif paydası sıfırı geçerse çizim yalanıyor; o hareket de kabul edilmiyor. */
      if (dortgenGecerli(yeni) && perspektifGecerli(yeni)) onDegis(yeni)
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [koseler, secili, onDegis])

  const indi = (i) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSecili(i)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const kutu = katmanRef.current?.getBoundingClientRect()
    /* Fare ve köşenin BAŞLANGIÇ konumu: hareket bunların farkından çıkıyor. */
    surukleRef.current = { i, kutu, fareX: e.clientX, fareY: e.clientY, bas: koseler[i] }
  }

  const hareket = (e) => {
    const s = surukleRef.current
    if (!s || !s.kutu || !s.bas) return
    const p = kis({ x: s.bas.x + (e.clientX - s.fareX), y: s.bas.y + (e.clientY - s.fareY) })
    const yeni = koseler.map((k, i) => (i === s.i ? p : k))
    /*
     * Geçersiz (kendini kesen) dörtgen kabul edilmiyor: kelebek biçimine giren
     * bir dörtgende homografi ekranı ters çeviriyor.
     */
    /* Perspektif paydası sıfırı geçerse çizim yalanıyor; o hareket de kabul edilmiyor. */
      if (dortgenGecerli(yeni) && perspektifGecerli(yeni)) onDegis(yeni)
  }

  const kalkti = (e) => {
    surukleRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const nokta = koseler.map((k) => `${k.x},${k.y}`).join(' ')

  return (
    <div
      ref={katmanRef}
      data-pdf-gizle
      /*
        KATMAN TIKLAMAYI YUTMUYOR.

        Kök öğe tüm tuvali kaplıyordu ve pointer olaylarını alıyordu; köşe
        kipindeyken tasarımı sürüklemek bu yüzden mümkün değildi. Artık
        yalnızca TUTAMAKLAR tıklanabilir, boş alan alttaki sürükleme
        tutamağına geçiyor.
      */
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <svg width={tuvalW} height={tuvalH} className="absolute inset-0 pointer-events-none">
        {/*
          DOLGU YOK — ALTINDAKİ TASARIM GERÇEK RENGİNDE KALSIN.

          Dörtgen saydam mavi bir dolguyla çiziliyordu. Duvar, tasarımın da
          üstünü kaplayan büyük bir alan olduğu için bu dolgu doğrudan
          tasarımın üstüne biniyor ve siyah LED paneli maviye boyuyordu:
          kullanıcının "tasarım mavi oluyor" dediği şey buydu. Ölçüldü —
          panelin kendi rengi rgb(18,18,21), yani sorun panelde değil, üstüne
          binen katmandaydı.

          Dörtgenin nerede olduğunu çizgi ve köşe tutamakları zaten
          gösteriyor; dolguya gerek yok.
        */}
        <polygon points={nokta} fill="none" stroke="#2962ad" strokeWidth="2" />
      </svg>
      {koseler.map((k, i) => (
        <button
          key={i}
          type="button"
          aria-label={ADLAR[i]}
          title={ADLAR[i]}
          onPointerDown={indi(i)}
          onPointerMove={hareket}
          onPointerUp={kalkti}
          onPointerCancel={kalkti}
          onFocus={() => setSecili(i)}
          className={`pointer-events-auto absolute rounded-full border-2 shadow-sm ${
            secili === i ? 'bg-brand border-white' : 'bg-white border-brand'
          }`}
          style={{
            /*
             * TUTAMAK HER ZAMAN KADRAJIN İÇİNDE.
             *
             * Köşe tuvalin dışına düşünce tutamak da görünmez oluyor ve o
             * köşe bir daha düzeltilemiyordu (kullanıcının yaşadığı durum
             * tam buydu). Dörtgen gerçek yerinde çiziliyor ama TUTAMAK
             * kenara sabitleniyor: dışarı kaçan köşe kenardan tutulup geri
             * getirilebiliyor.
             */
            /*
             * GÖRÜNEN DAİRE KÜÇÜK, DOKUNMA ALANI BÜYÜK.
             *
             * 28 piksellik daire çizimin üstünde iri duruyor ve altındaki
             * tasarımı kapatıyordu. Daire 18'e indi; parmakla tutmak yine
             * kolay olsun diye çevresine saydam bir halka (box-shadow ile
             * değil, ayrı bir iç daire ile de değil) yerine düğmenin
             * kendisi 18 kalıp kenarı inceltildi ve imleç alanı korunuyor.
             */
            left: Math.max(2, Math.min(tuvalW - 20, k.x - 9)),
            top: Math.max(2, Math.min(tuvalH - 20, k.y - 9)),
            width: 18,
            height: 18,
            cursor: 'grab',
          }}
        />
      ))}
    </div>
  )
}
