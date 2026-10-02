/**
 * ÖLÇÜ SİHİRBAZI — sağ panelde, adım adım.
 *
 * Referans ölçü ve ölçü kutusu akışı önce tek bir blok hâlindeydi: dört ayrı
 * iş (noktaları işaretle, uzunluğu yaz, kutuyu kur, kutuyu yerleştir) aynı
 * anda ekrandaydı ve sırası anlaşılmıyordu. Sonra fotoğrafın üstünde yüzen
 * bir kart denendi; o da tuvalin önemli bir kısmını kapatıp tam da yapılması
 * istenen işi (nokta koyma, kutu taşıma) engelledi.
 *
 * Şimdi kart SAĞ PANELİN İÇİNDE: tuval tamamen serbest, ayarlar tek yerde.
 * Adım değişince kart kısa bir geçişle yenileniyor (bkz. .sih-adim, index.css)
 * — kullanıcı neyin değiştiğini görüyor.
 *
 * Bileşen durum tutmuyor: hangi adımda olunduğu ve veriler App.jsx'ten
 * geliyor, düğmeler oradaki işlevleri çağırıyor. Sihirbaz yalnızca bir SUNUM
 * katmanı; ölçek ve kutu mantığı tek yerde kalıyor.
 */

const ADIM_SAYISI = 4

function Nokta({ dolu, etkin }) {
  return (
    <span
      className={`inline-block h-1.5 rounded-full transition-all duration-200 ${
        etkin ? 'w-4 bg-brand' : dolu ? 'w-1.5 bg-brand/60' : 'w-1.5 bg-neutral-300 dark:bg-[#39404d]'
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

  const girdi =
    'w-full min-w-0 rounded-md border border-neutral-200 px-2 py-1.5 text-[14px] text-neutral-800 dark:border-[#2c333f] dark:bg-[#1b2029] dark:text-neutral-100'
  const ana =
    'flex-1 rounded-lg px-3 py-2 text-[13.5px] font-semibold text-white bg-brand hover:opacity-90 transition-opacity disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed dark:disabled:bg-[#232936] dark:disabled:text-neutral-600'
  const yan =
    'rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 hover:text-brand transition-colors dark:text-neutral-400'

  const basliklar = {
    1: t('sih.1.baslik'),
    2: t('sih.2.baslik'),
    3: t('sih.3.baslik'),
    4: t('sih.4.baslik'),
  }

  return (
    <div className="rounded-lg border border-brand/35 bg-brand/[0.045] p-2.5 dark:border-brand/45 dark:bg-brand/[0.08]">
      {/* Başlık şeridi: kaçıncı adım, adı, kapatma. */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Nokta key={i} dolu={i < adim} etkin={i === adim} />
          ))}
        </span>
        <span className="text-[10.5px] font-semibold tracking-wide text-neutral-400">
          {adim}/{ADIM_SAYISI}
        </span>
        <span className="flex-1 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
          {basliklar[adim]}
        </span>
        <button
          type="button"
          onClick={onKapat}
          aria-label={t('sih.kapat')}
          className="shrink-0 rounded px-1.5 py-0.5 text-[15px] leading-none text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          ×
        </button>
      </div>

      {/* key={adim}: adım değişince geçiş yeniden oynasın. */}
      <div key={adim} className="sih-adim">
        {/* 1 — İKİ NOKTA */}
        {adim === 1 && (
          <>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-snug text-neutral-600 dark:text-neutral-300">
              {t('sih.1.aciklama')}
            </p>
            <p className="mt-1 mb-0 text-[12px] leading-snug text-amber-600 dark:text-amber-400">
              {t('ref2.duzlemUyari')}
            </p>
            <p className="mt-1.5 mb-0 text-[12.5px] font-medium text-brand">
              {refNoktaSayisi === 0
                ? t('sih.1.durum0')
                : refNoktaSayisi === 1
                  ? t('sih.1.durum1')
                  : t('sih.1.durum2')}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {refNoktaSayisi > 0 && (
                <button type="button" onClick={onIsaretle} className={yan}>
                  {t('sih.1.tekrar')}
                </button>
              )}
              <button type="button" onClick={onIleri} disabled={refNoktaSayisi < 2} className={ana}>
                {t('sih.devam')}
              </button>
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
                className={girdi}
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
            <div className="mt-2 flex items-center gap-1.5">
              <button type="button" onClick={onGeri} className={yan}>
                {t('sih.geri')}
              </button>
              <button type="button" onClick={onIleri} disabled={!refPxCm} className={ana}>
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
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                step="1"
                autoFocus
                value={kutuEn}
                onChange={(e) => setKutuEn(e.target.value)}
                placeholder={t('ref.en')}
                className={girdi}
              />
              <span className="text-[13px] text-neutral-400">×</span>
              <input
                type="number"
                min="1"
                step="1"
                value={kutuBoy}
                onChange={(e) => setKutuBoy(e.target.value)}
                placeholder={t('ref.boy')}
                className={girdi}
              />
              <span className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
            </div>
            {kutuMesaj && (
              <p className="mt-1.5 mb-0 text-[12px] leading-snug text-amber-600 dark:text-amber-400">{kutuMesaj}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5">
              <button type="button" onClick={onGeri} className={yan}>
                {t('sih.geri')}
              </button>
              <button type="button" onClick={onKutuKur} className={ana}>
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
            <div className="mt-2 flex items-center gap-1.5">
              <button type="button" onClick={onGeri} className={yan}>
                {t('sih.geri')}
              </button>
              <button type="button" onClick={onBitir} className={ana}>
                {t('sih.4.bitir')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
