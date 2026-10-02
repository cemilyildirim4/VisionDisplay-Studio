/**
 * ÖLÇÜ SİHİRBAZI — adım adım açılan kart.
 *
 * Referans ölçü ve ölçü kutusu akışı sağ panelde tek bir blok hâlindeydi:
 * dört ayrı iş (noktaları işaretle, uzunluğu yaz, kutuyu kur, kutuyu yerleştir)
 * aynı anda ekranda duruyor ve hangisinin sırası olduğu anlaşılmıyordu.
 * Burada her adım kendi kartında, sırası gelince çıkıyor.
 *
 * KART ENGELLEYİCİ DEĞİL. Kullanıcının adımları tamamlaması için fotoğrafa
 * tıklaması, nokta sürüklemesi, kutuyu taşıması gerekiyor; modal bir katman
 * bunların hepsini keserdi. Kart fotoğrafın ALTINDA, dar bir şerit hâlinde
 * duruyor ve yalnızca kendi üstünde fare olayı alıyor.
 *
 * Bileşen durum tutmuyor: hangi adımda olunduğu ve veriler App.jsx'ten
 * geliyor, düğmeler oradaki işlevleri çağırıyor. Böylece sihirbaz yalnızca
 * BİR SUNUM katmanı; ölçek ve kutu mantığı tek yerde kalıyor.
 */

const ADIM_SAYISI = 4

function Nokta({ dolu, etkin }) {
  return (
    <span
      className={`inline-block h-1.5 rounded-full transition-all ${
        etkin ? 'w-5 bg-brand' : dolu ? 'w-1.5 bg-brand/60' : 'w-1.5 bg-neutral-300 dark:bg-[#39404d]'
      }`}
    />
  )
}

export default function OlcuSihirbazi({
  adim,
  t,
  /* 1. adım */
  refNoktaSayisi = 0,
  onIsaretle,
  /* 2. adım */
  refUzunlukCm,
  setRefUzunlukCm,
  refOlcek,
  refPxCm,
  /* 3. adım */
  kutuEn,
  setKutuEn,
  kutuBoy,
  setKutuBoy,
  kutuMesaj,
  /* eylemler */
  onGeri,
  onIleri,
  onKutuKur,
  onBitir,
  onKapat,
}) {
  if (!adim) return null

  const girdiSinif =
    'w-full min-w-0 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[14px] text-neutral-800 dark:border-[#2c333f] dark:bg-[#1b2029] dark:text-neutral-100'
  const anaDugme =
    'rounded-lg px-4 py-2 text-[13.5px] font-semibold text-white bg-brand hover:opacity-90 transition-opacity disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed dark:disabled:bg-[#232936] dark:disabled:text-neutral-600'
  const yanDugme =
    'rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 hover:text-brand transition-colors dark:text-neutral-400'

  const basliklar = {
    1: t('sih.1.baslik'),
    2: t('sih.2.baslik'),
    3: t('sih.3.baslik'),
    4: t('sih.4.baslik'),
  }

  return (
    <div
      className="absolute bottom-3 left-1/2 z-40 w-[min(560px,calc(100%-24px))] -translate-x-1/2"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="rounded-xl border border-neutral-200 bg-white/97 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:border-[#2c333f] dark:bg-[#141923]/97"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Başlık şeridi: kaçıncı adım, adı ve kapatma. */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            {[1, 2, 3, 4].map((i) => (
              <Nokta key={i} dolu={i < adim} etkin={i === adim} />
            ))}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            {adim}/{ADIM_SAYISI}
          </span>
          <span className="flex-1 truncate text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">
            {basliklar[adim]}
          </span>
          <button
            type="button"
            onClick={onKapat}
            aria-label={t('sih.kapat')}
            className="shrink-0 rounded-md px-2 py-1 text-[16px] leading-none text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ×
          </button>
        </div>

        {/* 1 — İKİ NOKTA */}
        {adim === 1 && (
          <>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-snug text-neutral-600 dark:text-neutral-300">
              {t('sih.1.aciklama')}
            </p>
            <p className="mt-1 mb-0 text-[12px] leading-snug text-amber-600 dark:text-amber-400">
              {t('ref2.duzlemUyari')}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
                {refNoktaSayisi === 0
                  ? t('sih.1.durum0')
                  : refNoktaSayisi === 1
                    ? t('sih.1.durum1')
                    : t('sih.1.durum2')}
              </span>
              <div className="flex items-center gap-1">
                {refNoktaSayisi > 0 && (
                  <button type="button" onClick={onIsaretle} className={yanDugme}>
                    {t('sih.1.tekrar')}
                  </button>
                )}
                <button type="button" onClick={onIleri} disabled={refNoktaSayisi < 2} className={anaDugme}>
                  {t('sih.devam')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 2 — GERÇEK UZUNLUK */}
        {adim === 2 && (
          <>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-snug text-neutral-600 dark:text-neutral-300">
              {t('sih.2.aciklama')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                autoFocus
                value={refUzunlukCm}
                onChange={(e) => setRefUzunlukCm(e.target.value)}
                placeholder={t('ref2.uzunlukPh')}
                className={girdiSinif}
              />
              <span className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
            </div>
            {refPxCm ? (
              <p className="mt-1.5 mb-0 text-[12px] leading-snug text-emerald-700 dark:text-emerald-400">
                {Math.round(refOlcek.pxMesafe)} px / {refOlcek.gercekCm} cm ={' '}
                <strong>{refPxCm.x.toFixed(3).replace('.', ',')} px/cm</strong>
              </p>
            ) : (
              <p className="mt-1.5 mb-0 text-[12px] leading-snug text-amber-600 dark:text-amber-400">
                {refOlcek?.sebep === 'cokKisa' ? t('ref2.cokKisa') : t('ref2.uzunlukGir')}
              </p>
            )}
            <div className="mt-2 flex items-center justify-end gap-1">
              <button type="button" onClick={onGeri} className={yanDugme}>
                {t('sih.geri')}
              </button>
              <button type="button" onClick={onIleri} disabled={!refPxCm} className={anaDugme}>
                {t('sih.devam')}
              </button>
            </div>
          </>
        )}

        {/* 3 — KUTU ÖLÇÜSÜ */}
        {adim === 3 && (
          <>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-snug text-neutral-600 dark:text-neutral-300">
              {t('sih.3.aciklama')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                autoFocus
                value={kutuEn}
                onChange={(e) => setKutuEn(e.target.value)}
                placeholder={t('ref.en')}
                className={girdiSinif}
              />
              <span className="text-[13px] text-neutral-400">×</span>
              <input
                type="number"
                min="1"
                step="1"
                value={kutuBoy}
                onChange={(e) => setKutuBoy(e.target.value)}
                placeholder={t('ref.boy')}
                className={girdiSinif}
              />
              <span className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
            </div>
            {kutuMesaj && (
              <p className="mt-1.5 mb-0 text-[12px] leading-snug text-amber-600 dark:text-amber-400">{kutuMesaj}</p>
            )}
            <div className="mt-2 flex items-center justify-end gap-1">
              <button type="button" onClick={onGeri} className={yanDugme}>
                {t('sih.geri')}
              </button>
              <button type="button" onClick={onKutuKur} className={anaDugme}>
                {t('ref2.kutuKur')}
              </button>
            </div>
          </>
        )}

        {/* 4 — KONUMLANDIR */}
        {adim === 4 && (
          <>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-snug text-neutral-600 dark:text-neutral-300">
              {t('sih.4.aciklama')}
            </p>
            <p className="mt-1 mb-0 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
              {t('sih.4.ipucu')}
            </p>
            <div className="mt-2 flex items-center justify-end gap-1">
              <button type="button" onClick={onGeri} className={yanDugme}>
                {t('sih.geri')}
              </button>
              <button type="button" onClick={onBitir} className={anaDugme}>
                {t('sih.4.bitir')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
