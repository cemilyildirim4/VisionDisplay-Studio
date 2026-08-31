namespace DisplayConfigurator.Domain.Entities;

/// <summary>İşlemci / gönderici kart katalog kaydı.</summary>
public class Processor : HardwareComponent
{
    /// <summary>Maksimum piksel kapasitesi (milyon piksel).</summary>
    public decimal MaxPixelCapacityMpx { get; set; }

    /// <summary>Ethernet (RJ45) çıkış portu sayısı.</summary>
    public int EthernetPortCount { get; set; }

    /// <summary>Giriş portları (ör. "HDMI 2.0 ×2, DP 1.4 ×1").</summary>
    public string? InputPortsInfo { get; set; }

    /// <summary>Güç çekişi (Watt).</summary>
    public decimal PowerDrawWatt { get; set; }
}
