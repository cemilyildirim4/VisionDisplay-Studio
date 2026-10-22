/**
 * TELEFON DİK TUTULUNCA UYARI.
 *
 * Konfigüratör geniş bir çalışma alanı istiyor: solda ayarlar, sağda
 * tasarım. Dik tutulan telefonda ikisi alt alta düşüyor ve tasarım avuç
 * içi kadar kalıyor. Kullanıcıyı yarım bir ekranla baş başa bırakmaktansa
 * bir kez söylüyoruz.
 *
 * ISRAR EDENE ENGEL YOK: "Yine de devam et" diyen siteyi dik kullanabiliyor;
 * üstte ince bir şerit hatırlatma olarak kalıyor. Telefon yan çevrilince
 * hem uyarı hem şerit kendiliğinden kayboluyor — kullanıcıdan bir şey
 * kapatması istenmiyor.
 *
 * YALNIZCA TELEFON: masaüstü tarayıcısını dar bir pencereye almak "dik
 * telefon" değildir; dokunmatik olmayan cihazlarda hiç çıkmıyor.
 */
import { useEffect, useState } from 'react'
import { useLang } from './useLang.js'

/** Dik telefon mu: hem yön hem de gerçekten bir telefon olması aranıyor. */
function dikTelefonMu() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  const dik = window.matchMedia('(orientation: portrait)').matches
  const telefon = window.matchMedia('(max-width: 820px)').matches && window.matchMedia('(pointer: coarse)').matches
  return dik && telefon
}

export default function DikeyUyari() {
  const { t } = useLang()
  const [dik, setDik] = useState(() => dikTelefonMu())
  /* Kullanıcı "yine de devam et" dediyse tam ekran uyarı bir daha çıkmıyor. */
  const [gecildi, setGecildi] = useState(false)

  useEffect(() => {
    const guncelle = () => {
      const d = dikTelefonMu()
      setDik(d)
      /* Yan çevrilince hatırlatma da sıfırlanıyor: iş bitti. */
      if (!d) setGecildi(false)
    }
    const mq = window.matchMedia('(orientation: portrait)')
    mq.addEventListener?.('change', guncelle)
    window.addEventListener('resize', guncelle)
    return () => {
      mq.removeEventListener?.('change', guncelle)
      window.removeEventListener('resize', guncelle)
    }
  }, [])

  if (!dik) return null

  /* Vazgeçildiyse yalnızca ince şerit kalıyor. */
  if (gecildi) {
    return (
      <div className="sticky top-0 z-[90] flex items-center justify-center gap-1.5 bg-amber-100 px-3 py-1 text-[12px] font-medium text-amber-900 dark:bg-[#3a3113] dark:text-amber-200">
        <Dondur boy={13} />
        {t('dik.serit')}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white px-8 text-center dark:bg-[#12161d]">
      <span className="text-brand">
        <Dondur boy={54} />
      </span>
      <h2 className="m-0 text-[20px] font-bold text-neutral-900 dark:text-neutral-50">{t('dik.baslik')}</h2>
      <p className="m-0 text-[13px] text-neutral-500 dark:text-neutral-400">{t('dik.masaustu')}</p>
      <button
        type="button"
        onClick={() => setDik(dikTelefonMu())}
        className="mt-1 rounded-xl bg-brand px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t('dik.cevirdim')}
      </button>
      <button
        type="button"
        onClick={() => setGecildi(true)}
        className="text-[12.5px] text-neutral-400 underline underline-offset-2 hover:text-brand dark:text-neutral-500"
      >
        {t('dik.yinede')}
      </button>
    </div>
  )
}

/** Döndürme imi — hem tam ekran uyarıda hem şeritte. */
function Dondur({ boy }) {
  return (
    <svg viewBox="0 0 24 24" width={boy} height={boy} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 3v4h-4" />
    </svg>
  )
}
