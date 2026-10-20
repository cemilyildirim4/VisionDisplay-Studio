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

/*
 * ADIM SAYISI EKRAN TÜRÜNE GÖRE.
 *
 * Düz ekranda dört adım: referansı işaretle, gerçek uzunluğu yaz, yerleşim
 * alanını kur, konumlandır. L tipinde ikisi düşüyor — ölçek referanstan değil
 * KÖŞE ÇİZGİSİNİN kendisinden geliyor (işaretlenen uzunluk / yazılan santim),
 * yerleşim alanı da yok. Geriye iki adım kalıyor: çizgiyi işaretle, ölçüleri
 * yaz.
 */
const ADIM_SAYISI = 4
const L_ADIM_SAYISI = 3

function Nokta({ dolu, etkin }) {
  return (
    <span
      className={`inline-block h-2 rounded-full transition-all duration-200 ${
        etkin ? 'w-5 bg-white' : dolu ? 'w-2 bg-white/70' : 'w-2 bg-white/35'
      }`}
    />
  )
}

import { PANEL } from './panelOzellikleri.js'

export default function OlcuSihirbazi(props) {
  return <SihirbazKart {...props} />
}

function SihirbazKart({
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
  /*
   * L TİPİNDE 3. ADIM BAŞKA: KUTU DEĞİL KÖŞE ÇİZGİSİ.
   *
   * Düz ekranda yerleşim bir ALAN (dikdörtgen ölçü kutusu). L'de yerleşimi
   * belirleyen şey alan değil, ekranın kırıldığı yer — mekânın köşesi. Bu
   * yüzden L seçiliyken 3. adım köşenin iki ucunu ve gerçek yüksekliğini
   * soruyor; kutu hiç kurulmuyor.
   *
   * Bayrak yanlışsa hiçbir şey değişmiyor: lKose verilmezse eski akış.
   */
  lKose = false,
  lKoseNoktaSayisi = 0,
  lKoseBoyCm,
  setLKoseBoyCm,
  /* Sütun sayısından hesaplanan kanat genişlikleri — yalnızca gösteriliyor. */
  lKoseKabinSolCm = 0,
  lKoseKabinSagCm = 0,
  lKoseIsaretle,
  /* ÖLÇÜM İLE AYARLA — dört noktayla yerleşim alanı (bkz. App.jsx alanKipi). */
  alanKipi = false,
  alanNoktaSayisi = 0,
  alanVar = false,
  /* Düzenlemede referans adımlarına dönülmüyor. */
  duzenlemede = false,
  onAlanTemizle = null,
  /* İşaretleme geçerli mi (içe çökmüş dörtgen kabul edilmiyor). */
  alanGecerli = true,
  /* GÖRÜNMEYEN KÖŞE — iki kenardan bulunuyor. */
  kenarKipi = false,
  kenarNoktaSayisi = 0,
  kenarHazir = false,
  onKenarBasla = null,
  onKenarEkle = null,
  onKenarVazgec = null,
  /* Alan zaten işaretliyse yeniden işaretlemeden yerleştirmeye dönülüyor. */
  onYerlesim = null,
  /* İKİNCİ REFERANS — odak tahmin ediliyorsa ölçümü kesinleştiriyor. */
  odakTahminMi = false,
  odakCozuldu = false,
  odakExiften = false,
  ref2Kipi = false,
  ref2NoktaSayisi = 0,
  ref2UzunlukCm = '',
  setRef2UzunlukCm = null,
  onRef2Isaretle = null,
  onRef2Bitir = null,
  alanOlculenEn = null,
  alanOlculenBoy = null,
  alanElleEn = '',
  alanElleBoy = '',
  setAlanElleEn = null,
  setAlanElleBoy = null,
  onAlanIsaretle = null,
  onAlanBitir = null,
  onAlanSigdir = null,
  /* L'nin son adımında çizilen kanat şekli tuşları (bkz. App.jsx). */
  kanatSekli,
  setManuelNot,
  lKoseOran = null,
  /* İşaretlenen çizgi dik mi — yatay bir çizgiden köşe çıkmaz. */
  lKoseDikMi = true,
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
  /* Manuel yol: köşe işaretlemeden doğrudan yerleştirme adımına. */
  onElleDuzenle,
  onBitir,
  onKapat,
}) {
  /*
   * ───────────────────────────────────────────────────────────────────────
   * DURUMLAR EN ÜSTTE — HEPSİ, İSTİSNASIZ.
   *
   * Bu dosyada aynı tuzağa dört kez düşüldü: bir durum (useState) ihtiyaç
   * duyulan yerin yanına yazıldı, ama onu okuyan JSX bir const'un içinde
   * DAHA YUKARIDA kuruluyordu. Const'lar yukarıdan aşağı çalıştığı için
   * henüz tanımlanmamış bir değeri okumak çalışma anında hata veriyor
   * (TDZ) ve kart çizilirken uygulama hata ekranına düşüyor.
   *
   * Belirtisi her seferinde aynıydı: bir adımda her şey yolunda, sonraki
   * adımda "Bir şeyler ters gitti".
   *
   * Kural: useState / useRef / useMemo yalnızca buraya yazılır. Nerede
   * kullanıldığının bir önemi yok; tanım her zaman en üstte.
   * eslint "no-use-before-define" bunu artık derlemeden önce yakalıyor.
   * ───────────────────────────────────────────────────────────────────────
   */

  /*
   * AYRINTILAR "?" ARKASINDA.
   *
   * Kartta adım başına dört paragrafa kadar yazı birikmişti; kullanıcı
   * yapılacak işi aramak zorunda kalıyordu. Her adımda bir cümle duruyor,
   * gerisi başlıktaki "?" ile açılıyor. Tercih kart boyunca hatırlanıyor:
   * ayrıntıyı isteyen her adımda yeniden açmak zorunda kalmasın.
   */
  const [detayAcik, setDetayAcik] = useState(false)

  /*
   * MESAFE YAZARKEN ALAN KENDİ METNİNİ GÖSTERİYOR: aradaki yarım
   * yazımlar — "6," gibi — sayıya çevrilip geri yazılsaydı imleç kayardı.
   */
  const [mesafeYazi, setMesafeYazi] = useState(null)
  /*
   * ADIM 0'DA DA ÇİZİLİYOR — ALAN İŞARETLENİYORSA.
   *
   * "Ekran ekle" akış bittikten sonra (adım 0) yeni bir alan işaretlemesi
   * başlatıyor. Burada koşulsuz null dönünce pencere boş çıkıyordu:
   * kullanıcı dört köşeyi işaretliyor ama ne yönerge ne "Alanı onayla"
   * düğmesi görüyordu.
   */
  /*
   * İŞARETLEME SÜRERKEN KART YALNIZCA ONU GÖSTERİYOR.
   *
   * Önce yalnızca "adım yokken" böyleydi. Oysa alan 2. adımdan açılıyor ve
   * adım 2'de kalıyordu: kullanıcı dört köşeyi işaretlerken kartta hâlâ
   * "Referans ölçüyü yazın" başlığı, o adımın düğmeleri ve İKİNCİ bir
   * "Geri" duruyordu. Kart kendini tekrar ediyormuş gibi görünmesinin
   * sebebi buydu.
   */
  const alanTekBasina = !!alanKipi
  /* Yol seçimi: adım da işaretleme de yokken kart yine de duruyor. */
  if (!adim && !alanKipi) return null

  const girdi =
    'w-full min-w-0 rounded-md border border-neutral-300 px-2.5 py-2 text-[15px] text-neutral-800 dark:border-[#39414f] dark:bg-[#1b2029] dark:text-neutral-100'
  const ana =
    'flex-1 rounded-lg px-3 py-2.5 text-[14.5px] font-semibold text-white bg-brand hover:opacity-90 transition-opacity disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed dark:disabled:bg-[#232936] dark:disabled:text-neutral-600'
  const yan =
    'rounded-lg px-3 py-2.5 text-[14px] font-medium text-neutral-500 hover:text-brand transition-colors dark:text-neutral-400'
  const aciklama = 'mt-2 mb-0 text-[13.5px] leading-snug text-neutral-700 dark:text-neutral-300'
  const kucuk = 'mt-1.5 mb-0 text-[13px] leading-snug'

  const basliklar = lKose
    ? { 1: t('sihL.3.baslik'), 2: t('sihL.2.baslik') }
    : {
        1: t('sih.1.baslik'),
        2: t('sih.2.baslik'),
        3: t('sih.3.yeniBaslik'),
        4: t('sih.4.baslik'),
      }
  const adimSayisi = lKose ? L_ADIM_SAYISI : ADIM_SAYISI

  /*
   * ALANIN ÖLÇÜSÜ — tek yerde kurulup iki yerde çiziliyor.
   * Önce yalnızca 4. adımda vardı; akış bitince kaybolyordu ve kullanıcı
   * ölçüyü hiç göremiyordu.
   */
  const alanOlcuAlani = (
    <>
                {/*
                  ALANIN ÖLÇÜSÜ — ölçülen yazılı, elle düzeltilebiliyor.
                  Yazılan değer dörtgeni değiştirmiyor; yalnızca o
                  dörtgenin kaç santim olduğunu söylüyor, kabin hesabı
                  da ona göre yeniden kuruluyor.
                */}
                {(alanOlculenEn > 0 || alanVar) && setAlanElleEn && (
                  <div className="mt-2 rounded-lg border border-neutral-200 dark:border-[#2c333f] px-2.5 py-2">
                    <div className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200">
                      {alanOlculenEn > 0 ? t('sih.alanOlculen') : t('sih.alanGercekOlcu')}
                    </div>
                    {/*
                      OLCULEN DEGER DUZ YAZI OLARAK DA DURUYOR: yalnizca
                      kutularin yer tutucusunda gri gorununce "hicbir sey
                      yazmiyor" izlenimi birakiyordu.
                    */}
                    <div className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {alanOlculenEn} × {alanOlculenBoy} cm
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={alanElleEn}
                        onChange={(e) => setAlanElleEn(e.target.value)}
                        placeholder={t('ref.en')}
                        className={girdi}
                      />
                      <span className="text-[14px] text-neutral-400">×</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={alanElleBoy}
                        onChange={(e) => setAlanElleBoy && setAlanElleBoy(e.target.value)}
                        placeholder={t('ref.boy')}
                        className={girdi}
                      />
                      <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
                    </div>
                    {detayAcik && (
                      <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>
                        {t('sih.alanOlcuIpucu')}
                      </p>
                    )}
                  </div>
                )}
    </>
  )

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
      <div className="bg-brand px-2.5 py-2 text-white">
        {/*
          İLERLEME — akışın tamamı tek bakışta.

          Önce adım noktaları ve "2/4" vardı; köşe işaretleme adımında ise
          hiçbir gösterge yoktu ve kullanıcı nerede olduğunu kaybediyordu.
          Üstelik "4 adım" sayısı yola göre değişiyor: "alanım var" yolunda
          referans adımı hiç yok.
        */}
        {!lKose && (
          <span className="mb-1 flex items-center gap-1">
            {['referans', 'alan', 'yerlesim'].map((ad, i, hepsi) => {
              /* 3. adım artık "nasıl yerleştirelim" seçimi: o da alan aşaması. */
              const suAn = alanKipi ? 'alan' : adim >= 4 ? 'yerlesim' : adim === 3 ? 'alan' : 'referans'
              const sira = hepsi.indexOf(suAn)
              const etkin = i === sira
              const bitti = i < sira
              return (
                <span key={ad} className="flex items-center gap-1">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                      etkin ? 'bg-white text-brand' : bitti ? 'bg-white/35 text-white' : 'bg-white/15 text-white/70'
                    }`}
                  >
                    {t('sih.ilerle.' + ad)}
                  </span>
                  {i < hepsi.length - 1 && <span className="text-white/40 text-[10px]">›</span>}
                </span>
              )
            })}
          </span>
        )}
        {/*
          BAŞLIK KENDİ SATIRINDA.

          Önce ilerleme çubuğuyla YAN YANA duruyordu; panel dar olduğu için
          başlığa kalan sütun bir iki kelime genişliğindeydi ve başlık üç
          dört satıra bölünüyordu. Şimdi ilerleme üstte, başlık altında ve
          şeridin tamamını kullanıyor.
        */}
        <div className="flex items-start gap-2">
          <span className="flex-1 text-[14.5px] font-bold leading-tight">
            {alanTekBasina ? t('sih.alanBaslik') : basliklar[adim]}
          </span>
          {/* Ayrıntılar bunun arkasında: kart kalabalıklaşmasın. */}
          <button
            type="button"
            onClick={() => setDetayAcik((o) => !o)}
            aria-label={t('sih.detay')}
            title={t('sih.detay')}
            className={`mt-0.5 shrink-0 h-6 w-6 rounded-full text-[13px] font-bold leading-none transition-colors ${
              detayAcik ? 'bg-white text-brand' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            ?
          </button>
        </div>
        {/*
          KAPATMA DÜĞMESİ YOK.

          × ile kapatılınca referans verilmemiş oluyor, tasarım hiç
          görünmüyor ve kullanıcının elinde hiçbir yol kalmıyordu. Ölçek
          kurulmadan yapılacak bir iş yok; adım atlanamaz.
          "Baştan başla" sağ panelde duruyor.
        */}
      </div>

      <div className="bg-brand/[0.05] px-2.5 pb-2.5 pt-1 dark:bg-brand/[0.1]">
        {/* key={adim}: adım değişince geçiş yeniden oynasın. */}
        <div key={adim} className="sih-adim">
          {/* L 1 — KÖŞE ÇİZGİSİ */}
          {!alanKipi && lKose && adim === 1 && (
            <>
              <p className={aciklama}>{t('sihL.3.aciklama')}</p>
              <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sihL.3.gizli')}</p>
              <p className="mt-2 mb-0 rounded-md bg-brand/15 px-2 py-1.5 text-[13.5px] font-semibold text-brand dark:bg-brand/25">
                {lKoseNoktaSayisi === 0
                  ? t('sihL.3.durum0')
                  : lKoseNoktaSayisi === 1
                    ? t('sihL.3.durum1')
                    : t('sihL.3.durum2')}
              </p>
              {/* Yatay çizgi uyarısı: sebebiyle birlikte, devam da kapalı. */}
              {lKoseNoktaSayisi >= 2 && !lKoseDikMi && (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('sihL.3.dikDegil')}</p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                {lKoseNoktaSayisi > 0 && (
                  <button type="button" onClick={lKoseIsaretle} className={yan}>
                    {t('sihL.3.tekrar')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onIleri}
                  disabled={lKoseNoktaSayisi < 2 || !lKoseDikMi}
                  className={ana}
                >
                  {t('sih.devam')}
                </button>
              </div>
            </>
          )}

          {/* L 2 — ÖLÇÜLER */}
          {!alanKipi && lKose && adim === 2 && (
            <>
              <p className={aciklama}>{t('sihL.2.aciklama')}</p>
              <label className="mt-2 block text-[13px] font-semibold text-neutral-600 dark:text-neutral-400">
                {t('sihL.kose')}
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  step="1"
                  autoFocus
                  value={lKoseBoyCm}
                  onChange={(e) => setLKoseBoyCm(e.target.value)}
                  placeholder={t('sihL.3.boyPh')}
                  className={girdi}
                />
                <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">cm</span>
              </div>
              {/*
                KANAT GENİŞLİKLERİ SORULMUYOR, HESAPLANIYOR.

                Sütun sayısı ve kabin ölçüsü zaten biliniyor: sol kanat kaç
                kabinse o kadar geniş. Kullanıcıya sormak aynı sayıyı ikinci
                kez istemek olurdu. Yine de yazılıyor — neyin yerleştiği
                görünsün.
              */}
              <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>
                {t('sihL.kanatlar')}: {Math.round(lKoseKabinSolCm)} + {Math.round(lKoseKabinSagCm)} cm
              </p>
              {lKoseOran > 0 ? (
                lKoseOran > 1 ? (
                  <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('sihL.3.tasiyor')}</p>
                ) : lKoseOran < 0.2 ? (
                  /*
                    Ekran köşenin beşte birinden küçükse yazılan santim büyük
                    ihtimalle yanlış (metre yerine santim, ya da duvarın eni).
                    Ekran o oranda minicik çiziliyor ve köşe hiç okunmuyor.
                  */
                  <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>
                    {t('sihL.3.hazir')} <strong>%{Math.round(lKoseOran * 100)}</strong> —{' '}
                    {t('sihL.3.cokKucuk')}
                  </p>
                ) : (
                  <p className={`${kucuk} text-emerald-700 dark:text-emerald-400`}>
                    {t('sihL.3.hazir')} <strong>%{Math.round(lKoseOran * 100)}</strong>
                  </p>
                )
              ) : (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('sihL.3.eksik')}</p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <button type="button" onClick={onGeri} className={yan}>
                  {t('sih.geri')}
                </button>
                {/*
                  Ölçüden sonra akış BİTMİYOR: kanat şekli de kurulumun bir
                  parçası. Ayrı bir düğmenin arkasına koymak, biten bir işin
                  üstüne ikinci bir iş eklemek gibi duruyordu.
                */}
                <button type="button" onClick={onIleri} disabled={!(lKoseOran > 0)} className={ana}>
                  {t('sih.devam')}
                </button>
              </div>
            </>
          )}

          {/* L3 — KANAT ŞEKLİ */}
          {!alanKipi && lKose && adim === 3 && (
            <>
              <p className={aciklama}>{t('sihL.3.sekilAciklama')}</p>
              {kanatSekli}
              <div className="mt-2 flex items-center gap-1.5">
                <button type="button" onClick={onGeri} className={yan}>
                  {t('sih.geri')}
                </button>
                <button type="button" onClick={onBitir} className={ana}>
                  {t('sihL.bitir')}
                </button>
              </div>
            </>
          )}

          {/* 1 — İKİ NOKTA */}
          {!alanKipi && !lKose && adim === 1 && (
            <>
              {detayAcik && (
                <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sih.1.detay')}</p>
              )}
              {/*
                REFERANS TÜRÜ SEÇİMİ KALDIRILDI.

                Tek tür var: iki nokta. Perspektif alanın kendi dört
                köşesinden ve gerçek ölçüsünden çıkıyor; referansın işi
                yalnızca santim ölçeğini vermek. İki seçenek kullanıcıya
                gereksiz bir karar sorduruyordu (bkz. App.jsx refTur).
              */}
              <p className={aciklama}>
                {refTur === 'dortgen' ? t('sih.1.aciklamaDort') : t('sih.1.aciklama')}
              </p>
              {/* Aynı duvar uyarısı ayrıntıya taşındı (bkz. sih.1.detay). */}
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
          {!alanKipi && !lKose && adim === 2 && (
            <>
              <p className={aciklama}>
                {refTur === 'dortgen' ? t('sih.2.aciklamaDort') : t('sih.2.aciklama')}
              </p>
              {detayAcik && (
                <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sih.2.detay')}</p>
              )}
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
                /*
                  ÖLÇEK SATIRI SADE.

                  "388 px / 210 cm = 1,849 px/cm · eğim 90,0°" müşteriye
                  hiçbir şey anlatmıyor, teknik bir ayrıntı. Yerine olup
                  bittiğini söyleyen tek bir satır.
                */
                <p className={`${kucuk} text-emerald-700 dark:text-emerald-400`}>
                  {t('sih.olcekAlindi')}
                </p>
              ) : refOlcek?.sebep === 'cokKisa' ? (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('ref2.cokKisa')}</p>
              ) : null}
              {/*
                BU KART YALNIZCA ÖLÇEĞİ KURUYOR.

                Santim kutusu ile "ne yapalım" seçimi aynı kartta duruyordu;
                kullanıcı ölçüyü yazmadan seçeneklere bakıyor, iki ayrı işi
                aynı anda okumak zorunda kalıyordu. Seçim kendi adımına
                (3) taşındı.
              */}
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

          {/*
            ALAN İŞARETLEME — dört nokta konurken sağ panelde duran kart.

            Tuvalin üstüne yönerge şeridi konmuyor; aynı gerekçe referans
            adımındaki gibi: fotoğrafın üstü temiz kalsın, yönerge burada.
          */}
          {alanKipi && kenarKipi && (
            <>
              <p className={aciklama}>{t('sih.kenarAciklama')}</p>
              <p
                className={`${kucuk} ${
                  kenarHazir ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {kenarNoktaSayisi} / 4 {kenarHazir ? '· ' + t('sih.kenarBulundu') : ''}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <button type="button" onClick={onKenarVazgec} className={yan}>
                  {t('sih.vazgec')}
                </button>
                <button type="button" onClick={onKenarEkle} disabled={!kenarHazir} className={ana}>
                  {t('sih.kenarEkle')}
                </button>
              </div>
            </>
          )}

          {alanKipi && !kenarKipi && (
            <>
              <p className={aciklama}>{t('sih.alanAciklama')}</p>
              {detayAcik && (
                <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sih.alanDetay')}</p>
              )}
              <p className={`${kucuk} ${alanNoktaSayisi >= 4 ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {alanNoktaSayisi} / 4
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                {/*
                  İLK KURULUMDA geri referansa döner. DÜZENLEMEDE referansa
                  hiç girilmiyor; sıfırdan işaretlemek isteyen "Temizle"
                  kullanıyor (bkz. App.jsx duzenlemede).
                */}
                {!duzenlemede && adim > 0 && (
                  <button type="button" onClick={onGeri} className={yan}>
                    {t('sih.geri')}
                  </button>
                )}
                {onAlanTemizle && alanNoktaSayisi > 0 && (
                  <button type="button" onClick={onAlanTemizle} className={yan}>
                    {t('sih.alanTemizle')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onAlanBitir}
                  disabled={alanNoktaSayisi < 4 || !alanGecerli}
                  className={ana}
                >
                  {t('sih.alanBitir')}
                </button>
              </div>
              {/* İçe çökmüş dörtgen hiçbir dikdörtgenin görüntüsü değil. */}
              {alanNoktaSayisi === 4 && !alanGecerli && (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{t('sih.alanGecersiz')}</p>
              )}
              {/*
                Köşe görünmüyorsa: iki kenardan bulunuyor. Dört köşe
                tamamlanmışsa teklif edilmiyor, yapacak bir şey yok.
              */}
              {onKenarBasla && alanNoktaSayisi < 4 && (
                <button
                  type="button"
                  onClick={onKenarBasla}
                  className="mt-1.5 w-full py-2 rounded-lg text-[14px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                >
                  {t('sih.kenarBasla')}
                </button>
              )}
            </>
          )}

          {/*
            ALAN KURULDUKTAN SONRA — sığdırma ve taşıma her an elin altında.
            Sihirbazın hangi adımında olunursa olunsun görünüyor; alan bir kez
            işaretlendikten sonra bunlar kurulumun değil, ayarın parçası.
          */}
          {/*
            SIĞDIRMA VE ALAN ÖLÇÜSÜ YALNIZCA 4. ADIMDA.

            Önce ötekiler dışında her adımda çiziliyordu: referans
            işaretlenirken ya da santim yazılırken kartın altında bir de
            "Tasarımı ölçüye sığdır" ve alan ölçüsü kutuları duruyordu.
            O adımlarda yapılacak iş bu değil; kart kalabalık görünüyor ve
            aynı şeyleri yineliyordu. Yeri 4. adım: kutunun yerine konduğu,
            ölçünün düzeltildiği adım.
          */}

          {/* 3 — KUTU ÖLÇÜSÜ */}
          {/*
            3 — NASIL YERLEŞTİRELİM.

            Ölçek kurulduktan sonra geriye tek soru kalıyor: ekranın yeri
            işaretlenerek mi belirlenecek, yoksa kullanıcı tasarımı kendisi
            mi taşıyacak. Kartın başka işi yok.

            Burada eskiden "yerleşim alanının santimi" yazılıyor ve kutu
            kuruluyordu; o kutu kurma düğmesi kapalı olduğu için (PANEL
            .olcuKutusu) adım çıkmaz sokaktı.
          */}
          {!alanKipi && adim === 3 && !lKose && (
            <>
              <p className={aciklama}>{t('sih.sec.aciklama')}</p>
              {onAlanIsaretle && (
                <>
                  <button type="button" onClick={onAlanIsaretle} className={`mt-2 w-full ${ana}`}>
                    {t('sih.sec.alan')}
                  </button>
                  {detayAcik && (
                    <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>
                      {t('sih.sec.alanNot')}
                    </p>
                  )}
                </>
              )}
              {PANEL.manuelDuzenle && (
                <>
                  <button
                    type="button"
                    onClick={() => onElleDuzenle?.()}
                    className="mt-2 w-full py-2.5 rounded-lg text-[14px] font-medium border border-neutral-200 dark:border-[#2c333f] text-neutral-600 dark:text-neutral-400 hover:border-brand hover:text-brand transition-colors"
                  >
                    {t('sih.sec.serbest')}
                  </button>
                  {detayAcik && (
                    <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>
                      {t('sih.sec.serbestNot')}
                    </p>
                  )}
                </>
              )}
              {kutuMesaj && (
                <p className={`${kucuk} text-amber-600 dark:text-amber-400`}>{kutuMesaj}</p>
              )}
              {/* Geri: referansın santimini düzeltmek için. */}
              <div className="mt-2 flex items-center gap-1.5">
                <button type="button" onClick={onGeri} className={yan}>
                  {t('sih.geri')}
                </button>
              </div>
            </>
          )}

          {/* 4 — KONUMLANDIR */}
          {!alanKipi && !lKose && adim === 4 && (
            <>
              <p className={aciklama}>
                {lKose ? t('sihL.4.aciklama') : refDuzlem ? t('sih.4.aciklamaDuzlem') : t('sih.4.aciklama')}
              </p>
              {/* Kutu ipucu L'de yanlış: orada taşınacak bir kutu yok. */}
              {detayAcik && !lKose && (
                <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sih.4.ipucu')}</p>
              )}

              {/*
                TASARIMI SIĞDIR — yalnızca işaretlenmiş bir alan varken.

                Alan işaretlendiğinde tasarım kendi SANTİM ölçüsüyle alanın
                içine giriyor; bu düğme onu alanı dolduracak şekilde büyütüyor
                (montaj payı bırakarak, bkz. sigdirDortgen). İkisi ayrı şey:
                biri gerçek ölçü, öteki "şurayı kaplasın".
              */}
              {/*
                ALAN YOKKEN (manuel yol) ÖLÇÜ KABİN SAYISIYLA DEĞİŞİYOR.
                Kutuyu köşelerinden çekmek yalnızca duruşunu veriyor; santim
                ölçüsü soldaki sütun/satır sayısından geliyor. Sığdırma
                düğmesi burada yok, çünkü sığdırılacak bir alan yok.
              */}
              {!alanVar && (
                <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>
                  {t('sih.elleOlcuNot')}
                </p>
              )}
              {alanVar && onAlanSigdir && (
                <>
                  {/*
                    Ölçü kesin değilken sığdırma açılmıyor: yanlış bir ölçüye
                    sığdırmak yanlış kabin sayısı demek (bkz. sih.olcuKesinDegil).
                  */}
                  {odakCozuldu && (
                  <button
                    type="button"
                    onClick={onAlanSigdir}
                    className="mt-2 w-full py-2 rounded-lg text-[14px] font-semibold bg-brand text-white hover:opacity-90 transition-opacity"
                  >
                    {t('sih.alanSigdir')}
                  </button>
                  )}
                  {alanOlcuAlani}

                  {/*
                    İKİNCİ REFERANS.

                    Ölçüm tahmini bir odak uzaklığına dayanıyorsa (kamera düz
                    tutulmuş, dikey kenarlar paralel) burada haber veriliyor ve
                    ikinci bir bilinen uzunluk isteniyor. Hesaplandıktan sonra
                    teklif kalkıyor; yeniden sorulmuyor.
                  */}
                  {ref2Kipi ? (
                    <div className="mt-2 rounded-lg border border-brand/50 px-2.5 py-2">
                      <p className={aciklama}>{t('sih.ref2Aciklama')}</p>
                      <p
                        className={`${kucuk} ${
                          ref2NoktaSayisi >= 2
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {ref2NoktaSayisi} / 2
                      </p>
                      {ref2NoktaSayisi >= 2 && setRef2UzunlukCm && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            autoFocus
                            value={ref2UzunlukCm}
                            onChange={(e) => setRef2UzunlukCm(e.target.value)}
                            placeholder={t('ref2.uzunlukPh')}
                            className={girdi}
                          />
                          <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">
                            cm
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={onRef2Bitir}
                        disabled={ref2NoktaSayisi < 2 || !(Number(String(ref2UzunlukCm).replace(',', '.')) > 0)}
                        className={`mt-2 w-full ${ana}`}
                      >
                        {t('sih.ref2Bitir')}
                      </button>
                    </div>
                  ) : odakCozuldu ? (
                    <p className={`${kucuk} text-emerald-700 dark:text-emerald-400`}>
                      {odakExiften ? t('sih.odakExif') : t('sih.ref2Hazir')}
                    </p>
                  ) : odakTahminMi && onRef2Isaretle ? (
                    <div className="mt-2 rounded-lg border border-brand/50 px-2.5 py-2">
                      <p className={aciklama}>{t('sih.olcuKesinDegil')}</p>
                      <button
                        type="button"
                        onClick={onRef2Isaretle}
                        className={`mt-2 w-full ${ana}`}
                      >
                        {t('sih.ref2Ekle')}
                      </button>
                      <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>{t('sih.olcuKesinNot')}</p>
                    </div>
                  ) : null}

                  {detayAcik && (
                    <p className={`${kucuk} text-neutral-500 dark:text-neutral-400`}>
                      {t('sih.alanTasi')}
                    </p>
                  )}
                </>
              )}

              {/*
                ÇEKİM MESAFESİ — ölçeği DEĞİL perspektifi etkiliyor.

                Ölçek referanstan geliyor, bu sayı ona hiç karışmıyor. İşi
                kameranın kutudan ne kadar uzakta durduğunu söylemek: aynı
                açıda çevrilen bir dikdörtgen yakından çok, uzaktan az yamuk
                görünür (bkz. durusKutusu.js). Bu yüzden artık kilitli değil.
              */}
              {PANEL.mesafe && mesafeM != null && (
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
              {/* Eğim kutuyu düzeltiyor; L'de kutu yok, köşe çizgisi var. */}
              {PANEL.egim && onEgim && !lKose && (
                <button
                  type="button"
                  onClick={onEgim}
                  className="mt-2 w-full rounded-md border border-neutral-300 bg-white py-2 text-[13.5px] font-medium text-neutral-600 hover:border-brand hover:text-brand dark:border-[#39414f] dark:bg-[#1b2029] dark:text-neutral-300"
                >
                  {egimVar
                    ? t('sih.egimSifirla')
                    : /* Düzlemde geri dönüş ÖLÇÜLEN perspektife; iki noktada referans eğimine. */
                      refDuzlem
                      ? t('sih.egimDuzleme')
                      : t('sih.egimAyarla') +
                        ': ' +
                        (((refAci?.kutuAci || 0) * 180) / Math.PI).toFixed(1).replace('.', ',') +
                        '°'}
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
