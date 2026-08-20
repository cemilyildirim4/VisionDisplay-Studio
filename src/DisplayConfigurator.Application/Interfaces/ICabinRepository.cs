using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface ICabinRepository
{
    Task<IEnumerable<Cabin>> GetAllAsync(string? category = null, string? productType = null);
    Task<Cabin?> GetByIdAsync(int id);
    Task<IEnumerable<Cabin>> GetBySeriesIdAsync(int seriesId);
    Task<Cabin> CreateAsync(Cabin cabin);
    Task<bool> UpdateAsync(Cabin cabin);
    Task<bool> DeleteAsync(int id);
    Task<int> CountConfigurationsAsync(int cabinId);
    Task<bool> ModelCodeExistsAsync(string modelCode, int? excludeId);
}
