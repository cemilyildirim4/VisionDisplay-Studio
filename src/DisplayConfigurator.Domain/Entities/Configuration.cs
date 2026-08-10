namespace DisplayConfigurator.Domain.Entities;

public class Configuration
{
    public int Id { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public int CabinId { get; set; }
    
    // YENİ: CABINET veya MODULE
    public string AssemblyType { get; set; } = "CABINET";
    // YENİ: Modül sisteminde kullanıcı özel kart kapasitesi belirtebilir
    public int ModulesPerCard { get; set; } = 10;
    // YENİ: Donanım hesaplama sonuçları
    public int ReceivingCardCount { get; set; }
    public int RequiredRj45Ports { get; set; }
    public string RecommendedProcessor { get; set; } = string.Empty;

    public int Cols { get; set; }
    public int Rows { get; set; }
    public int TotalWidthMm { get; set; }
    public int TotalHeightMm { get; set; }
    public string TotalResolution { get; set; } = string.Empty;
    public decimal TotalWeightKg { get; set; }
    public decimal TotalMaxPowerKw { get; set; }
    public decimal TotalAvgPowerKw { get; set; }
    public string AspectRatio { get; set; } = string.Empty;
    public bool IsFullHd { get; set; }
    public bool Is4K { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Cabin? Cabin { get; set; }
}