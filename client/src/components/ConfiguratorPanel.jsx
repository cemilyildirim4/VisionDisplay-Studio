import React, { useState } from 'react';
import { Sliders, Ruler, Tv, DollarSign, Grid, Info } from 'lucide-react';

export default function ConfiguratorPanel({ selectedCabin }) {
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(3);

  if (!selectedCabin) return null;

  // Hesaplamalar
  const totalCabinets = cols * rows;
  const totalWidthMm = selectedCabin.widthMm * cols;
  const totalHeightMm = selectedCabin.heightMm * rows;
  const totalWidthM = (totalWidthMm / 1000).toFixed(2);
  const totalHeightM = (totalHeightMm / 1000).toFixed(2);
  
  const totalResW = selectedCabin.resolutionWidth * cols;
  const totalResH = selectedCabin.resolutionHeight * rows;
  const totalPixels = (totalResW * totalResH).toLocaleString();

  const totalPrice = totalCabinets * selectedCabin.unitPrice;

  // Ekran Köşegen Boyutu (İnç)
  const diagonalMm = Math.sqrt(Math.pow(totalWidthMm, 2) + Math.pow(totalHeightMm, 2));
  const diagonalInch = (diagonalMm / 25.4).toFixed(1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 my-8">
      <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sliders className="text-indigo-600" /> 2. Ekran Ölçülerini Belirleyin
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Seçilen Kabin: <span className="font-semibold text-indigo-600">{selectedCabin.name}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol Taraf: Satır & Sütun Girdileri */}
        <div className="space-y-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-600" /> Kabin Dizilimi
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sütun Sayısı (Genişlik): <span className="text-indigo-600 font-bold">{cols}</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 Sütun</span>
              <span>20 Sütun</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Satır Sayısı (Yükseklik): <span className="text-indigo-600 font-bold">{rows}</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 Satır</span>
              <span>20 Satır</span>
            </div>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Toplam <strong>{totalCabinets} adet</strong> kabin birleştirilerek tek parça dev LED ekran oluşturulacaktır.
            </span>
          </div>
        </div>

        {/* Sağ Taraf: Canlı Hesaplanan Özellikler */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fiziksel Boyut Kartı */}
          <div className="p-5 rounded-xl border border-gray-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-indigo-600 font-medium mb-3">
              <Ruler className="w-5 h-5" /> Fiziksel Ekran Boyutu
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mb-1">
              {totalWidthM} m x {totalHeightM} m
            </div>
            <div className="text-xs text-gray-500">
              ({totalWidthMm} mm x {totalHeightMm} mm)
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200/60 text-xs text-gray-600 flex justify-between">
              <span>Köşegen Ekran Boyutu:</span>
              <span className="font-semibold text-gray-800">{diagonalInch}" İnç</span>
            </div>
          </div>

          {/* Çözünürlük Kartı */}
          <div className="p-5 rounded-xl border border-gray-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-indigo-600 font-medium mb-3">
              <Tv className="w-5 h-5" /> Toplam Ekran Çözünürlüğü
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mb-1">
              {totalResW} x {totalResH} px
            </div>
            <div className="text-xs text-gray-500">
              Toplam Piksel: {totalPixels}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200/60 text-xs text-gray-600 flex justify-between">
              <span>Piksel Aralığı:</span>
              <span className="font-semibold text-gray-800">P{selectedCabin.pixelPitch} mm</span>
            </div>
          </div>

          {/* Fiyatlandırma Kartı */}
          <div className="sm:col-span-2 p-6 rounded-xl border-2 border-indigo-500 bg-indigo-600 text-white shadow-md flex items-center justify-between">
            <div>
              <div className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> Tahmini Toplam Ekran Fiyatı
              </div>
              <div className="text-3xl font-black">
                ${totalPrice.toLocaleString()}
              </div>
              <div className="text-xs text-indigo-200 mt-1">
                {totalCabinets} Kabin x ${selectedCabin.unitPrice} birim fiyatı
              </div>
            </div>
            <button className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-5 py-3 rounded-xl transition shadow text-sm">
              Konfigürasyonu Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}