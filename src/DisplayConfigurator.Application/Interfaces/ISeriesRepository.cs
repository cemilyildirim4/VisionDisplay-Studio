using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface ISeriesRepository
{
    Task<IEnumerable<Series>> GetAllAsync();
    Task<bool> ExistsAsync(int id);
    Task<Series> CreateAsync(Series series);
    Task<bool> UpdateAsync(Series series);
    Task<bool> DeleteAsync(int id);
    /// <summary>Bir seriye bağlı kabin/panel var mı — silmeden önce güvenlik kontrolü için.</summary>
    Task<int> CountCabinsAsync(int seriesId);
}
