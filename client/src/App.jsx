import { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import ConfigPanel from "./components/ConfigPanel";
import Visualizer from "./components/Visualizer";
import TechSpecPanel from "./components/TechSpecPanel";
import SaveProjectModal from "./components/SaveProjectModal";
import SavedProjectsModal from "./components/SavedProjectsModal";
import { useLedCalculator } from "./hooks/useLedCalculator";
import {
  getCabins,
  getConfigurations,
  downloadProjectPdfBlob,
  exportDraftPdfBlob,
} from "./services/api";

export default function App() {
  // State Yönetimi
  const [cabins, setCabins] = useState([]);
  const [selectedCabinId, setSelectedCabinId] = useState("");
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const [isRedundant, setIsRedundant] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingCabins, setLoadingCabins] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [savedProjects, setSavedProjects] = useState([]);

  const toastTimerRef = useRef(null);

  const showToast = (message, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const fetchSavedProjects = async () => {
    try {
      const data = await getConfigurations();
      setSavedProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Projeler yüklenirken hata:", error);
    }
  };

  useEffect(() => {
    getCabins()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCabins(data);
          const firstId = data[0].id || data[0].Id;
          setSelectedCabinId(String(firstId));
        } else {
          throw new Error("Kabin verisi boş.");
        }
      })
      .catch((err) => {
        console.warn("Kabin API yanıt vermedi, varsayılan liste devreye girdi:", err);
        const defaultCabins = [
          { id: 1, modelName: "IS-P2.5-500x500", productType: "CABINET", defaultModulesPerCard: 10, price: 450, widthMm: 500, heightMm: 500, pixelWidth: 200, pixelHeight: 200, weightKg: 6.8, maxPowerW: 150 },
          { id: 5, modelName: "LAMPRO (Modül - 320x160)", productType: "MODULE", defaultModulesPerCard: 10, price: 25, widthMm: 320, heightMm: 160, pixelWidth: 128, pixelHeight: 64, weightKg: 0.35, maxPowerW: 20 },
        ];
        setCabins(defaultCabins);
        setSelectedCabinId(String(defaultCabins[0].id));
      })
      .finally(() => setLoadingCabins(false));

    fetchSavedProjects();
  }, []);

  // Seçili ham kabin/modül verisi
  const rawCabin = cabins.find((c) => String(c.id || c.Id) === String(selectedCabinId)) || cabins[0] || {};

  // Custom Hook ile Tüm Hesaplamaları Çalıştır
  const calcData = useLedCalculator({ rawCabin, cols, rows, isRedundant });

  // PDF Şartname İndirme Motoru
  const handleDownloadPdf = async (configIdParam = null, projectNameParam = null) => {
    try {
      let targetId = null;
      let targetName = projectNameParam;

      if (configIdParam && typeof configIdParam === "object") {
        if ("id" in configIdParam || "Id" in configIdParam) {
          targetId = configIdParam.id || configIdParam.Id;
          targetName = configIdParam.projectName || configIdParam.title || projectNameParam;
        }
      } else if (configIdParam) {
        targetId = configIdParam;
      }

      setIsDownloadingPdf(true);
      showToast("📄 PDF şartnamesi hazırlanıyor...", "info");

      let blob;
      if (targetId) {
        blob = await downloadProjectPdfBlob(targetId);
      } else {
        blob = await exportDraftPdfBlob({
          cabinId: calcData.cabin.id,
          cols: calcData.safeCols,
          rows: calcData.safeRows,
          projectName: targetName || "Taslak Proje",
          customerName: "Müşteri Belirtilmedi",
        });
      }

      if (!blob || blob.size === 0) throw new Error("Gelen PDF dosyası boş.");

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = targetId ? `${targetName || "DisplayConfig"}_SpecSheet.pdf` : "DisplayConfig_Draft_SpecSheet.pdf";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 500);

      showToast("✅ PDF Şartnamesi başarıyla indirildi!", "success");
    } catch (error) {
      console.error("PDF indirme hatası:", error);
      showToast(`❌ ${error?.message || "PDF indirilirken bir sorun oluştu."}`, "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleLoadProject = (project) => {
    if (!project) return;
    if (project.cabinId || project.CabinId) setSelectedCabinId(String(project.cabinId || project.CabinId));
    if (project.cols) setCols(Number(project.cols) || 1);
    if (project.rows) setRows(Number(project.rows) || 1);
    showToast(`📂 "${project.projectName || "Seçilen"}" projesi ekrana yüklendi!`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans relative">
      {/* Toast Bildirimi */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all duration-300 ${toast.type === "success" ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20" : toast.type === "error" ? "bg-rose-600 text-white border-rose-500 shadow-rose-600/20" : "bg-slate-900 text-white border-slate-700 shadow-slate-900/30"}`}>
          <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <Header
        onOpenHistory={() => { fetchSavedProjects(); setIsHistoryOpen(true); }}
        onOpenSave={() => setIsModalOpen(true)}
      />

      {/* Main Grid */}
      <main className="max-w-[1700px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <ConfigPanel
          cabins={cabins}
          selectedCabinId={selectedCabinId}
          setSelectedCabinId={setSelectedCabinId}
          loadingCabins={loadingCabins}
          safeCols={calcData.safeCols}
          safeRows={calcData.safeRows}
          setCols={setCols}
          setRows={setRows}
          isRedundant={isRedundant}
          setIsRedundant={setIsRedundant}
          applyPreset={(c, r) => { setCols(c); setRows(r); }}
          unitLabel={calcData.unitLabel}
          calcData={calcData}
        />

        <Visualizer
          aspectRatioLabel={calcData.aspectRatioLabel}
          resolutionBadge={calcData.resolutionBadge}
          totalWidthM={calcData.totalWidthM}
          totalHeightM={calcData.totalHeightM}
          safeCols={calcData.safeCols}
          totalUnits={calcData.totalUnits}
          totalWidthMm={calcData.totalWidthMm}
          totalHeightMm={calcData.totalHeightMm}
          diagonalInches={calcData.diagonalInches}
          totalResWidth={calcData.totalResWidth}
          totalResHeight={calcData.totalResHeight}
          maxPowerWatts={calcData.maxPowerWatts}
          unitLabel={calcData.unitLabel}
          onApplyAspectRatio={(ratio) => {
            if (Math.abs(ratio - 16 / 9) < 0.01) { setCols(16); setRows(9); }
            else if (Math.abs(ratio - 21 / 9) < 0.01) { setCols(21); setRows(9); }
          }}
        />

        <TechSpecPanel
          calcData={calcData}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
        />
      </main>

      {/* Modaller */}
      <SaveProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        configurationData={{ cabinId: calcData.cabin.id, cols: calcData.safeCols, rows: calcData.safeRows }}
        onSuccess={(savedData) => {
          showToast(`"${savedData?.projectName || "Proje"}" konfigürasyonu kaydedildi!`, "success");
          fetchSavedProjects();
        }}
      />
      <SavedProjectsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedProjects={savedProjects}
        onLoadProject={handleLoadProject}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
      />
    </div>
  );
}