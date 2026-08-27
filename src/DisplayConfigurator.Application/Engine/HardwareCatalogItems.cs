using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// Hesap motoruna enjekte edilen katalog kayıtları. Null olan kalem
/// adet hesabına girer ama birim fiyatı 0 kabul edilir.
/// </summary>
public sealed class HardwareCatalogItems
{
    public Processor? Processor { get; init; }
    public PowerSupply? PowerSupply { get; init; }
    public MiniPc? MiniPc { get; init; }
    public PatchCable? PatchCable { get; init; }
    public ReceivingCard? ReceivingCard { get; init; }
}
