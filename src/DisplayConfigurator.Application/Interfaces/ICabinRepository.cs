using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface ICabinRepository
{
    Task<IEnumerable<Cabin>> GetAllAsync();
    Task<Cabin?> GetByIdAsync(int id);
    Task<IEnumerable<Cabin>> GetBySeriesIdAsync(int seriesId);
}