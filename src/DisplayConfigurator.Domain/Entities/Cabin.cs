namespace DisplayConfigurator.Domain.Entities;

public class Cabin
{
    public int Id { get; set; }
    public int SeriesId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    
    // YENİ: CABINET veya MODULE
    public string ProductType { get; set; } = "CABINET"; 
    // YENİ: Modül ise 1 alıcı karta kaç modül bağlanacak? (Örn: 10)
    public int DefaultModulesPerCard { get; set; } = 10;

    public decimal PixelPitch { get; set; }
    public int WidthMm { get; set; }
    public int HeightMm { get; set; }
    public int ResolutionWidth { get; set; }
    public int ResolutionHeight { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal MaxPowerWatts { get; set; } 
    public decimal AvgPowerWatts { get; set; }
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; }

    public Series? Series { get; set; }
}