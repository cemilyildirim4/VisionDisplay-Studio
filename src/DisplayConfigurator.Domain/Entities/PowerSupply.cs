namespace DisplayConfigurator.Domain.Entities;

/// <summary>Güç kaynağı katalog kaydı.</summary>
public class PowerSupply : HardwareComponent
{
    /// <summary>Çıkış gerilimi (V).</summary>
    public decimal OutputVoltage { get; set; }

    /// <summary>Maksimum çıkış gücü (Watt).</summary>
    public decimal MaxPowerOutputWatt { get; set; }

    /// <summary>Verim oranı (0–1, örn. 0.92 = %92). Hesap motoru PSU kayıplarında kullanır.</summary>
    public decimal EfficiencyRatio { get; set; } = 1m;

    /// <summary>Isı yayılımı (BTU).</summary>
    public decimal HeatDissipationBtu { get; set; }
}
