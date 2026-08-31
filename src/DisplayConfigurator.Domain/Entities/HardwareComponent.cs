namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// Donanım kataloğunun ortak alanları (ad, model, fiyat).
/// Tipine özel teknik parametreler alt sınıflardadır.
/// </summary>
public abstract class HardwareComponent
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
