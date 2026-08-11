using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IConfigurationRepository
{
    Task<PagedResultDto<Configuration>> GetPagedAsync(PagedQueryDto query);
    Task<IEnumerable<Configuration>> GetByUserIdAsync(int userId);
    Task<Configuration?> GetByIdAsync(int id);
    Task<int> CreateAsync(Configuration configuration);
    Task<bool> DeleteAsync(int id);
    Task<bool> UpdateStatusAsync(int id, string status);
}