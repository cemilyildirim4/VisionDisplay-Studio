/**
 * AR YERLEŞTİRME AKIŞININ ORTAK PARÇALARI
 *
 * Amazon'un "Odanızda görüntüleyin" akışı iki yerde birden kullanılıyor:
 *   • Kamera ekranı (ArView) — canlı kamera görüntüsünün üstüne 2B çizim,
 *   • AR ekranı (Scene3D → model-viewer) — gerçek 3B model, Scene Viewer /
 *     Quick Look / WebXR.
 *
 * Karşılama kartı, "yerleştirmek için dokunun" nişangâhı, sağ üstteki araç
 * sütunu ve hassas ayar tuş takımı ikisinde de BİREBİR aynı görünmeli;
 * bu yüzden yalnızca görünümden ibaret bu parçalar burada tek yerde duruyor.
 * Ne yapacakları (neyi kaydırdıkları, neyi döndürdükleri) çağıran ekrana ait
 * — bileşenler yalnızca geri çağrı alır.
 */

/** Sağ üstteki yuvarlak araç düğmesi (sıfırla / paylaş / konumlandır). */
export function YuvarlakDugme({ onClick, etiket, aktif = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiket}
      title={etiket}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        aktif ? 'bg-white text-neutral-900' : 'bg-black/55 text-white hover:bg-black/70'
      }`}
    >
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}

/** Hassas ayar tuşu — yön okları ve döndürme için kare, küçük düğme. */
export function TusDugme({ onClick, etiket, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiket}
      title={etiket}
      className="w-11 h-11 rounded-lg bg-black/55 text-white hover:bg-black/75 flex items-center justify-center transition-colors"
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}

/**
 * 1) KARŞILAMA KARTI — ne yapılacağını baştan söyler.
 * Amazon'da da AR açılır açılmaz bu kart geliyor ve tek düğmeyle geçiliyor;
 * jestleri tesadüfen keşfetmek gerekmiyor.
 */
export function KarsilamaKarti({ t, onDevam }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8 bg-black/45">
      <div className="w-full max-w-[320px] rounded-2xl bg-white/12 backdrop-blur-sm p-5 flex flex-col items-center">
        {/* İki parmakla sürükle/döndür çizimi */}
        <svg viewBox="0 0 120 78" width="150" height="98" fill="none" aria-hidden="true">
          <rect x="6" y="8" width="108" height="52" rx="3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <rect x="34" y="26" width="34" height="20" rx="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
          <rect x="70" y="22" width="26" height="24" rx="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
          <circle cx="44" cy="52" r="7" fill="#f59e0b" opacity="0.9" />
          <circle cx="60" cy="48" r="7" fill="#f59e0b" opacity="0.9" />
          <path d="M44 52c-4 10-6 16-6 22M60 48c2 12 3 18 3 24" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="m-0 mt-3 text-white text-[16px] font-semibold text-center">{t('ar.onboardTitle')}</p>
        <p className="m-0 mt-1 text-white/70 text-[13px] text-center leading-snug">{t('ar.onboardBody')}</p>
      </div>
      <button
        type="button"
        onClick={onDevam}
        className="mt-6 w-full max-w-[320px] rounded-lg py-3 text-[15px] font-semibold bg-[#0ea5b7] text-white"
      >
        {t('ar.onboardNext')}
      </button>
    </div>
  )
}

/**
 * 2) YERLEŞTİRME — "Yerleştirmek için dokunun" + nişangâh.
 * `onYerlestir` dokunulan noktayı katmanın SOL ÜSTÜNE göre piksel olarak alır;
 * gerçek 3B tarafta koordinat kullanılmıyor, yalnızca dokunuş olayı önemli.
 */
export function YerlestirKatmani({ t, onYerlestir }) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onYerlestir({ x: e.clientX - r.left, y: e.clientY - r.top })
      }}
    >
      <div className="rounded-full bg-white px-6 py-3 shadow-lg">
        <p className="m-0 text-[19px] font-bold text-neutral-900 text-center leading-tight">
          {t('ar.tapToPlace')}
        </p>
      </div>
      {/* Nişangâh — yere oturmuş bir çerçeve izlenimi */}
      <svg viewBox="0 0 160 90" width="200" height="112" fill="none" className="mt-3" aria-hidden="true">
        <path d="M12 30h20M128 30h20M12 30v34M148 30v34M12 64h20M128 64h20" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="80" cy="47" rx="26" ry="12" stroke="#fff" strokeWidth="5" />
        <ellipse cx="80" cy="47" rx="9" ry="4.5" fill="#fff" />
      </svg>
    </div>
  )
}

/**
 * 3) YERLEŞTİKTEN SONRAKİ ARAÇLAR — sağ üstte, Amazon'daki sırayla:
 * sıfırla, paylaş, hassas konumlandırma.
 */
export function AraclarSutunu({ t, onSifirla, onPaylas, onTusTakimi, tusTakimi }) {
  return (
    <div className="absolute right-3 top-24 z-20 flex flex-col gap-3">
      <YuvarlakDugme onClick={onSifirla} etiket={t('ar.reset')}>
        <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" />
      </YuvarlakDugme>
      <YuvarlakDugme onClick={onPaylas} etiket={t('ar.share')}>
        <path d="M12 16V4M8 8l4-4 4 4M5 14v5a1 1 0 001 1h12a1 1 0 001-1v-5" />
      </YuvarlakDugme>
      <YuvarlakDugme onClick={onTusTakimi} etiket={t('ar.nudge')} aktif={tusTakimi}>
        <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
      </YuvarlakDugme>
    </div>
  )
}

/**
 * HASSAS AYAR TUŞ TAKIMI — parmakla tutturulamayan ince kaymalar için.
 * Amazon'da da yön okları ve iki döndürme tuşu var; jest yerine tek dokunuşla
 * adım adım ilerletmeye yarıyor.
 *
 * Tuş takımı SOLA toplandı ve yukarı alındı: sağ kenarda yakınlaştırma (+/−)
 * sütunu duruyor, döndürme tuşları önce onun üstüne biniyordu.
 */
export function TusTakimi({ t, onKaydir, onCevir, className = 'bottom-36' }) {
  return (
    <div className={`absolute inset-x-0 ${className} z-20 flex items-end justify-start gap-4 px-5 pointer-events-none`}>
      <div className="grid grid-cols-3 gap-1.5 pointer-events-auto">
        <span />
        <TusDugme onClick={() => onKaydir(0, -1)} etiket={t('ar.up')}><path d="M12 19V5M5 12l7-7 7 7" /></TusDugme>
        <span />
        <TusDugme onClick={() => onKaydir(-1, 0)} etiket={t('ar.left')}><path d="M19 12H5M12 19l-7-7 7-7" /></TusDugme>
        <TusDugme onClick={() => onKaydir(0, 1)} etiket={t('ar.down')}><path d="M12 5v14M19 12l-7 7-7-7" /></TusDugme>
        <TusDugme onClick={() => onKaydir(1, 0)} etiket={t('ar.right')}><path d="M5 12h14M12 5l7 7-7 7" /></TusDugme>
      </div>
      <div className="flex gap-1.5 pointer-events-auto">
        <TusDugme onClick={() => onCevir(-1)} etiket={t('ar.rotateLeft')}><path d="M4 11a8 8 0 112.3 5.7M4 5v6h6" /></TusDugme>
        <TusDugme onClick={() => onCevir(1)} etiket={t('ar.rotateRight')}><path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" /></TusDugme>
      </div>
    </div>
  )
}
