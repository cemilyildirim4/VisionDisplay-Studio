namespace DisplayConfigurator.Domain.Entities;

/// <summary>Patch kablosu katalog kaydı.</summary>
public class PatchCable : HardwareComponent
{
    /// <summary>Kablo tipi (Cat6, PowerCON vb.).</summary>
    public string? CableType { get; set; }

    /// <summary>Uzunluk (metre).</summary>
    public decimal LengthMeters { get; set; }

    /// <summary>Konektör tipi.</summary>
    public string? ConnectorType { get; set; }
}
