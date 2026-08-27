using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

/// <summary>
/// Güç kaynağı, mini PC, patch kablosu, alıcı kart ve işlemci katalog okuması.
/// Mevcut ICabinRepository / IQuoteRepository / IConfigurationRepository sözleşmelerini değiştirmez.
/// </summary>
public interface IHardwareCatalogRepository
{
    Task<IEnumerable<PowerSupply>> GetPowerSuppliesAsync();
    Task<PowerSupply?> GetPowerSupplyByIdAsync(int id);

    Task<IEnumerable<MiniPc>> GetMiniPcsAsync();
    Task<MiniPc?> GetMiniPcByIdAsync(int id);

    Task<IEnumerable<PatchCable>> GetPatchCablesAsync();
    Task<PatchCable?> GetPatchCableByIdAsync(int id);

    Task<IEnumerable<ReceivingCard>> GetReceivingCardsAsync();
    Task<ReceivingCard?> GetReceivingCardByIdAsync(int id);

    Task<IEnumerable<Processor>> GetProcessorsAsync();
    Task<Processor?> GetProcessorByIdAsync(int id);
}
