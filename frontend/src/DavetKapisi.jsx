/**
 * DAVET KAPISI — beta döneminde kod girme ekranı.
 *
 * NEDEN VAR: sunucu tarafında beta kapısı (BetaGate) ve davet kodu altyapısı
 * baştan beri duruyordu; eksik olan tek şey kodu GİRECEK ekrandı. O yüzden
 * üretilen kodlar hiçbir yerde kullanılamıyor, sekme de bu sebeple
 * kaldırılmıştı. Bu bileşen o boşluğu kapatıyor.
 *
 * NASIL ÇALIŞIYOR:
 *   1. Sunucuda BETA_ENABLED=true ise yazma uçları (teklif, konfigürasyon,
 *      PDF, sohbet) 403 + code: "BETA_INVITE_REQUIRED" döndürüyor.
 *   2. Uygulama bu yanıtı görünce bu ekranı açıyor.
 *   3. Kod POST /api/auth/guest ile doğrulanıyor; geçerliyse 24 saatlik
 *      "Guest" jetonu dönüyor ve oturuma yazılıyor — kullanıcı kaldığı
 *      yerden devam ediyor.
 *
 * Kapı kapalıyken (BETA_ENABLED=false) bu ekran hiç açılmıyor; site herkese
 * açık kalıyor. Yani özellik kodda durur, kararı ortam değişkeni verir.
 */

import { useState } from 'react'
import { API_URL } from './apiClient.js'

export default function DavetKapisi({ acik, onKapat, onJeton }) {
  const [kod, setKod] = useState('')
  const [hata, setHata] = useState(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  if (!acik) return null

  const gonder = async (e) => {
    e.preventDefault()
    const temiz = kod.trim()
    if (!temiz) return
    setGonderiliyor(true)
    setHata(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: temiz }),
      })
      const veri = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(veri.message || 'Davet kodu geçersiz.')
        return
      }
      onJeton?.(veri)
      onKapat?.()
    } catch {
      setHata('Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.')
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161a21] border border-neutral-200 dark:border-[#2c333f] p-6 shadow-xl">
        <h2 className="m-0 mb-1 text-[20px] font-bold text-neutral-900 dark:text-neutral-100">
          Davet kodu
        </h2>
        <p className="mt-0 mb-4 text-[14px] leading-snug text-neutral-500 dark:text-neutral-400">
          Uygulama şu an beta aşamasında. Devam etmek için size verilen kodu girin.
        </p>
        <form onSubmit={gonder} className="flex flex-col gap-3">
          <input
            autoFocus
            value={kod}
            onChange={(e) => setKod(e.target.value.toUpperCase())}
            placeholder="ÖRN. MASAUSTU25"
            className="w-full rounded-lg border border-neutral-200 dark:border-[#2c333f] bg-white dark:bg-[#1b2029] px-3 py-2.5 text-[16px] font-mono tracking-widest text-neutral-900 dark:text-neutral-100"
          />
          {hata && <p className="m-0 text-[13px] text-red-600 dark:text-red-400">{hata}</p>}
          <button
            type="submit"
            disabled={gonderiliyor || !kod.trim()}
            className="w-full rounded-full bg-brand text-white text-[15px] font-semibold py-2.5 hover:bg-brand-dark disabled:opacity-50"
          >
            {gonderiliyor ? 'Kontrol ediliyor…' : 'Devam et'}
          </button>
          <button
            type="button"
            onClick={onKapat}
            className="w-full rounded-full border border-neutral-200 dark:border-[#2c333f] text-[14px] py-2 text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand"
          >
            Vazgeç
          </button>
        </form>
      </div>
    </div>
  )
}
