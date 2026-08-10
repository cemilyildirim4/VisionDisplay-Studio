using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IConfigurationRepository
{
    Task<IEnumerable<Configuration>> GetAllAsync();
    Task<Configuration?> GetByIdAsync(int id);
    Task<int> CreateAsync(Configuration configuration);
    Task<bool> DeleteAsync(int id); 
}