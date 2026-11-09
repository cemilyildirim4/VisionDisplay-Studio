import { useCallback, useEffect, useState } from 'react'

/*
 * 3D GÖRÜNÜMÜN KAPISI — YÜKLEME, TEKRAR DENEME VE ÇIKIŞ.
 *
 * Sahne ayrı bir parça (chunk) olarak, düğmeye basılınca indiriliyor.
 * İndirme başarısız olduğunda (bağlantı kopuk, dosya 0 bayt dönüyor)
 * React'in Suspense'i sonsuza kadar "Hazırlanıyor…" gösteriyordu:
 * kullanıcının ne kapatacak bir düğmesi vardı ne de yeniden deneyecek,
 * tek çıkışı sayfayı yenilemekti — o da tasarımı siliyordu.
 *
 * Burada yükleme elle yapılıyor:
 *   • yükleme sırasında sağ üstte ✕ var, Esc de kapatıyor,
 *   • ilk deneme düşerse bir kez daha deneniyor,
 *   • yine olmazsa sebep yazılıyor ve "Tekrar dene" ile "Kapat" çıkıyor.
 *
 * Hiçbir durumda sayfa yenilenmiyor; tasarım olduğu yerde duruyor.
 */

/* Bir kez indirilen modül burada kalıyor: pencere her açılışta yeniden inmiyor. */
let onbellek = null

/*
 * TEKRAR DENEME GERÇEKTEN YENİDEN İNDİRİYOR.
 *
 * Tarayıcı, düşen bir modülü ADRESİYLE birlikte hatırlıyor: aynı adres
 * ikinci kez içeri alınınca ağa hiç çıkmıyor, saklanan hatayı veriyor.
 * Yani düz bir "tekrar dene" bağlantı geri gelse bile hep başarısız
 * olurdu. Parçanın adresi tarayıcının kaynak günlüğünden okunup sonuna
 * bir damga ekleniyor: yeni adres, yeni deneme. Parçanın kendi
 * bağımlılıkları damgasız adreslerinden geldiği için tekrar inmiyor.
 */
function parcaAdresi() {
  try {
    const liste = performance
      .getEntriesByType('resource')
      .map((x) => x.name)
      .filter((n) => n.indexOf("/Scene3D-") > -1 && n.indexOf(".js") > -1)
    return liste.length ? liste[liste.length - 1].split('?')[0] : null
  } catch {
    return null
  }
}

export default function Sahne3DKapi({ t, onClose, cizim }) {
  const [Bilesen, setBilesen] = useState(() => onbellek)
  const [hata, setHata] = useState(false)
  const [tur, setTur] = useState(0)

  useEffect(() => {
    if (Bilesen) return undefined
    let iptal = false
    setHata(false)
    /* kalan: başarısızlıkta kaç deneme hakkı kaldığı. */
    const dene = (kalan, yeniden = false) => {
      const adres = yeniden ? parcaAdresi() : null
      const istek = adres
        ? import(/* @vite-ignore */ `${adres}?yeniden=${Date.now()}`)
        : import('./Scene3D.jsx')
      istek.then(
        (m) => {
          if (iptal) return
          onbellek = m.default
          setBilesen(() => m.default)
        },
        () => {
          if (iptal) return
          if (kalan > 0) {
            /* Kısa bir bekleme: anlık kopmalarda ikinci deneme çoğu zaman tutuyor. */
            setTimeout(() => !iptal && dene(kalan - 1, true), 800)
            return
          }
          setHata(true)
        },
      )
    }
    /* Pencere ikinci kez açılıyorsa (tur > 0) ilk deneme de damgalı adresle. */
    dene(1, tur > 0)
    return () => {
      iptal = true
    }
  }, [Bilesen, tur])

  /* Esc: hem yükleme sırasında hem hata ekranında. */
  const kapat = useCallback(() => onClose?.(), [onClose])
  useEffect(() => {
    if (Bilesen) return undefined
    const tus = (e) => {
      if (e.key === 'Escape') kapat()
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [Bilesen, kapat])

  if (Bilesen) return cizim(Bilesen)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b0d12] px-6 text-center">
      <button
        type="button"
        onClick={kapat}
        aria-label={t('onay.kapat')}
        title={t('onay.kapat')}
        className="absolute right-3 top-3 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {hata ? (
        <div className="flex max-w-sm flex-col items-center gap-3">
          <p className="m-0 text-[15px] leading-snug text-white/80">{t('scene3d.acilamadi')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setHata(false)
                setTur((n) => n + 1)
              }}
              className="rounded-lg bg-brand px-4 py-2 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('scene3d.tekrar')}
            </button>
            <button
              type="button"
              onClick={kapat}
              className="rounded-lg border border-white/25 px-4 py-2 text-[14.5px] font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
            >
              {t('onay.kapat')}
            </button>
          </div>
        </div>
      ) : (
        <span className="text-[14px] text-white/60">{t('scene3d.exporting')}</span>
      )}
    </div>
  )
}
