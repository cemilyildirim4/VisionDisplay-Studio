using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Tests.Fakes;

/// <summary>
/// Gerçek bir Postgres bağlantısı kurmadan servis katmanını test edebilmek
/// için bellek içi sahte (in-memory fake) repository'ler. Dapper/SQL'i test
/// etmiyoruz — bu Infrastructure'ın işi; burada yalnızca ConfigurationService'in
/// motoru doğru çağırıp doğru şekilde kaydettiğini doğruluyoruz.
/// </summary>
public class InMemoryCabinRepository : ICabinRepository
{
    private readonly Dictionary<int, Cabin> _cabins = new();

    public void Seed(Cabin cabin) => _cabins[cabin.Id] = cabin;

    public Task<IEnumerable<Cabin>> GetAllAsync(string? category = null, string? productType = null) =>
        Task.FromResult<IEnumerable<Cabin>>(_cabins.Values
            .Where(c => category == null || c.Category == category)
            .Where(c => productType == null || string.Equals(c.ProductType, productType, StringComparison.OrdinalIgnoreCase))
            .ToList());

    public Task<Cabin?> GetByIdAsync(int id) =>
        Task.FromResult(_cabins.TryGetValue(id, out var c) ? c : null);

    public Task<IEnumerable<Cabin>> GetBySeriesIdAsync(int seriesId) =>
        Task.FromResult<IEnumerable<Cabin>>(_cabins.Values.Where(c => c.SeriesId == seriesId).ToList());

    public Task<Cabin> CreateAsync(Cabin cabin)
    {
        cabin.Id = _cabins.Count + 1;
        _cabins[cabin.Id] = cabin;
        return Task.FromResult(cabin);
    }

    public Task<bool> UpdateAsync(Cabin cabin)
    {
        _cabins[cabin.Id] = cabin;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteAsync(int id) => Task.FromResult(_cabins.Remove(id));

    public Task<int> CountConfigurationsAsync(int cabinId) => Task.FromResult(0);

    public Task<bool> ModelCodeExistsAsync(string modelCode, int? excludeId) =>
        Task.FromResult(_cabins.Values.Any(c => c.ModelCode == modelCode && c.Id != excludeId));
}

public class InMemoryConfigurationRepository : IConfigurationRepository
{
    private readonly List<Configuration> _configurations = new();

    public Task<PagedResultDto<Configuration>> GetPagedAsync(PagedQueryDto query) =>
        Task.FromResult(new PagedResultDto<Configuration>
        {
            Items = _configurations,
            TotalCount = _configurations.Count,
            Page = query.Page,
            PageSize = query.PageSize,
        });

    public Task<IEnumerable<Configuration>> GetByUserIdAsync(int userId) =>
        Task.FromResult<IEnumerable<Configuration>>(_configurations.Where(c => c.UserId == userId).ToList());

    public Task<Configuration?> GetByIdAsync(int id) =>
        Task.FromResult(_configurations.FirstOrDefault(c => c.Id == id));

    public Task<int> CreateAsync(Configuration configuration)
    {
        configuration.Id = _configurations.Count + 1;
        _configurations.Add(configuration);
        return Task.FromResult(configuration.Id);
    }

    public Task<bool> DeleteAsync(int id)
    {
        var item = _configurations.FirstOrDefault(c => c.Id == id);
        if (item == null) return Task.FromResult(false);
        _configurations.Remove(item);
        return Task.FromResult(true);
    }

    public Task<bool> UpdateStatusAsync(int id, string status)
    {
        var item = _configurations.FirstOrDefault(c => c.Id == id);
        if (item == null) return Task.FromResult(false);
        item.Status = status;
        item.Revision += 1;
        return Task.FromResult(true);
    }
}

public class InMemoryHardwareCatalogRepository : IHardwareCatalogRepository
{
    public Dictionary<int, PowerSupply> PowerSupplies { get; } = new();
    public Dictionary<int, MiniPc> MiniPcs { get; } = new();
    public Dictionary<int, PatchCable> PatchCables { get; } = new();
    public Dictionary<int, ReceivingCard> ReceivingCards { get; } = new();
    public Dictionary<int, Processor> Processors { get; } = new();

    public Task<IEnumerable<PowerSupply>> GetPowerSuppliesAsync() =>
        Task.FromResult<IEnumerable<PowerSupply>>(PowerSupplies.Values);
    public Task<PowerSupply?> GetPowerSupplyByIdAsync(int id) =>
        Task.FromResult(PowerSupplies.TryGetValue(id, out var x) ? x : null);

    public Task<IEnumerable<MiniPc>> GetMiniPcsAsync() =>
        Task.FromResult<IEnumerable<MiniPc>>(MiniPcs.Values);
    public Task<MiniPc?> GetMiniPcByIdAsync(int id) =>
        Task.FromResult(MiniPcs.TryGetValue(id, out var x) ? x : null);

    public Task<IEnumerable<PatchCable>> GetPatchCablesAsync() =>
        Task.FromResult<IEnumerable<PatchCable>>(PatchCables.Values);
    public Task<PatchCable?> GetPatchCableByIdAsync(int id) =>
        Task.FromResult(PatchCables.TryGetValue(id, out var x) ? x : null);

    public Task<IEnumerable<ReceivingCard>> GetReceivingCardsAsync() =>
        Task.FromResult<IEnumerable<ReceivingCard>>(ReceivingCards.Values);
    public Task<ReceivingCard?> GetReceivingCardByIdAsync(int id) =>
        Task.FromResult(ReceivingCards.TryGetValue(id, out var x) ? x : null);

    public Task<IEnumerable<Processor>> GetProcessorsAsync() =>
        Task.FromResult<IEnumerable<Processor>>(Processors.Values);
    public Task<Processor?> GetProcessorByIdAsync(int id) =>
        Task.FromResult(Processors.TryGetValue(id, out var x) ? x : null);

    public Task<PowerSupply> CreatePowerSupplyAsync(PowerSupply item) => Create(PowerSupplies, item);
    public Task<bool> UpdatePowerSupplyAsync(PowerSupply item) => Update(PowerSupplies, item);
    public Task<bool> DeletePowerSupplyAsync(int id) => Task.FromResult(PowerSupplies.Remove(id));
    public Task<int> CountPowerSupplyReferencesAsync(int id) => Task.FromResult(0);

    public Task<MiniPc> CreateMiniPcAsync(MiniPc item) => Create(MiniPcs, item);
    public Task<bool> UpdateMiniPcAsync(MiniPc item) => Update(MiniPcs, item);
    public Task<bool> DeleteMiniPcAsync(int id) => Task.FromResult(MiniPcs.Remove(id));
    public Task<int> CountMiniPcReferencesAsync(int id) => Task.FromResult(0);

    public Task<PatchCable> CreatePatchCableAsync(PatchCable item) => Create(PatchCables, item);
    public Task<bool> UpdatePatchCableAsync(PatchCable item) => Update(PatchCables, item);
    public Task<bool> DeletePatchCableAsync(int id) => Task.FromResult(PatchCables.Remove(id));
    public Task<int> CountPatchCableReferencesAsync(int id) => Task.FromResult(0);

    public Task<ReceivingCard> CreateReceivingCardAsync(ReceivingCard item) => Create(ReceivingCards, item);
    public Task<bool> UpdateReceivingCardAsync(ReceivingCard item) => Update(ReceivingCards, item);
    public Task<bool> DeleteReceivingCardAsync(int id) => Task.FromResult(ReceivingCards.Remove(id));
    public Task<int> CountReceivingCardReferencesAsync(int id) => Task.FromResult(0);

    public Task<Processor> CreateProcessorAsync(Processor item) => Create(Processors, item);
    public Task<bool> UpdateProcessorAsync(Processor item) => Update(Processors, item);
    public Task<bool> DeleteProcessorAsync(int id) => Task.FromResult(Processors.Remove(id));
    public Task<int> CountProcessorReferencesAsync(int id) => Task.FromResult(0);

    private static Task<T> Create<T>(Dictionary<int, T> store, T item) where T : HardwareComponent
    {
        item.Id = store.Count == 0 ? 1 : store.Keys.Max() + 1;
        store[item.Id] = item;
        return Task.FromResult(item);
    }

    private static Task<bool> Update<T>(Dictionary<int, T> store, T item) where T : HardwareComponent
    {
        if (!store.ContainsKey(item.Id)) return Task.FromResult(false);
        store[item.Id] = item;
        return Task.FromResult(true);
    }
}

public class InMemorySystemSettingsRepository : ISystemSettingsRepository
{
    public decimal LaborCostMultiplier { get; set; } = 1m;

    public Task<decimal> GetLaborCostMultiplierAsync() => Task.FromResult(LaborCostMultiplier);

    public Task SetLaborCostMultiplierAsync(decimal value)
    {
        LaborCostMultiplier = value;
        return Task.CompletedTask;
    }
}
