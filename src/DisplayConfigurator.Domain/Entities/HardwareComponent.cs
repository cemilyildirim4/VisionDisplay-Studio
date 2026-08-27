namespace DisplayConfigurator.Domain.Entities;

/// <summary>
/// LED duvar donanım kataloğunun ortak alanları.
/// PowerSupply, MiniPc, PatchCable, ReceivingCard ve Processor bu şekli paylaşır.
/// </summary>
public abstract class HardwareComponent
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public decimal Price { get; set; }
    public decimal PowerDrawWatt { get; set; }
    public decimal HeatDissipationBTU { get; set; }
    public decimal EfficiencyRatio { get; set; } = 1m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
