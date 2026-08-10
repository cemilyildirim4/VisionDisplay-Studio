export default function TechSpecPanel({
  calcData,
  onDownloadPdf,
  isDownloadingPdf,
}) {
  const {
    totalResWidth,
    totalResHeight,
    totalPixelsMpx,
    unitLabel,
    totalUnits,
    safeCols,
    safeRows,
    totalReceivingCards,
    minPorts,
    maxPorts,
    recommendedMediaBox,
    recommendedProcessor,
    totalWeightKg,
    maxPowerKw,
    maxPowerWatts,
    avgPowerKw,
    avgPowerWatts,
    maxHeatBtu,
    avgHeatBtu,
    totalPrice,
    requiredSBoxCount,
    frame2x2,
    frame1x1,
    totalBezelM,
    isRedundant,
  } = calcData;

  return (
    <section className="lg:col-span-3 space-y-6">
      {/* Aksesuar Kartı */}
      <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">
          Gereken Aksesuar Listesi
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-3 rounded-xl border border-white/20">
            <span className="text-[10px] uppercase font-bold opacity-70 block mb-1">Samsung S-Box</span>
            <span className="text-xl font-extrabold">{requiredSBoxCount} <span className="text-xs font-normal opacity-80">Adet</span></span>
            {isRedundant && <span className="block text-[9px] text-blue-200 mt-1 font-bold">✓ Yedekli (1+1)</span>}
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/20">
            <span className="text-[10px] uppercase font-bold opacity-70 block mb-1">Bezel Kit</span>
            <span className="text-xl font-extrabold">{totalBezelM.toFixed(1)} <span className="text-xs font-normal opacity-80">Metre</span></span>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/20">
            <span className="text-[10px] uppercase font-bold opacity-70 block mb-1">2x2 Frame</span>
            <span className="text-xl font-extrabold">{frame2x2} <span className="text-xs font-normal opacity-80">Adet</span></span>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/20">
            <span className="text-[10px] uppercase font-bold opacity-70 block mb-1">1x1 Frame</span>
            <span className="text-xl font-extrabold">{frame1x1} <span className="text-xs font-normal opacity-80">Adet</span></span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Teknik Şartname Detayları
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Toplam Çözünürlük</span>
            <span className="font-mono text-slate-800 font-bold">
              {totalResWidth} x {totalResHeight} px
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Toplam Piksel Sayısı</span>
            <span className="font-mono text-slate-800 font-semibold">
              {totalPixelsMpx} Mpx
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">{unitLabel} Adedi</span>
            <span className="font-mono text-slate-800 font-semibold">
              {totalUnits} Adet ({safeCols}x{safeRows})
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100 bg-blue-50/50 px-2 rounded">
            <span className="text-blue-900 font-semibold">Gerekli Alıcı Kart</span>
            <span className="font-mono text-blue-700 font-bold">
              {totalReceivingCards} Adet
            </span>
          </div>

          {/* İşlemci & Donanım Kutusu */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2 text-xs my-3">
            <div className="flex justify-between items-center">
              <span className="text-indigo-950 font-semibold">Gerekli RJ45 Port</span>
              <span className="font-mono bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded font-bold">
                {minPorts === maxPorts ? `${minPorts} Port` : `${minPorts} - ${maxPorts} Port`}
              </span>
            </div>
            <p className="text-[10px] text-indigo-700 leading-tight">
              * Min: Teorik limit (650k px) | Maks: Güvenli kablolama (550k px)
            </p>

            <div className="border-t border-indigo-200/60 pt-2 flex justify-between items-start">
              <span className="text-indigo-900 font-medium">Medya Oynatıcı</span>
              <span className="font-mono text-indigo-900 font-bold text-right text-[11px] max-w-[140px]">
                {recommendedMediaBox}
              </span>
            </div>
            <div className="border-t border-indigo-200/60 pt-2 flex justify-between items-start">
              <span className="text-indigo-900 font-medium">Pro-AV İşlemci</span>
              <span className="font-mono text-indigo-900 font-bold text-right text-[11px] max-w-[140px]">
                {recommendedProcessor}
              </span>
            </div>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Tahmini Ağırlık</span>
            <span className="font-mono text-slate-800 font-semibold">{totalWeightKg} kg</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Maksimum Güç</span>
            <span className="font-mono text-amber-600 font-bold">
              {maxPowerKw} kW ({maxPowerWatts?.toLocaleString()} W)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Ortalama Güç</span>
            <span className="font-mono text-slate-700 font-semibold">
              {avgPowerKw} kW ({avgPowerWatts?.toLocaleString()} W)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Maksimum Isı Yayılımı</span>
            <span className="font-mono text-rose-600 font-semibold">
              {maxHeatBtu?.toLocaleString()} BTU/hr
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-medium">Ortalama Isı Yayılımı</span>
            <span className="font-mono text-slate-700 font-semibold">
              {avgHeatBtu?.toLocaleString()} BTU/hr
            </span>
          </div>
        </div>
      </div>

      {/* Bütçe Kartı */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <span className="text-xs uppercase tracking-wider text-blue-600 font-bold block">
          Tahmini Bütçe
        </span>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-500 font-medium">Toplam Liste Fiyatı:</span>
          <span className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
            ${totalPrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <button
          onClick={() => onDownloadPdf()}
          disabled={isDownloadingPdf}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer active:scale-98"
        >
          <span>📄</span> {isDownloadingPdf ? "PDF Şartname Hazırlanıyor..." : "PDF Şartname Oluştur"}
        </button>
        <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          * Fiyata Montaj, Kasa Yapısı ve Nakliye bedelleri dahil değildir.
        </p>
      </div>
    </section>
  );
}