namespace DisplayConfigurator.Application.DTOs;

/// <summary>Donanım kataloğu oluşturma/güncelleme gövdelerinin ortak alanları.</summary>
public abstract class HardwareComponentInputDto
{
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public decimal Price { get; set; }
}

public class PowerSupplyInputDto : HardwareComponentInputDto
{
    public decimal OutputVoltage { get; set; }
    public decimal MaxPowerOutputWatt { get; set; }
    /// <summary>0–1 (ör. 0.92 = %92). Form yüzde gönderirse sunucu 100'e böler.</summary>
    public decimal EfficiencyRatio { get; set; } = 1m;
    public decimal HeatDissipationBtu { get; set; }
    /// <summary>Çıkış akımı (Amper).</summary>
    public decimal Amperage { get; set; }
}

public class MiniPcInputDto : HardwareComponentInputDto
{
    public string? CpuRamInfo { get; set; }
    public string? Storage { get; set; }
    public string? OperatingSystem { get; set; }
    public string? MaxSupportedResolution { get; set; }
    public decimal PowerDrawWatt { get; set; }
}

public class PatchCableInputDto : HardwareComponentInputDto
{
    public string? CableType { get; set; }
    public decimal LengthMeters { get; set; }
    public string? ConnectorType { get; set; }
}

public class ReceivingCardInputDto : HardwareComponentInputDto
{
    public int MaxPixelWidth { get; set; }
    public int MaxPixelHeight { get; set; }
    public int HubPortCount { get; set; }
    public decimal PowerDrawWatt { get; set; }
}

public class ProcessorInputDto : HardwareComponentInputDto
{
    public decimal MaxPixelCapacityMpx { get; set; }
    public int EthernetPortCount { get; set; }
    public string? InputPortsInfo { get; set; }
    public decimal PowerDrawWatt { get; set; }
}
