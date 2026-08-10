import { useState, useEffect, useCallback } from 'react';
import { getConfigurations, deleteConfiguration } from '../services/api';

export default function SavedProjectsModal({ 
  isOpen, 
  onClose, 
  onLoadProject, 
  onDownloadPdf, 
  isDownloadingPdf,
  savedProjects = [] 
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConfigurations();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Kayıtlı konfigürasyonlar alınırken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Modal açıldığında veya parent verisi değiştiğinde listeyi yenile
  useEffect(() => {
    if (isOpen) {
      if (savedProjects.length > 0) {
        setProjects(savedProjects);
      } else {
        fetchProjects();
      }
    }
  }, [isOpen, savedProjects, fetchProjects]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('Bu konfigürasyonu silmek istediğinize emin misiniz?')) return;

    try {
      await deleteConfiguration(id);
      setProjects((prev) => prev.filter((p) => (p.id || p.Id) !== id));
    } catch (err) {
      console.error('Silme hatası:', err);
      alert(err?.message || 'Silme işlemi sırasında bir hata oluştu.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Geçmiş Konfigürasyonlar</h2>
            <p className="text-xs text-slate-500">Veritabanında kayıtlı projelerinizi inceleyin, PDF indirin veya tuvale yükleyin.</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="text-center py-12 text-slate-500 text-sm font-medium animate-pulse">
              Kayıtlı konfigürasyonlar yükleniyor...
            </div>
          )}

          {error && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs font-semibold border border-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Henüz kaydedilmiş bir konfigürasyon bulunmuyor.
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {projects.map((proj, idx) => {
                const id = proj.id || proj.Id;
                const name = proj.projectName || proj.ProjectName || proj.title || proj.Title || 'İsimsiz Konfigürasyon';
                const customer = proj.customerName || proj.CustomerName || proj.customer_name || 'Müşteri Belirtilmedi';
                
                const cols = proj.cols || proj.Cols || proj.totalColumns || proj.total_columns || 0;
                const rows = proj.rows || proj.Rows || proj.totalRows || proj.total_rows || 0;
                const cabinId = proj.cabinId || proj.CabinId || proj.cabin_id || 0;
                const cabinModel = proj.cabinModelName || proj.CabinModelName || `Kabin ID: ${cabinId}`;
                const createdAt = proj.createdAt || proj.CreatedAt || proj.created_at;

                return (
                  <div
                    key={id || idx}
                    className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                          {customer}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-4 font-mono">
                        <span>Model: <strong className="text-slate-700">{cabinModel}</strong></span>
                        <span>Matris: <strong className="text-slate-700">{cols}x{rows}</strong></span>
                        {createdAt && (
                          <span>Tarih: {new Date(createdAt).toLocaleDateString('tr-TR')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                      {/* PROJE BAZLI PDF İNDİRME */}
                      <button
                        type="button"
                        onClick={() => onDownloadPdf && onDownloadPdf(id, name)}
                        disabled={isDownloadingPdf}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <span>📄</span> PDF
                      </button>

                      {/* TUVALE YÜKLE */}
                      <button
                        type="button"
                        onClick={() => {
                          onLoadProject({ cols, rows, cabinId, projectName: name });
                          onClose();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm cursor-pointer"
                      >
                        Yükle
                      </button>

                      {/* SİLME BUTONU */}
                      <button
                        type="button"
                        onClick={() => handleDelete(id)}
                        className="bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 text-xs px-3 py-2 rounded-lg transition font-medium cursor-pointer"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}