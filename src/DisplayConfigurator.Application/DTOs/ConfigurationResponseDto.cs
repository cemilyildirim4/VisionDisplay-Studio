namespace DisplayConfigurator.Application.DTOs;

public class ConfigurationResponseDto
{
    public int Id { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public int CabinId { get; set; }
    public string CabinModelName { get; set; } = string.Empty;

    // --- DONANIM & MONTAJ BİLGİLERİ ---
    public string AssemblyType { get; set; } = string.Empty; // "MODULE" veya "CABINET"
    public int ModulesPerCard { get; set; }
    public int ReceivingCardCount { get; set; }
    public int RequiredRj45Ports { get; set; }
    public string RecommendedProcessor { get; set; } = string.Empty;

    // Matris & Adet
    public int Cols { get; set; }
    public int Rows { get; set; }
    public int TotalCabinets => Cols * Rows;

    // Fiziksel Ölçüler
    public int TotalWidthMm { get; set; }
    public int TotalHeightMm { get; set; }
    
    // Otomatik Türetilen Ölçüler (PDF & UI için)
    public double TotalWidthM => TotalWidthMm / 1000.0;
    public double TotalHeightM => TotalHeightMm / 1000.0;
    public double DiagonalInches => Math.Round(Math.Sqrt(Math.Pow(TotalWidthMm, 2) + Math.Pow(TotalHeightMm, 2)) / 25.4);

    // Çözünürlük & Standartlar
    public string TotalResolution { get; set; } = string.Empty; // Örn: "2800x1800"
    public string AspectRatio { get; set; } = string.Empty;
    public bool IsFullHd { get; set; }
    public bool Is4K { get; set; }

    // Otomatik Hesaplansın: Mpx (MegaPiksel)
    public double TotalPixelsMpx
    {
        get
        {
            if (string.IsNullOrWhiteSpace(TotalResolution) || !TotalResolution.Contains('x'))
                return 0;

            var parts = TotalResolution.ToLower().Replace(" ", "").Split('x');
            if (parts.Length == 2 && double.TryParse(parts[0], out double w) && double.TryParse(parts[1], out double h))
            {
                return Math.Round((w * h) / 1_000_000.0, 2);
            }

            return 0;
        }
    }

    // Teknik Özellikler
    public decimal TotalWeightKg { get; set; }
    public decimal TotalMaxPowerKw { get; set; }
    public decimal TotalAvgPowerKw { get; set; }

    // Otomatik Türetilen Güç & Isı Bilgileri
    public double TotalMaxPowerWatts => (double)TotalMaxPowerKw * 1000.0;
    public double TotalAvgPowerWatts => (double)TotalAvgPowerKw * 1000.0;
    public double HeatDissipationBtu => Math.Round(TotalMaxPowerWatts * 3.412);

    // Fiyat & Tarih
    public decimal TotalPrice { get; set; }
    public DateTime CreatedAt { get; set; }
}