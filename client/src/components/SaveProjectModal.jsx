import { useState, useEffect } from 'react';
import { saveConfiguration } from '../services/api';

export default function SaveProjectModal({ isOpen, onClose, configurationData, onSuccess }) {
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal her açıldığında hataları temizle
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!configurationData) {
      setError('Kaydedilecek konfigürasyon verisi bulunamadı.');
      return;
    }

    if (!projectName.trim()) {
      setError('Lütfen geçerli bir proje adı girin.');
      return;
    }

    setLoading(true);
    setError(null);

    const cols = Number(configurationData.cols || configurationData.safeCols || configurationData.totalColumns || 0);
    const rows = Number(configurationData.rows || configurationData.safeRows || configurationData.totalRows || 0);
    const cabinId = Number(configurationData.cabinId || configurationData.cabin?.id || configurationData.cabin_id || 0);

    // Backend Dapper / Entity modelleriyle tam uyumlu payload
    const payload = {
      title: projectName.trim(),
      projectName: projectName.trim(),
      customerName: customerName.trim(),
      cabinId,
      totalColumns: cols,
      cols,
      totalRows: rows,
      rows,
    };

    try {
      // API servisi üzerinden kayıt işlemi
      const savedData = await saveConfiguration(payload);
      
      if (onSuccess) onSuccess(savedData);
      
      setProjectName('');
      setCustomerName('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Konfigürasyon kaydedilirken bir bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Konfigürasyonu Kaydet</h2>
            <p className="text-xs text-slate-500">Mevcut matris ve kabin seçimini veritabanına kaydet.</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-semibold border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Proje Adı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Örn: Kadıköy Saha LED Ekran"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Müşteri / Firma Adı
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Örn: ABC Medya A.Ş."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          {/* MEVCUT KONFİGÜRASYON ÖZETİ */}
          {configurationData && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-slate-600">
              <div>
                • Seçili Kabin ID: <span className="font-bold text-slate-800">{configurationData.cabinId ?? configurationData.cabin?.id}</span>
              </div>
              <div>
                • Ekran Matrisi: <span className="font-bold text-slate-800">{configurationData.cols ?? configurationData.safeCols} Sütun x {configurationData.rows ?? configurationData.safeRows} Satır</span>
              </div>
            </div>
          )}

          {/* MODAL FOOTER */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}