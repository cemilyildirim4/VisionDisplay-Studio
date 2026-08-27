namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Güç kaynağı, mini PC, patch kablosu, alıcı kart ve işlemci oluşturma/güncelleme gövdesi.
/// </summary>
public class HardwareComponentInputDto
{
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public decimal Price { get; set; }
    public decimal PowerDrawWatt { get; set; }
    public decimal HeatDissipationBTU { get; set; }
    public decimal EfficiencyRatio { get; set; } = 1m;
}
