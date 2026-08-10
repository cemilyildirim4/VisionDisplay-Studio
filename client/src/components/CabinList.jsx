import React, { useEffect, useState } from 'react';
import { getCabins } from '../services/api';
import { Monitor, CheckCircle2 } from 'lucide-react';

export default function CabinList({ selectedCabin, onSelectCabin }) {
  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCabins = async () => {
      try {
        const data = await getCabins();
        setCabins(data);
      } catch (err) {
        console.error('Kabinler yüklenirken hata oluştu:', err);
        setError('API sunucusuna bağlanılamadı. Lütfen .NET API projesinin çalıştığından emin olun.');
      } finally {
        setLoading(false);
      }
    };

    fetchCabins();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center my-6">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Monitor className="text-indigo-600" /> 1. LED Kabin Modelini Seçin
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cabins.map((cabin) => {
  // C# JSON dönüşümündeki camelCase / PascalCase veya null farklarına karşı güvenli okuma
  const cabinId = cabin.id ?? cabin.Id;
  const isSelected = selectedCabin?.id === cabinId || selectedCabin?.Id === cabinId;

  const seriesName = cabin.seriesName || cabin.SeriesName || 'Standart Serisi';
  const modelName = cabin.modelName || cabin.model_name || cabin.ModelName || 'Model Belirtilmedi';
  const widthMm = cabin.widthMm ?? cabin.width_mm ?? cabin.WidthMm ?? 0;
  const heightMm = cabin.heightMm ?? cabin.height_mm ?? cabin.HeightMm ?? 0;
  const pixelPitch = cabin.pixelPitch ?? cabin.pixel_pitch ?? cabin.PixelPitch ?? '-';
  const resWidth = cabin.resolutionWidth ?? cabin.resolution_width ?? cabin.ResolutionWidth ?? 0;
  const resHeight = cabin.resolutionHeight ?? cabin.resolution_height ?? cabin.ResolutionHeight ?? 0;
  const price = cabin.price ?? cabin.Price ?? 0;

  return (
    <div
      key={cabinId}
      onClick={() => onSelectCabin(cabin)}
      className={`cursor-pointer rounded-2xl p-6 transition-all duration-200 border-2 relative ${
        isSelected
          ? 'border-indigo-600 bg-indigo-50/40 shadow-lg scale-[1.02]'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      {isSelected && (
        <div className="absolute top-4 right-4 text-indigo-600">
          <CheckCircle2 className="w-6 h-6 fill-indigo-100" />
        </div>
      )}

      <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
        {seriesName}
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3">{modelName}</h3>

      <div className="space-y-2 text-sm text-gray-600 mb-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
          <span className="text-gray-500">Boyutlar:</span>
          <span className="font-medium text-gray-800">{widthMm} x {heightMm} mm</span>
        </div>

        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
          <span className="text-gray-500">Piksel Aralığı:</span>
          <span className="font-medium text-gray-800">P{pixelPitch}</span>
        </div>

        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
          <span className="text-gray-500">Çözünürlük:</span>
          <span className="font-medium text-gray-800">{resWidth} x {resHeight} px</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-400">Birim Fiyat</span>
        <span className="text-lg font-extrabold text-indigo-600">${price}</span>
      </div>
    </div>
  );
})}
      </div>
    </div>
  );
}