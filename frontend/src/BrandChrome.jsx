import { BRAND } from './brand.js'

/**
 * Logo + şirket adı + sayfa başlığı — tüm ana yüzeylerde ortak kurumsal antet.
 */
export function BrandMark({
  title,
  subtitle,
  size = 'md',
  showCompany = true,
  darkOnDark = false,
  /*
   * Dar ekranda metin bloğunu tamamen gizler, geriye yalnızca logo kalır.
   *
   * Antedin sağında başka öğeler varken (yönetim panelinde "Çıkış" ve
   * "← Konfigüratöre dön") metne düşen genişlik telefonda o kadar azalıyor ki
   * başlık "MASAÜSTÜ Bİ…" / "Yönetim P…" diye kırpılıyor. Yarım okunan bir
   * başlık hiç olmamasından kötü; logo kimliği zaten taşıyor.
   *
   * Yatay tutuşta aynı gizleme `yatay-gizle` ile CSS tarafında zaten yapılıyor
   * (bkz. index.css); bu seçenek onun DİK tutuştaki karşılığı.
   */
  hideTextOnMobile = false,
}) {
  const logoH = size === 'lg' ? 'h-11 sm:h-12' : size === 'sm' ? 'h-7' : 'h-8 sm:h-9'
  /*
   * TELEFONDA DA LOGONUN YANINDA.
   *
   * Dar ekranda blok alt alta diziliyordu: logo üstte, yazı altında. Yazının
   * kendi iki satırı (firma adı + sayfa adı) zaten var; logodan da ayrılınca
   * antet üç satıra çıkıp yer kaplıyordu. Artık her ölçüde yan yana.
   */
  return (
    <div className="flex flex-row flex-nowrap items-center gap-2.5 sm:gap-4 min-w-0 w-full max-w-full">
      <img
        src={BRAND.logoSrc}
        alt={BRAND.company}
        className={`${logoH} w-auto max-w-full shrink-0 brand-logo-enter`}
      />
      <span
        className={`yatay-gizle hidden sm:block w-px shrink-0 ${
          darkOnDark ? 'bg-white/20 h-9' : 'bg-neutral-200 dark:bg-[#2c333f] h-8'
        }`}
      />
      <div className={`yatay-gizle min-w-0 w-auto max-w-full ${hideTextOnMobile ? 'hidden sm:block' : ''}`}>
        {showCompany && (
          <p
            className={`m-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] truncate ${
              darkOnDark ? 'text-white/55' : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            {BRAND.companyShort}
          </p>
        )}
        {title && (
          <h1
            className={`m-0 truncate leading-tight tracking-tight font-bold ${
              size === 'lg' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
            } ${darkOnDark ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}`}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p
            className={`hidden sm:block m-0 leading-tight truncate ${
              size === 'lg' ? 'text-xs mt-0.5' : 'text-[11px]'
            } ${darkOnDark ? 'text-white/60' : 'text-neutral-500 dark:text-neutral-400'}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

/** Logo mavisi → turuncusu şerit — header altında kurumsal imza. */
export function BrandStripe({ className = '' }) {
  return <div className={`brand-stripe h-[3px] w-full shrink-0 ${className}`} aria-hidden />
}

/** PDF / html2canvas için inline antet (Tailwind yok). */
export function PdfBrandHeader({ productLine, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        paddingBottom: 14,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <img
          src={BRAND.logoSrc}
          alt=""
          style={{ height: 36, width: 'auto', display: 'block' }}
        />
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: BRAND.muted,
            }}
          >
            {BRAND.company}
          </div>
          {productLine && (
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.blue, lineHeight: 1.2, marginTop: 2 }}>
              {productLine}
            </div>
          )}
        </div>
      </div>
      {right}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: `linear-gradient(90deg, ${BRAND.blue} 0%, ${BRAND.blue} 62%, ${BRAND.orange} 62%, ${BRAND.orange} 100%)`,
        }}
      />
    </div>
  )
}
