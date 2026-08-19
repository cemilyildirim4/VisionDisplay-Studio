using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(int id);
    Task<IEnumerable<User>> GetAllAsync();
    Task<User> CreateAsync(User user);
    Task<bool> UpdateRoleAsync(int id, string role);
    Task<bool> UpdatePasswordHashAsync(int id, string passwordHash);
    Task<bool> DeleteAsync(int id);
    Task<bool> AnyAdminExistsAsync();
    Task<User?> GetFirstAdminAsync();
}
