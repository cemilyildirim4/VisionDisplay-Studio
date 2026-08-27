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
}
