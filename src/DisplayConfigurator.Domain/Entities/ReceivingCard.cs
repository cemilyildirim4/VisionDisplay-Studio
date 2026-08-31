namespace DisplayConfigurator.Domain.Entities;

/// <summary>Alıcı kart katalog kaydı.</summary>
public class ReceivingCard : HardwareComponent
{
    /// <summary>Maksimum piksel kapasitesi — genişlik (px).</summary>
    public int MaxPixelWidth { get; set; }

    /// <summary>Maksimum piksel kapasitesi — yükseklik (px).</summary>
    public int MaxPixelHeight { get; set; }

    /// <summary>Hub port sayısı.</summary>
    public int HubPortCount { get; set; }

    /// <summary>Güç çekişi (Watt).</summary>
    public decimal PowerDrawWatt { get; set; }
}
