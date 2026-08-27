namespace DisplayConfigurator.Application.DTOs;

/// <summary>Sistem geneli işçilik çarpanı ($USD / m²).</summary>
public class LaborCostMultiplierDto
{
    public decimal Value { get; set; }
    public string Currency { get; set; } = "USD";
    public string Unit { get; set; } = "m²";
}
