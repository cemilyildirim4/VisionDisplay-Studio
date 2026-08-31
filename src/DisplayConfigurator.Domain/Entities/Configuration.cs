namespace DisplayConfigurator.Domain.Entities;

public class Configuration
{
    public int Id { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public decimal? WallWidthM { get; set; }
    public decimal? WallHeightM { get; set; }
    /// <summary>"single" veya "multi"</summary>
    public string? ScreenMode { get; set; }
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

    /// <summary>"Taslak" | "Beklemede" | "Onaylandı" | "Reddedildi" — teklif süreç takibi.</summary>
    public string Status { get; set; } = "Taslak";

    /// <summary>Proje yeniden hesaplanıp kaydedildikçe artan sürüm numarası.</summary>
    public int Revision { get; set; } = 1;

    /// <summary>Giriş yapmış bir bayi/müşteri kaydettiyse hesabı — misafir kayıtlarında null.</summary>
    public int? UserId { get; set; }

    /// <summary>Yapılandırmaya mini PC dahil edilsin mi.</summary>
    public bool HasMiniPc { get; set; }

    /// <summary>İşçilik maliyeti çarpanı (1.00 = standart).</summary>
    public decimal LaborCostMultiplier { get; set; } = 1m;

    public int? PowerSupplyId { get; set; }
    public int? MiniPcId { get; set; }
    public int? PatchCableId { get; set; }
    public int? ReceivingCardId { get; set; }
    public int? ProcessorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Cabin? Cabin { get; set; }
    public PowerSupply? PowerSupply { get; set; }
    public MiniPc? MiniPc { get; set; }
    public PatchCable? PatchCable { get; set; }
    public ReceivingCard? ReceivingCard { get; set; }
    public Processor? Processor { get; set; }
}