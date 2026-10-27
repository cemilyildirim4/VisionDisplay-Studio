/**
 * ONAY VE BİLGİ KUTUSU — tarayıcının kendi pencereleri yerine.
 *
 * window.confirm ve window.alert uygulamanın dışında duruyor: yazı tipi,
 * renk ve düğme dili tarayıcının, telefonda da sistemin kendi kutusu
 * çıkıyor. Kullanıcı bir an için uygulamadan kopuyor ve pencere
 * "bir şeyler bozuldu" izlenimi veriyor.
 *
 * Buradaki kutu uygulamanın parçası: aynı yuvarlak köşeler, aynı düğme
 * dili, aynı koyu tema. Tek dosyada duruyor ki bütün onaylar birbirine
 * benzesin.
 *
 * KAPANMA ÜÇ YOLDAN. Dışına tıklamak, Esc'ye basmak ve "Vazgeç" aynı
 * kapıya çıkıyor: hiçbiri onay saymıyor.
 *
 * NOT — SAYFADAN AYRILMA UYARISI BURADA DEĞİL. Tarayıcılar onu
 * özelleştirmiyor (beforeunload); o uyarı tarayıcının kendi kutusu
 * olarak kalıyor.
 */
import { useEffect, useRef } from 'react'

export default function Onay({
  acik,
  baslik,
  metin,
  onayEtiketi,
  vazgecEtiketi = 'Vazgeç',
  /* Geri alınamaz işlerde onay düğmesi kırmızı. */
  tehlike = false,
  /* Bilgi kipinde tek düğme var: yapılacak bir seçim yok. */
  bilgi = false,
  onOnay,
  onVazgec,
}) {
  const kutuRef = useRef(null)

  useEffect(() => {
    if (!acik) return undefined
    const tus = (e) => {
      if (e.key === 'Escape') onVazgec?.()
    }
    window.addEventListener('keydown', tus)
    /* Odak kutuya geliyor: Esc ve Sekme kutunun içinde kalsın. */
    kutuRef.current?.focus()
    return () => window.removeEventListener('keydown', tus)
  }, [acik, onVazgec])

  if (!acik) return null

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[#001334]/45 p-4"
      onClick={onVazgec}
    >
      <div
        ref={kutuRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl outline-none dark:border-[#2c333f] dark:bg-[#161a21]"
      >
        {baslik && (
          <h3 className="m-0 text-[17px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">
            {baslik}
          </h3>
        )}
        {metin && (
          <p className="m-0 mt-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {metin}
          </p>
        )}
        {/* Telefonda düğmeler alt alta ve tam genişlikte: parmakla rahat. */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!bilgi && (
            <button
              type="button"
              onClick={onVazgec}
              className="min-h-[44px] w-full rounded-full border border-neutral-300 px-5 text-[15px] font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 sm:w-auto dark:border-[#39414f] dark:text-neutral-200 dark:hover:bg-[#1b2029]"
            >
              {vazgecEtiketi}
            </button>
          )}
          <button
            type="button"
            onClick={onOnay || onVazgec}
            className={`min-h-[44px] w-full rounded-full px-6 text-[15px] font-semibold text-white transition-colors sm:w-auto ${
              tehlike ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'
            }`}
          >
            {onayEtiketi}
          </button>
        </div>
      </div>
    </div>
  )
}
