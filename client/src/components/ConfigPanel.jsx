import { useState } from "react";

export default function ConfigPanel({
  cabins,
  selectedCabinId,
  setSelectedCabinId,
  loadingCabins,
  safeCols,
  safeRows,
  setCols,
  setRows,
  isRedundant,
  setIsRedundant,
  applyPreset,
  unitLabel,
  calcData,
}) {
  const [targetWM, setTargetWM] = useState(3.5);
  const [targetHM, setTargetHM] = useState(2.0);

  const handleApplyTargetSize = () => {
    const { cols, rows } = calcData.getTargetSizeMatrix(targetWM, targetHM);
    setCols(cols);
    setRows(rows);
  };

  const handleApplyResolution = (type) => {
    const { cols, rows } = calcData.getTargetResolutionMatrix(type);
    setCols(cols);
    setRows(rows);
  };

  return (
    <section className="lg:col-span-3 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-y-auto max-h-[85vh]">
      {/* 1. Model Seçici */}
      <div>
        <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
          1. Kabin & Modül Seçimi
        </h2>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Model / Pixel Pitch
        </label>
        {loadingCabins ? (
          <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
        ) : (
          <select
            value={selectedCabinId}
            onChange={(e) => setSelectedCabinId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition font-medium"
          >
            {cabins.map((c) => {
              const cId = String(c.id || c.Id);
              const cName = c.modelName || c.model_name || c.ModelName || "Model Belirtilmedi";
              const cPrice = c.price || c.Price || 0;
              const typeBadge = (c.productType || c.product_type || "CABINET").toUpperCase() === "MODULE" ? "[Modül]" : "[Kabin]";
              return (
                <option key={cId} value={cId}>
                  {typeBadge} {cName} (${cPrice})
                </option>
              );
            })}
          </select>
        )}
      </div>

      <hr className="border-slate-200" />

      {/* 2. Akıllı Hesaplama (Target Size & Res) */}
      <div>
        <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
          2. Akıllı Yerleşim (Smart Fix)
        </h2>
        
        {/* Target Size */}
        <div className="space-y-3 mb-6">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase">Hedef Duvar Ölçüsü (Metre)</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input 
                type="number" 
                value={targetWM} 
                onChange={(e) => setTargetWM(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Genişlik"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">W</span>
            </div>
            <div className="relative">
              <input 
                type="number" 
                value={targetHM} 
                onChange={(e) => setTargetHM(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Yükseklik"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">H</span>
            </div>
          </div>
          <button 
            onClick={handleApplyTargetSize}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
          >
            Ölçüye Göre Hesapla
          </button>
        </div>

        {/* Target Resolution */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase">Hedef Çözünürlük</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleApplyResolution("FHD")}
              className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-extrabold rounded-lg transition cursor-pointer"
            >
              FULL HD (1080p)
            </button>
            <button 
              onClick={() => handleApplyResolution("4K")}
              className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold rounded-lg transition cursor-pointer"
            >
              ULTRA HD (4K)
            </button>
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 3. Donanım Özellikleri */}
      <div>
        <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
          3. Donanım Yapılandırması
        </h2>
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700 block">S-Box Yedekliliği</span>
            <span className="text-[10px] text-slate-500">Redundant Controller & Cable</span>
          </div>
          <button
            onClick={() => setIsRedundant(!isRedundant)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isRedundant ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRedundant ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* 4. Manuel Matris Sürgüleri */}
      <div>
        <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
          4. Manuel Matris ({unitLabel})
        </h2>

        {/* Sütun */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-600 font-medium">Sütun (Yan)</span>
            <span className="font-mono text-blue-600 font-bold text-sm">
              {safeCols} {unitLabel}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="24"
            value={safeCols}
            onChange={(e) => setCols(Number(e.target.value))}
            className="w-full accent-blue-600 bg-slate-200 h-2 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Satır */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-600 font-medium">Satır (Dik)</span>
            <span className="font-mono text-blue-600 font-bold text-sm">
              {safeRows} {unitLabel}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="16"
            value={safeRows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="w-full accent-blue-600 bg-slate-200 h-2 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Hazır Şablonlar */}
        <div className="space-y-2 pt-2">
          <span className="text-xs text-slate-400 font-medium block">
            Hızlı Matris Şablonları:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => applyPreset(4, 4)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded border border-slate-200 text-slate-700 transition cursor-pointer"
            >
              4x4 (Kare 16:9)
            </button>
            <button
              onClick={() => applyPreset(8, 8)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded border border-slate-200 text-slate-700 transition cursor-pointer"
            >
              8x8 (Video Wall)
            </button>
            <button
              onClick={() => applyPreset(12, 6)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded border border-slate-200 text-slate-700 transition cursor-pointer"
            >
              12x6 (Ultrawide)
            </button>
            <button
              onClick={() => applyPreset(16, 9)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded border border-slate-200 text-slate-700 transition cursor-pointer"
            >
              16x9 (Native FHD)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}