namespace DisplayConfigurator.Domain.Entities;

/// <summary>İşlemci / gönderici kart katalog kaydı.</summary>
public class Processor : HardwareComponent
{
    /// <summary>Bir Ethernet portunun taşıyabileceği maksimum piksel (varsayılan 650.000).</summary>
    public int MaxPixelCapacityPerPort { get; set; } = 650_000;

    /// <summary>Bir portun maksimum yatay çözünürlüğü (px).</summary>
    public int MaxPortWidth { get; set; } = 4096;

    /// <summary>Bir portun maksimum dikey çözünürlüğü (px).</summary>
    public int MaxPortHeight { get; set; } = 4096;

    /// <summary>Ethernet (RJ45) çıkış portu sayısı.</summary>
    public int EthernetPortCount { get; set; }

    /// <summary>Giriş portları (ör. "HDMI 2.0 ×2, DP 1.4 ×1").</summary>
    public string? InputPortsInfo { get; set; }

    /// <summary>Güç çekişi (Watt).</summary>
    public decimal PowerDrawWatt { get; set; }
}
