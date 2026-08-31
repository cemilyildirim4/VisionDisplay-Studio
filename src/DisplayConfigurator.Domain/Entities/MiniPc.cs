namespace DisplayConfigurator.Domain.Entities;

/// <summary>Mini PC katalog kaydı. Konfigürasyonda <c>HasMiniPc</c> ile birlikte seçilir.</summary>
public class MiniPc : HardwareComponent
{
    /// <summary>İşlemci / RAM özeti (ör. "Intel N100 / 8 GB").</summary>
    public string? CpuRamInfo { get; set; }

    /// <summary>Depolama (ör. "256 GB SSD").</summary>
    public string? Storage { get; set; }

    /// <summary>İşletim sistemi.</summary>
    public string? OperatingSystem { get; set; }

    /// <summary>Desteklenen maksimum çözünürlük (ör. "3840x2160").</summary>
    public string? MaxSupportedResolution { get; set; }

    /// <summary>Güç çekişi (Watt).</summary>
    public decimal PowerDrawWatt { get; set; }
}
