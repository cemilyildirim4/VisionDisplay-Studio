import { useState } from 'react'

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
 * KART BİLEREK ÖNE ÇIKIYOR. Panelin geri kalanıyla aynı görünümdeyken
 * kullanıcı işini orada yapacağını fark etmiyordu: kalın marka kenarlığı,
 * renkli başlık şeridi, gölge ve "ŞİMDİ BURADA" rozeti bunun için.
 *
 * Bileşen durum tutmuyor: hangi adımda olunduğu ve veriler App.jsx'ten
 * geliyor, düğmeler oradaki işlevleri çağırıyor. Sihirbaz yalnızca bir SUNUM
 * katmanı; ölçek ve kutu mantığı tek yerde kalıyor.
 */

const ADIM_SAYISI = 4

function Nokta({ dolu, etkin }) {
  return (
    <span
      className={`inline-block h-2 rounded-full transition-all duration-200 ${
        etkin ? 'w-5 bg-white' : dolu ? 'w-2 bg-white/70' : 'w-2 bg-white/35'
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
  refAci,
  refAciKullan,
  setRefAciKullan,
  refTur,
  setRefTur,
  refBoyCm,
  setRefBoyCm,
  refDuzlem,
  /* 3. adım */
  kutuEn,
  setKutuEn,
  kutuBoy,
  setKutuBoy,
  kutuMesaj,
  /* 4. adım — eğim düğmesi: eğim varsa sıfırlar, yoksa referans eğimini uygular */
  onEgim,
  egimVar = false,
  /* 4. adım — çekim mesafesi: perspektifin sertliği (kameranın uzaklığı) */
  mesafeM,
  onMesafe,
  mesafeKilitli = false,
  /* eylemler */
  onGeri,
  onIleri,
  onKutuKur,
  onBitir,
  onKapat,
}) {
  if (!adim) return null

  const girdi =
    'w-full min-w-0 rounded-md border border-neutral-300 px-2.5 py-2 text-[15px] text-neutral-800 dark:border-[#39414f] dark:bg-[#1b2029] dark:text-neutral-100'
  const ana =
    'flex-1 rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-white bg-brand hover:opacity-90 transition-opacity disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed dark:disabled:bg-[#232936] dark:disabled:text-neutral-600'
  const yan =
    'rounded-lg px-3 py-2.5 text-[14px] font-medium text-neutral-500 hover:text-brand transition-colors dark:text-neutral-400'
  const aciklama = 'mt-2 mb-0 text-[13.5px] leading-snug text-neutral-700 dark:text-neutral-300'
  const kucuk = 'mt-1.5 mb-0 text-[13px] leading-snug'

  const basliklar = {
    1: t('sih.1.baslik'),
    2: t('sih.2.baslik'),
    3: t('sih.3.baslik'),
    4: t('sih.4.baslik'),
  }

  /*
   * MESAFE YAZILABİLİR.
   *
   * Yalnızca + / − vardı; 0,1'lik adımlarla 6,2 metreye ulaşmak altmış
   * tıklama demekti. Artık doğrudan yazılıyor, düğmeler ince ayar için
   * duruyor.
   *
   * Yazarken alan KENDİ metnini gösteriyor (mesafeYazi): aradaki yarım
   * yazımlar — "6," gibi — sayıya çevrilip geri yazılsaydı imleç kayardı.
   * Düğmeye basınca ya da alandan çıkınca yerel metin bırakılıyor ve
   * gösterilen değer yine dışarıdan geliyor.
   */
  const [mesafeYazi, setMesafeYazi] = useState(null)
  const mesafeGoster =
    mesafeYazi ?? (mesafeM == null ? '' : Number(mesafeM).toFixed(1).replace('.', ','))
  const mesafeYaz = (metin) => {
    setMesafeYazi(metin)
    const n = Number(String(metin).replace(',', '.'))
    if (onMesafe && Number.isFinite(n) && n >= 0.2) onMesafe(Math.round(n * 100) / 100)
  }

  /* Mesafe adımı: + / − ile 0,1 m, alt sınır 0,2 m. */
  const mesafeDegis = (fark) => {
    if (!onMesafe) return
    setMesafeYazi(null)
    const v = Math.max(0.2, Math.round(((Number(mesafeM) || 0) + fark) * 10) / 10)
    onMesafe(v)
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-brand shadow-[0_4px_16px_rgba(41,98,173,0.18)]">
      {/* Başlık şeridi dolu renkte: panelde göz önce buraya gelsin. */}
      <div className="flex items-center gap-2 bg-brand px-2.5 py-2 text-white">
        <span className="flex items-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Nokta key={i} dolu={i < adim} etkin={i === adim} />
          ))}
        </span>
        <span className="text-[11.5px] font-bold tabular-nums text-white/80">
          {adim}/{ADIM_SAYISI}
        </span>
        {/* Panel dar: başlık kesilmek yerine ikinci satıra sarıyor. */}
        <span className="flex-1 text-[14.5px] font-bold leading-tight">{basliklar[adim]}</span>
        <button
          type="button"
          onClick={onKapat}
          aria-label={t('sih.kapat')}
          className="shrink-0 rounded px-1.5 py-0.5 text-[18px] leading-none text-white/75 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="bg-brand/[0.05] px-2.5 pb-2.5 pt-1 dark:bg-brand/[0.1]">
        {/* key={adim}: adım değişince geçiş yeniden oynasın. */}
        <div key={adim} className="sih-adim">
          {/* 1 — İKİ NOKTA */}
          {adim === 1 && (
            <>
              {/*
                REFERANS TÜRÜ.

                İki nokta ölçek ve eğim veriyor; perspektif ancak ölçüsü
                bilinen bir dikdörtgenin dört köşesinden çıkıyor.
              */}
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {[
                  ['cizgi', t('sih.tur.cizgi')],
                  ['dortgen', t('sih.tur.dortgen')],
                ].map(([tur, ad]) => (
                  <button
                    key={tur}
                    type="button"
                    onClick={() => setRefTur(tur)}
                    className={`rounded-md px-2 py-2 text-[13px] font-semibold leading-tight transition-colors ${
                      refTur === tur
                        ? 'bg-brand text-white'
                        : 'border border-neutral-300 bg-white text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:bg-[#1b2029] dark:text-neutral-400'
                    }`}
                  >
                    {ad}
                  </button>
                ))}
              </div>
              <p className={aciklama}>
                {refTur === 'dortgen' ? t('sih.1.aciklamaDort') : t('sih.1.aciklama')}
              </p>
              <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('ref2.duzlemUyari')}</p>
              {/* Sıradaki iş: fotoğrafa tıklamak. Belirgin dursun. */}
              <p className="mt-2 mb-0 rounded-md bg-brand/15 px-2 py-1.5 text-[13.5px] font-semibold text-brand dark:bg-brand/25">
                {refTur === 'dortgen'
                  ? refNoktaSayisi < 4
                    ? t('sih.1.durumDort') + ' ' + (refNoktaSayisi + 1) + '/4'
                    : /* Dört köşe kipinde iki nokta kipinin yazısı çıkıyordu. */
                      t('sih.1.durumDortHazir')
                  : refNoktaSayisi === 0
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
                <button
                  type="button"
                  onClick={onIleri}
                  disabled={refNoktaSayisi < (refTur === 'dortgen' ? 4 : 2)}
                  className={ana}
                >
                  {t('sih.devam')}
                </button>
              </div>
            </>
          )}

          {/* 2 — GERÇEK UZUNLUK */}
          {adim === 2 && (
            <>
              <p className={aciklama}>
                {refTur === 'dortgen' ? t('sih.2.aciklamaDort') : t('sih.2.aciklama')}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  autoFocus
                  value={refUzunlukCm}
                  onChange={(e) => setRefUzunlukCm(e.target.value)}
                  placeholder={refTur === 'dortgen' ? t('ref.en') : t('ref2.uzunlukPh')}
                  className={girdi}
                />
                {refTur === 'dortgen' && (
                  <>
                    <span className="text-[14px] text-neutral-400">×</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={refBoyCm}
                      onChange={(e) => setRefBoyCm(e.target.value)}
                      placeholder={t('ref.boy')}
                      className={girdi}
                    />
                  </>
                )}
                <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
              </div>
              {refTur === 'dortgen' ? (
                refDuzlem ? (
                  <p className={`${kucuk} text-emerald-700 dark:text-emerald-400`}>
                    {t('sih.duzlemHazir')} — {refDuzlem.enCm} × {refDuzlem.boyCm} cm
                  </p>
                ) : (
                  <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('sih.duzlemYok')}</p>
                )
              ) : refPxCm ? (
                <p className={`${kucuk} text-emerald-700 dark:text-emerald-400`}>
                  {Math.round(refOlcek.pxMesafe)} px / {refOlcek.gercekCm} cm ={' '}
                  <strong>{refPxCm.x.toFixed(3).replace('.', ',')} px/cm</strong>
                  {refAci && (
                    <>
                      {' · '}
                      {t('sih.egim')} {refAci.derece.toFixed(1).replace('.', ',')}°
                    </>
                  )}
                </p>
              ) : (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>
                  {refOlcek?.sebep === 'cokKisa' ? t('ref2.cokKisa') : t('ref2.uzunlukGir')}
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <button type="button" onClick={onGeri} className={yan}>
                  {t('sih.geri')}
                </button>
                <button
                  type="button"
                  onClick={onIleri}
                  disabled={refTur === 'dortgen' ? !refDuzlem : !refPxCm}
                  className={ana}
                >
                  {t('sih.devam')}
                </button>
              </div>
            </>
          )}

          {/* 3 — KUTU ÖLÇÜSÜ */}
          {adim === 3 && (
            <>
              <p className={aciklama}>{t('sih.3.aciklama')}</p>
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
                <span className="text-[14px] text-neutral-400">×</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={kutuBoy}
                  onChange={(e) => setKutuBoy(e.target.value)}
                  placeholder={t('ref.boy')}
                  className={girdi}
                />
                <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
              </div>
              {/*
                REFERANS EĞİMİNE HİZALAMA.

                İki noktadan çıkarılabilen tek açı düzlem içi dönme; perspektif
                buradan ÇIKMAZ, onu kullanıcı köşelerden veriyor. Kapatılabilir
                olması şart: köşegen bir referansın eğimi kutuyla ilgisizdir.
              */}
              {!refDuzlem && refAci && Math.abs(refAci.kutuAci) > 0.0005 && (
                <label className="mt-2 flex items-start gap-2 text-[13.5px] leading-snug text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={refAciKullan}
                    onChange={(e) => setRefAciKullan(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>
                    {t('sih.aciHizala')}{' '}
                    <strong>{((refAci.kutuAci * 180) / Math.PI).toFixed(1).replace('.', ',')}°</strong>
                  </span>
                </label>
              )}
              {kutuMesaj && (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{kutuMesaj}</p>
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
              <p className={aciklama}>
                {refDuzlem ? t('sih.4.aciklamaDuzlem') : t('sih.4.aciklama')}
              </p>
              <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sih.4.ipucu')}</p>

              {/*
                ÇEKİM MESAFESİ — ölçeği DEĞİL perspektifi etkiliyor.

                Ölçek referanstan geliyor, bu sayı ona hiç karışmıyor. İşi
                kameranın kutudan ne kadar uzakta durduğunu söylemek: aynı
                açıda çevrilen bir dikdörtgen yakından çok, uzaktan az yamuk
                görünür (bkz. durusKutusu.js). Bu yüzden artık kilitli değil.
              */}
              {mesafeM != null && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 dark:border-[#2c333f] dark:bg-[#1b2029]">
                  <span className="text-[13.5px] text-neutral-600 dark:text-neutral-400">
                    {t('scene.viewDist')}
                  </span>
                  {mesafeKilitli || !onMesafe ? (
                    <span className="text-[14px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                      {Number(mesafeM).toFixed(2).replace('.', ',')} m
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => mesafeDegis(-0.1)}
                        className="h-7 w-7 rounded-md border border-neutral-300 text-[16px] leading-none text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
                      >
                        −
                      </button>
                      <span className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={mesafeGoster}
                          onChange={(e) => mesafeYaz(e.target.value)}
                          onBlur={() => setMesafeYazi(null)}
                          className="w-14 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-center text-[14px] font-semibold tabular-nums text-neutral-800 outline-none focus:border-brand dark:border-[#39414f] dark:bg-[#232936] dark:text-neutral-200"
                        />
                        <span className="text-[13.5px] font-semibold text-neutral-500 dark:text-neutral-400">m</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => mesafeDegis(0.1)}
                        className="h-7 w-7 rounded-md border border-neutral-300 text-[16px] leading-none text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:text-neutral-300"
                      >
                        +
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/*
                EĞİM DÜĞMESİ İKİ YÖNLÜ.
                Eğimli kutuda "sıfırla", düz kutuda "ayarla" yazıyor; ikincisi
                referansın ölçülen eğimini geri veriyor. Tek yönlü olduğunda
                sıfırladıktan sonra geri dönmenin yolu yoktu.
                Düzlem kipinde hiç yok: orada perspektif ölçülmüş oluyor.
              */}
              {onEgim && (
                <button
                  type="button"
                  onClick={onEgim}
                  className="mt-2 w-full rounded-md border border-neutral-300 bg-white py-2 text-[13.5px] font-medium text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:bg-[#1b2029] dark:text-neutral-300"
                >
                  {egimVar ? t('sih.egimSifirla') : t('sih.egimAyarla')}
                </button>
              )}
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
    </div>
  )
}
