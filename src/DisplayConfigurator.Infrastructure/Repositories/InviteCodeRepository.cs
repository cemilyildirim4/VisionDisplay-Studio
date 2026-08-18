using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class InviteCodeRepository : IInviteCodeRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public InviteCodeRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<InviteCode?> GetByCodeAsync(string code)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id AS Id, code AS Code, max_uses AS MaxUses, used_count AS UsedCount,
                   expires_at AS ExpiresAt, created_at AS CreatedAt
            FROM invite_codes WHERE upper(code) = upper(@Code)";
        return await connection.QueryFirstOrDefaultAsync<InviteCode>(sql, new { Code = code });
    }

    /// <summary>
    /// Atomik "kullan" işlemi: kapasite ve süre kontrolü tek UPDATE ... WHERE
    /// içinde yapılır, böylece iki istek aynı anda son hakkı yakalayamaz
    /// (race condition'a karşı veritabanı seviyesinde koruma).
    /// </summary>
    public async Task<bool> TryRedeemAsync(string code)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE invite_codes
            SET used_count = used_count + 1
            WHERE upper(code) = upper(@Code)
              AND used_count < max_uses
              AND (expires_at IS NULL OR expires_at > NOW())
            RETURNING id;";
        var id = await connection.ExecuteScalarAsync<int?>(sql, new { Code = code });
        return id.HasValue;
    }

    public async Task<IEnumerable<InviteCode>> GetAllAsync()
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id AS Id, code AS Code, max_uses AS MaxUses, used_count AS UsedCount,
                   expires_at AS ExpiresAt, created_at AS CreatedAt
            FROM invite_codes ORDER BY created_at DESC";
        return await connection.QueryAsync<InviteCode>(sql);
    }

    public async Task<InviteCode> CreateAsync(InviteCode invite)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO invite_codes (code, max_uses, used_count, expires_at, created_at)
            VALUES (@Code, @MaxUses, 0, @ExpiresAt, NOW())
            RETURNING id;";
        invite.Id = await connection.ExecuteScalarAsync<int>(sql, invite);
        return invite;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = "DELETE FROM invite_codes WHERE id = @Id";
        var rows = await connection.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }
}
