import React from 'react';

const CabinetGridPreview = ({ rows, cols, cabinetWidthMm = 500, cabinetHeightMm = 500 }) => {
  const totalWidthCm = (cols * cabinetWidthMm) / 10;
  const totalHeightCm = (rows * cabinetHeightMm) / 10;
  const totalCabinets = rows * cols;

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4">
      {/* Üst Bilgi Başlığı */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">2D Kabin Izgara Önizlemesi</h3>
          <p className="text-xs text-slate-400">
            {cols} Sütun × {rows} Satır ({totalCabinets} Adet Kabin)
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-indigo-400 font-mono block">Toplam Ekran Ölçüsü</span>
          <span className="text-sm font-bold text-slate-200">
            {totalWidthCm} cm × {totalHeightCm} cm
          </span>
        </div>
      </div>

      {/* 2D Grid Alanı */}
      <div className="relative w-full min-h-[320px] max-h-[520px] bg-slate-950 rounded-xl p-4 flex items-center justify-center overflow-auto border border-slate-800/80">
        <div
          className="grid gap-1.5 w-full max-w-full transition-all duration-300"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            aspectRatio: `${totalWidthCm} / ${totalHeightCm}`
          }}
        >
          {Array.from({ length: totalCabinets }).map((_, index) => {
            const rowIndex = Math.floor(index / cols) + 1;
            const colIndex = (index % cols) + 1;

            return (
              <div
                key={index}
                className="group relative bg-slate-800 hover:bg-indigo-600/80 border border-slate-700 hover:border-indigo-400 rounded transition-all duration-200 flex flex-col items-center justify-center p-1 cursor-pointer overflow-hidden shadow-sm"
              >
                {/* Kabin Numarası / Koordinatı */}
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors">
                  R{rowIndex}-C{colIndex}
                </span>

                {/* Hover Durumunda Kabin Ölçü Bilgisi */}
                <div className="absolute inset-0 bg-slate-900/95 text-[9px] text-indigo-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-mono p-1 text-center">
                  {cabinetWidthMm}×{cabinetHeightMm} mm
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alt Bilgi & Lejant */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></span>
          <span>Kabin Boyutu: {cabinetWidthMm}×{cabinetHeightMm} mm</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          En/Boy Oranı: {(totalWidthCm / totalHeightCm).toFixed(2)}:1
        </span>
      </div>
    </div>
  );
};

export default CabinetGridPreview;