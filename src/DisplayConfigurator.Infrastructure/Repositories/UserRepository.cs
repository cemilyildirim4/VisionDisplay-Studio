using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT id AS Id, email AS Email, password_hash AS PasswordHash, display_name AS DisplayName,
                   role AS Role, external_provider AS ExternalProvider, external_id AS ExternalId,
                   created_at AS CreatedAt
            FROM users WHERE lower(email) = lower(@Email)";
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { Email = email });
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT id AS Id, email AS Email, password_hash AS PasswordHash, display_name AS DisplayName,
                   role AS Role, external_provider AS ExternalProvider, external_id AS ExternalId,
                   created_at AS CreatedAt
            FROM users WHERE id = @Id";
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { Id = id });
    }

    public async Task<User> CreateAsync(User user)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            INSERT INTO users (email, password_hash, display_name, role, external_provider, external_id, created_at)
            VALUES (@Email, @PasswordHash, @DisplayName, @Role, @ExternalProvider, @ExternalId, NOW())
            RETURNING id;";
        user.Id = await connection.ExecuteScalarAsync<int>(sql, user);
        return user;
    }
}
