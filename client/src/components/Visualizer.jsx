import { useState, useRef, useEffect } from 'react';

const ENVIRONMENTS = [
  {
    id: 'boardroom',
    name: 'Toplantı Odası',
    bgImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop',
    accentGlow: 'from-amber-200/20 via-transparent to-transparent',
    hasTable: true,
  },
  {
    id: 'lobby',
    name: 'Lüks Lobi',
    bgImage: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?q=80&w=1600&auto=format&fit=crop',
    accentGlow: 'from-stone-300/30 via-transparent to-transparent',
    hasTable: false,
  },
  {
    id: 'controlroom',
    name: 'Kontrol Merkezi',
    bgImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop',
    accentGlow: 'from-blue-200/20 via-transparent to-transparent',
    hasTable: false,
  },
  {
    id: 'studio',
    name: 'Açık Studio',
    bgImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1600&auto=format&fit=crop',
    accentGlow: 'from-slate-300/20 via-transparent to-transparent',
    hasTable: false,
  },
];

const DISPLAY_CONTENTS = [
  { id: 'nature', name: '4K Manzara', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop' },
  { id: 'city', name: 'Şehir', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop' },
  { id: 'abstract', name: 'Dijital Sanat', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' },
  { id: 'grid', name: 'Teknik Izgara', url: null },
];

export default function Visualizer({
  aspectRatioLabel = "16:9",
  resolutionBadge = null,
  totalWidthM = "0",
  totalHeightM = "0",
  safeCols = 1,
  totalUnits = 0,
  totalWidthMm = 1000,
  diagonalInches = 0,
  totalHeightMm = 1000,
  totalResWidth = 0,
  totalResHeight = 0,
  maxPowerWatts = 0,
  unitLabel = "Kabin",
  onApplyAspectRatio = null
}) {
  const [selectedEnv, setSelectedEnv] = useState('boardroom');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [selectedContent, setSelectedContent] = useState('nature');
  const [showSeams, setShowSeams] = useState(true);
  const [showHuman, setShowHuman] = useState(true);
  const [showCad, setShowCad] = useState(true);
  const [zoomScale, setZoomScale] = useState(1);

  // Ekran yüksekliğini gerçek piksel olarak ölçmek için Ref ve State
  const screenBoxRef = useRef(null);
  const [renderedScreenHeightPx, setRenderedScreenHeightPx] = useState(220);
  const fileInputRef = useRef(null);

  // Sütun ve Satır Sayısı Hesaplama
  const safeColsCount = Math.max(1, Number(safeCols) || 1);
  const safeUnitsCount = Math.max(0, Number(totalUnits) || 0);
  const safeRowsCount = Math.max(1, Math.ceil(safeUnitsCount / safeColsCount));

  // Dinamik Aspect Ratio (Milimetre Bazlı Gerçek Fiziksel Oran)
  const validWidthMm = Math.max(100, Number(totalWidthMm) || 1000);
  const validHeightMm = Math.max(100, Number(totalHeightMm) || 1000);
  const dynamicAspectRatio = `${validWidthMm} / ${validHeightMm}`;

  const currentEnv = ENVIRONMENTS.find((e) => e.id === selectedEnv) || ENVIRONMENTS[0];
  const activeMedia = DISPLAY_CONTENTS.find((c) => c.id === selectedContent) || DISPLAY_CONTENTS[0];
  const activeBgImage = selectedEnv === 'custom' ? customBgUrl : currentEnv?.bgImage;

  // Ekranın ekrandaki piksel yüksekliğini dinle
  useEffect(() => {
    if (!screenBoxRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setRenderedScreenHeightPx(entry.contentRect.height);
      }
    });
    observer.observe(screenBoxRef.current);
    return () => observer.disconnect();
  }, []);

  // GERÇEK ORANTI HESABI: İnsan = 1750 mm (1.75m)
  // Ekranın piksel yüksekliğine göre insanın piksel yüksekliği hesaplanır
  const HUMAN_REAL_HEIGHT_MM = 1750;
  const calculatedHumanHeightPx = (renderedScreenHeightPx * HUMAN_REAL_HEIGHT_MM) / validHeightMm;
  
  // Arayüzün bozulmaması için sınırlar (Min: 40px, Max: 450px)
  const humanDisplayHeight = Math.max(40, Math.min(450, calculatedHumanHeightPx));
  const humanDisplayWidth = humanDisplayHeight * 0.36; // İnsan en/boy oranı (~1:0.36)

  const handleZoom = (delta) => {
    setZoomScale((prev) => Math.min(2.0, Math.max(0.5, prev + delta)));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCustomBgUrl(imageUrl);
      setSelectedEnv('custom');
    }
  };

  return (
    <section className="lg:col-span-6 bg-slate-200/60 rounded-3xl border border-slate-300 p-4 md:p-6 flex flex-col justify-between items-center relative overflow-hidden min-h-[680px] shadow-inner text-slate-800 font-sans select-none">
      
      {/* Gizli Dosya Yükleme Input'u */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* 1. KONTROL PANELİ */}
      <div className="w-full z-30 flex flex-wrap justify-between items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-300 p-2 rounded-2xl shadow-sm">
        
        {/* Ortam / Mekan Seçici */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Mekan:</span>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex-wrap gap-0.5">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => setSelectedEnv(env.id)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedEnv === env.id
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {env.name}
              </button>
            ))}

            {customBgUrl && (
              <button
                type="button"
                onClick={() => setSelectedEnv('custom')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedEnv === 'custom'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                🖼️ Özel Duvar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            title="Kendi ofisinizin/duvarınızın fotoğrafını yükleyin"
          >
            📷 Fotoğraf Yükle
          </button>
        </div>

        {/* İçerik Seçici */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Görsel:</span>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {DISPLAY_CONTENTS.map((content) => (
              <button
                key={content.id}
                type="button"
                onClick={() => setSelectedContent(content.id)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedContent === content.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {content.name}
              </button>
            ))}
          </div>
        </div>

        {/* BÜYÜTME / KÜÇÜLTME (ZOOM) KONTROLLERİ */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleZoom(-0.15)}
            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs cursor-pointer"
            title="Küçült"
          >
            🔍 −
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-600 px-1">
            %{Math.round(zoomScale * 100)}
          </span>
          <button
            type="button"
            onClick={() => handleZoom(0.10)}
            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs cursor-pointer"
            title="Büyüt"
          >
            🔍 +
          </button>
          <button
            type="button"
            onClick={() => setZoomScale(1)}
            className="px-1.5 py-1 text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Sığdır
          </button>
        </div>

        {/* Katman Butonları */}
        <div className="flex items-center gap-1 flex-wrap">
          {onApplyAspectRatio && (
            <div className="flex gap-1 border-r border-slate-300 pr-1.5">
              <button
                type="button"
                onClick={() => onApplyAspectRatio(16 / 9)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold rounded-lg border border-slate-300 transition cursor-pointer"
              >
                16:9
              </button>
              <button
                type="button"
                onClick={() => onApplyAspectRatio(21 / 9)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold rounded-lg border border-slate-300 transition cursor-pointer"
              >
                21:9
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSeams(!showSeams)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              showSeams ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            🧩 Derz
          </button>

          <button
            type="button"
            onClick={() => setShowCad(!showCad)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              showCad ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            📐 CAD
          </button>

          <button
            type="button"
            onClick={() => setShowHuman(!showHuman)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              showHuman ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            🧍 İnsan
          </button>
        </div>

      </div>

      {/* 2. DİNAMİK MİMARİ SAHNE */}
      <div className="my-auto w-full py-12 px-4 md:px-8 rounded-2xl border border-slate-300 shadow-lg transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden min-h-[480px] bg-slate-900">
        
        {/* ARKA PLAN FOTOĞRAFI */}
        {activeBgImage && (
          <img
            src={activeBgImage}
            alt="Mekan Arka Planı"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
        )}

        {/* Karartma Katmanı */}
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />

        {/* Işık & Zemin Efektleri */}
        <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${currentEnv.accentGlow} pointer-events-none`} />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {selectedEnv === 'boardroom' && (
          <div className="absolute inset-x-12 -bottom-20 h-32 bg-gradient-to-t from-slate-900/80 via-slate-800/40 to-transparent border-t border-slate-500/30 rounded-[100%] pointer-events-none opacity-80 backdrop-blur-xs" />
        )}

        {/* KONTROL EDİLEBİLİR ZOOM ALANI */}
        <div 
          className="transition-transform duration-200 flex flex-col items-center justify-center w-full max-w-full z-10"
          style={{ transform: `scale(${zoomScale})` }}
        >
          {/* CAD ÜST GENİŞLİK ÇİZGİSİ */}
          {showCad && (
            <div className="w-full max-w-[680px] mb-2 flex items-center justify-between text-white font-mono text-[11px] px-2 animate-fadeIn z-10 drop-shadow">
              <div className="h-[1px] bg-white/80 flex-1 relative flex items-center">
                <div className="absolute left-0 w-1.5 h-1.5 border-l border-t border-white -rotate-45" />
              </div>
              <span className="px-3 py-0.5 bg-slate-900/90 border border-slate-600 text-white rounded-full font-bold shadow-md whitespace-nowrap mx-2 backdrop-blur-md">
                ↔ {totalWidthM} m ({totalWidthMm} mm)
              </span>
              <div className="h-[1px] bg-white/80 flex-1 relative flex items-center justify-end">
                <div className="absolute right-0 w-1.5 h-1.5 border-r border-t border-white rotate-45" />
              </div>
            </div>
          )}

          {/* EKRAN VE İNSAN (AYAK HİZASI ALT ÇİZGİDE "items-end") */}
          <div className="relative flex items-end justify-center gap-6 max-w-full z-10">
            
            {/* CAD SOL YÜKSEKLİK ÇİZGİSİ */}
            {showCad && (
              <div className="hidden sm:flex flex-col items-center justify-between h-full min-h-[160px] text-white font-mono text-[10px] py-1 animate-fadeIn drop-shadow self-stretch">
                <div className="w-[1px] bg-white/80 flex-1 relative flex justify-center">
                  <div className="absolute top-0 w-1.5 h-1.5 border-l border-t border-white rotate-45" />
                </div>
                <span className="py-1 px-2 bg-slate-900/90 border border-slate-600 text-white rounded -rotate-90 font-bold my-4 shadow-md whitespace-nowrap backdrop-blur-md">
                  ↕ {totalHeightM} m
                </span>
                <div className="w-[1px] bg-white/80 flex-1 relative flex justify-center items-end">
                  <div className="absolute bottom-0 w-1.5 h-1.5 border-l border-b border-white -rotate-45" />
                </div>
              </div>
            )}

            {/* DİNAMİK SABİT ORANLI EKRAN KUTUSU */}
            <div className="relative border-4 border-slate-950 rounded-xl shadow-2xl bg-black p-0.5 transition-all duration-300 flex items-center justify-center overflow-hidden max-w-[80vw]">
              
              {/* Sol Üst Rozetler */}
              <div className="absolute top-2 left-2 z-30 flex gap-1.5">
                <span className="bg-black/80 backdrop-blur border border-white/30 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold shadow">
                  {aspectRatioLabel}
                </span>
                {resolutionBadge && (
                  <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded shadow-md animate-pulse">
                    {resolutionBadge}
                  </span>
                )}
              </div>

              {/* Sağ Üst Diagonel Etiketi */}
              <div className="absolute top-2 right-2 z-30 bg-white text-black font-extrabold text-[10px] font-mono px-2.5 py-0.5 rounded shadow-md border border-slate-200">
                {diagonalInches}" DIAGONAL
              </div>

              {/* EKRAN KUTUSU (REF İLE BOYUTU DİNLENİYOR) */}
              <div
                ref={screenBoxRef}
                className="relative overflow-hidden rounded-lg bg-slate-950 transition-all duration-300 shadow-inner flex items-center justify-center"
                style={{
                  aspectRatio: dynamicAspectRatio,
                  width: '100%',
                  maxWidth: '680px',
                  maxHeight: '380px',
                  minWidth: '220px',
                  minHeight: '140px',
                }}
              >
                {/* CANLI ARKA PLAN VEYA TEKNİK ZEMİN */}
                {activeMedia.url ? (
                  <img
                    src={activeMedia.url}
                    alt="LED Screen Preview"
                    className="absolute inset-0 w-full h-full object-cover select-none z-0"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black z-0" />
                )}

                {/* MATRİS DERZ IZGARASI */}
                <div
                  className="absolute inset-0 grid gap-[1px] pointer-events-none z-10"
                  style={{
                    gridTemplateColumns: `repeat(${safeColsCount}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${safeRowsCount}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: safeUnitsCount }).map((_, index) => (
                    <div
                      key={index}
                      className={`transition-all ${
                        showSeams ? 'border border-white/20 bg-blue-500/10' : 'border-transparent'
                      } flex items-center justify-center`}
                    >
                      {!activeMedia.url && (
                        <span className="text-[10px] font-mono text-blue-400/90 font-bold drop-shadow-sm">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cam Yansıması */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-20" />
              </div>

            </div>

            {/* GERÇEKÇİ & ORANTILI BÜYÜYÜP KÜÇÜLEN İNSAN SİLUETİ */}
            {showHuman && (
              <div 
                className="flex flex-col items-center justify-end select-none animate-fadeIn pointer-events-none relative transition-all duration-300"
                style={{
                  height: `${humanDisplayHeight}px`,
                  width: `${humanDisplayWidth}px`,
                }}
              >
                <div className="text-[9px] font-mono font-bold text-white bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 rounded mb-1 shadow-md backdrop-blur-xs whitespace-nowrap">
                  1.75 m
                </div>
                
                {/* GERÇEKÇİ İNSAN DETAYLI VEKTÖR ÇİZİMİ */}
                <svg 
                  className="w-full h-full text-slate-100 fill-current drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]" 
                  viewBox="0 0 120 320"
                >
                  {/* Baş ve Saç Detayı */}
                  <path d="M60 12 C67 12 73 18 73 26 C73 31 70 36 65 38 C68 44 68 50 63 52 C57 52 52 50 48 45 C46 39 47 30 50 24 C52 16 56 12 60 12 Z" />
                  
                  {/* Boyun ve Omuz Çizgisi */}
                  <path d="M53 48 L67 48 L73 58 L85 68 C88 71 86 78 82 78 L80 78 L80 115 C80 120 77 125 73 125 L70 125 L70 185 L74 300 C74 305 68 308 64 308 L58 308 C55 308 52 304 52 298 L55 185 L50 185 L53 298 C53 304 50 308 46 308 L40 308 C36 308 30 305 30 300 L34 185 L31 125 L28 125 C24 125 21 120 21 115 L21 78 L19 78 C15 78 13 71 16 68 L28 58 Z" />
                  
                  {/* Takım Elbise Ceket / Vücut Kıvrım Detayları */}
                  <path d="M42 68 L60 110 L78 68 L82 118 L73 175 L48 175 L39 118 Z" opacity="0.15" />
                  <line x1="60" y1="110" x2="60" y2="175" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                </svg>

                {/* Zemin Gölgesi */}
                <div className="w-full h-1.5 bg-black/70 blur-xs rounded-full -mt-0.5" />
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 3. TEKNİK ÖZET BARI */}
      <div className="w-full bg-white border border-slate-300 p-3 rounded-xl flex justify-between items-center text-xs font-mono text-slate-600 flex-wrap gap-3 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span>Ölçü: <strong className="text-slate-900 font-bold">{totalWidthMm}x{totalHeightMm}mm</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Çözünürlük: <strong className="text-slate-900 font-bold">{totalResWidth}x{totalResHeight}px</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Güç (Max): <strong className="text-slate-900 font-bold">{maxPowerWatts}W</strong></span>
        </div>
        <div>
          Matris: <strong className="text-slate-900 font-bold">{safeColsCount}x{safeRowsCount} ({totalUnits} {unitLabel})</strong>
        </div>
      </div>

    </section>
  );
}