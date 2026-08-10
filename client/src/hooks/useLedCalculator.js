import { useMemo } from "react";

export function useLedCalculator({ rawCabin, cols, rows, isRedundant = false }) {
  return useMemo(() => {
    // 1. Safe Matris Değerleri
    const safeCols = Math.max(1, Number(cols) || 1);
    const safeRows = Math.max(1, Number(rows) || 1);

    // rawCabin null/undefined ise uygulamanın çökmesini önleyen güvenli obje
    const safeRaw = rawCabin && typeof rawCabin === "object" ? rawCabin : {};

    // 2. Kabin / Modül Veri Normalizasyonu
    const cabin = {
      id: safeRaw.id || safeRaw.Id || 0,
      modelName: safeRaw.modelName || safeRaw.model_name || safeRaw.ModelName || "Model Belirtilmedi",
      productType: (safeRaw.productType || safeRaw.product_type || safeRaw.ProductType || "CABINET").toUpperCase(),
      defaultModulesPerCard: Number(safeRaw.defaultModulesPerCard || safeRaw.default_modules_per_card || safeRaw.DefaultModulesPerCard) || 10,
      price: Number(safeRaw.price || safeRaw.Price) || 0,
      widthMm: Number(safeRaw.widthMm || safeRaw.width_mm || safeRaw.WidthMm) || 0,
      heightMm: Number(safeRaw.heightMm || safeRaw.height_mm || safeRaw.HeightMm) || 0,
      pixelWidth: Number(safeRaw.resolutionWidth ?? safeRaw.resolution_width ?? safeRaw.pixelWidth ?? safeRaw.PixelWidth ?? 0),
      pixelHeight: Number(safeRaw.resolutionHeight ?? safeRaw.resolution_height ?? safeRaw.pixelHeight ?? safeRaw.PixelHeight ?? 0),
      weightKg: Number(safeRaw.weightKg || safeRaw.weight_kg || safeRaw.WeightKg || 0),
      maxPowerW: Number(safeRaw.maxPowerWatts || safeRaw.max_power_watts || safeRaw.MaxPowerW || safeRaw.maxPowerW || 0),
    };

    // 3. Birim Tipi ve Adet Hesapları
    const isModule = cabin.productType === "MODULE";
    const unitLabel = isModule ? "Modül" : "Kabin";
    const totalUnits = safeCols * safeRows;
    const totalPrice = totalUnits * cabin.price;

    // 4. Gerekli Alıcı Kart (Receiving Card) Tespiti
    const modulesPerCard = cabin.defaultModulesPerCard > 0 ? cabin.defaultModulesPerCard : 10;
    const totalReceivingCards = isModule
      ? Math.ceil(totalUnits / modulesPerCard)
      : totalUnits;

    // 5. Fiziksel Ölçüler & Diagonal
    const totalWidthMm = safeCols * cabin.widthMm;
    const totalHeightMm = safeRows * cabin.heightMm;
    const totalWidthM = (totalWidthMm / 1000.0).toFixed(2);
    const totalHeightM = (totalHeightMm / 1000.0).toFixed(2);
    const totalAreaM2 = (totalWidthMm * totalHeightMm) / 1000000;

    const diagonalInches = totalHeightMm > 0 && totalWidthMm > 0
      ? Math.round(Math.sqrt(Math.pow(totalWidthMm, 2) + Math.pow(totalHeightMm, 2)) / 25.4)
      : 0;

    // 6. Piksel ve Çözünürlük Metrikleri
    const totalResWidth = safeCols * cabin.pixelWidth;
    const totalResHeight = safeRows * cabin.pixelHeight;
    const rawTotalPixels = totalResWidth * totalResHeight;
    const totalPixelsMpx = (rawTotalPixels / 1000000.0).toFixed(2);

    // 7. Donanım & Aksesuar Hesaplama Motoru (Samsung S-Box Logic)
    const PIXELS_PER_SBOX = 2300000; // Standart S-Box Kapasitesi
    let baseSBoxCount = rawTotalPixels > 0 ? Math.ceil(rawTotalPixels / PIXELS_PER_SBOX) : 0;
    const requiredSBoxCount = isRedundant ? baseSBoxCount * 2 : baseSBoxCount;

    // Wall Mount Frame (2x2 veya 1x1 Kombinasyonu)
    // Önce kaç tane 2x2 sığar, kalanı 1x1 ile tamamla
    const frame2x2 = Math.floor(safeCols / 2) * Math.floor(safeRows / 2);
    const totalKabin = safeCols * safeRows;
    const frame1x1 = totalKabin - (frame2x2 * 4);

    // Bezel Kit (Kenar Çıtası) - Çevre Hesabı (Metre)
    const totalBezelM = ((totalWidthMm * 2) + (totalHeightMm * 2)) / 1000;

    // 8. Ağırlık ve Tüketim Motoru
    const totalWeightKg = (totalUnits * cabin.weightKg).toFixed(1);
    const weightPerM2 = totalAreaM2 > 0 ? (totalWeightKg / totalAreaM2).toFixed(1) : 0;

    const maxPowerWatts = totalUnits * cabin.maxPowerW;
    const avgPowerWatts = Math.round(maxPowerWatts / 3.0);
    const maxPowerKw = (maxPowerWatts / 1000.0).toFixed(2);
    const avgPowerKw = (avgPowerWatts / 1000.0).toFixed(2);

    const totalAmps = (maxPowerWatts / 220).toFixed(1); // 220V AC Standard

    const maxHeatBtu = Math.round(maxPowerWatts * 3.412142);
    const avgHeatBtu = Math.round(avgPowerWatts * 3.412142);
    const btuPerM2 = totalAreaM2 > 0 ? Math.round(maxHeatBtu / totalAreaM2) : 0;

    // 9. Ekran Oranı (Aspect Ratio)
    const ratioVal = totalHeightMm > 0 ? totalWidthMm / totalHeightMm : 0;
    let aspectRatioLabel = "Özel Oran";
    if (totalWidthMm === 0 || totalHeightMm === 0) aspectRatioLabel = "-";
    else if (Math.abs(ratioVal - 16 / 9) < 0.08) aspectRatioLabel = "16:9 Standard";
    else if (Math.abs(ratioVal - 21 / 9) < 0.08) aspectRatioLabel = "21:9 Ultrawide";
    else if (Math.abs(ratioVal - 32 / 9) < 0.08) aspectRatioLabel = "32:9 Superwide";
    else if (Math.abs(ratioVal - 4 / 3) < 0.08) aspectRatioLabel = "4:3 Classic";

    // 10. Çözünürlük Rozeti
    let resolutionBadge = null;
    if (rawTotalPixels === 0) {
      resolutionBadge = null;
    } else if (totalResWidth >= 7680 && totalResHeight >= 4320) resolutionBadge = "8K UHD";
    else if (totalResWidth >= 3840 && totalResHeight >= 2160) resolutionBadge = "4K UHD";
    else if (totalResWidth >= 2560 && totalResHeight >= 1440) resolutionBadge = "2K QHD";
    else if (totalResWidth >= 1920 && totalResHeight >= 1080) resolutionBadge = "Full HD (1080p)";

    // 11. Port ve İşlemci Seçim Engine (Sıfır Piksel Korumalı)
    const minPorts = rawTotalPixels > 0 ? Math.max(1, Math.ceil(rawTotalPixels / 650000)) : 0;
    const maxPorts = rawTotalPixels > 0 ? Math.max(1, Math.ceil(rawTotalPixels / 550000)) : 0;

    let recommendedMediaBox = "-";
    if (rawTotalPixels > 0) {
      if (rawTotalPixels <= 650000 && minPorts <= 1) recommendedMediaBox = "NovaStar TB30 (1 Port / Cloud)";
      else if (rawTotalPixels <= 1300000 && minPorts <= 2) recommendedMediaBox = "NovaStar TB40 / TB50 (2 Port)";
      else if (rawTotalPixels <= 2300000 && minPorts <= 4) recommendedMediaBox = "NovaStar TB60 (4 Port / Cloud)";
      else recommendedMediaBox = `${Math.ceil(rawTotalPixels / 2300000)}x TB60 (Master-Slave Senkron)`;
    }

    let recommendedProcessor = "-";
    if (rawTotalPixels > 0) {
      if (rawTotalPixels > 6500000 || maxPorts > 10) recommendedProcessor = "NovaStar MCTRL4K (16 Port / 4K)";
      else if (rawTotalPixels > 3900000 || maxPorts > 6) recommendedProcessor = "NovaStar VX1000 (10 Port)";
      else if (rawTotalPixels > 2600000 || maxPorts > 4) recommendedProcessor = "NovaStar VX600 (6 Port)";
      else recommendedProcessor = "NovaStar VX400 (4 Port)";
    }

    // 12. Akıllı Hesaplama Yardımcıları (Target Size & Resolution)
    const getTargetSizeMatrix = (targetWM, targetHM) => {
      if (!cabin.widthMm || !cabin.heightMm) return { cols: safeCols, rows: safeRows };
      const c = Math.floor((targetWM * 1000) / cabin.widthMm);
      const r = Math.floor((targetHM * 1000) / cabin.heightMm);
      return { cols: Math.max(1, c), rows: Math.max(1, r) };
    };

    const getTargetResolutionMatrix = (type) => {
      if (!cabin.pixelWidth || !cabin.pixelHeight) return { cols: safeCols, rows: safeRows };
      let targetW = 1920;
      let targetH = 1080;
      if (type === "4K") { targetW = 3840; targetH = 2160; }
      
      const c = Math.ceil(targetW / cabin.pixelWidth);
      const r = Math.ceil(targetH / cabin.pixelHeight);
      return { cols: c, rows: r };
    };

    return {
      safeCols,
      safeRows,
      isRedundant,
      cabin,
      isModule,
      unitLabel,
      totalUnits,
      totalPrice,
      totalReceivingCards,
      totalWidthMm,
      totalHeightMm,
      totalWidthM,
      totalHeightM,
      totalAreaM2,
      diagonalInches,
      totalResWidth,
      totalResHeight,
      totalPixelsMpx,
      requiredSBoxCount,
      frame2x2,
      frame1x1,
      totalBezelM,
      totalWeightKg,
      weightPerM2,
      maxPowerWatts,
      avgPowerWatts,
      maxPowerKw,
      avgPowerKw,
      totalAmps,
      maxHeatBtu,
      avgHeatBtu,
      btuPerM2,
      aspectRatioLabel,
      resolutionBadge,
      minPorts,
      maxPorts,
      recommendedMediaBox,
      recommendedProcessor,
      getTargetSizeMatrix,
      getTargetResolutionMatrix,
    };
  }, [rawCabin, cols, rows, isRedundant]);
}