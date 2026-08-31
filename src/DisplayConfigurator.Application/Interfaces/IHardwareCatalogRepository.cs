using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

/// <summary>
/// Güç kaynağı, mini PC, patch kablosu, alıcı kart ve işlemci katalog CRUD.
/// Her tipin kendi sütun kümesi vardır.
/// </summary>
public interface IHardwareCatalogRepository
{
    Task<IEnumerable<PowerSupply>> GetPowerSuppliesAsync();
    Task<PowerSupply?> GetPowerSupplyByIdAsync(int id);
    Task<PowerSupply> CreatePowerSupplyAsync(PowerSupply item);
    Task<bool> UpdatePowerSupplyAsync(PowerSupply item);
    Task<bool> DeletePowerSupplyAsync(int id);
    Task<int> CountPowerSupplyReferencesAsync(int id);

    Task<IEnumerable<MiniPc>> GetMiniPcsAsync();
    Task<MiniPc?> GetMiniPcByIdAsync(int id);
    Task<MiniPc> CreateMiniPcAsync(MiniPc item);
    Task<bool> UpdateMiniPcAsync(MiniPc item);
    Task<bool> DeleteMiniPcAsync(int id);
    Task<int> CountMiniPcReferencesAsync(int id);

    Task<IEnumerable<PatchCable>> GetPatchCablesAsync();
    Task<PatchCable?> GetPatchCableByIdAsync(int id);
    Task<PatchCable> CreatePatchCableAsync(PatchCable item);
    Task<bool> UpdatePatchCableAsync(PatchCable item);
    Task<bool> DeletePatchCableAsync(int id);
    Task<int> CountPatchCableReferencesAsync(int id);

    Task<IEnumerable<ReceivingCard>> GetReceivingCardsAsync();
    Task<ReceivingCard?> GetReceivingCardByIdAsync(int id);
    Task<ReceivingCard> CreateReceivingCardAsync(ReceivingCard item);
    Task<bool> UpdateReceivingCardAsync(ReceivingCard item);
    Task<bool> DeleteReceivingCardAsync(int id);
    Task<int> CountReceivingCardReferencesAsync(int id);

    Task<IEnumerable<Processor>> GetProcessorsAsync();
    Task<Processor?> GetProcessorByIdAsync(int id);
    Task<Processor> CreateProcessorAsync(Processor item);
    Task<bool> UpdateProcessorAsync(Processor item);
    Task<bool> DeleteProcessorAsync(int id);
    Task<int> CountProcessorReferencesAsync(int id);
}
