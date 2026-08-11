using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public RefreshTokenRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<RefreshToken> CreateAsync(RefreshToken token)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            INSERT INTO refresh_tokens (user_id, token, expires_at, created_at, revoked)
            VALUES (@UserId, @Token, @ExpiresAt, NOW(), false)
            RETURNING id;";
        token.Id = await connection.ExecuteScalarAsync<int>(sql, token);
        return token;
    }

    public async Task<RefreshToken?> GetActiveAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT id AS Id, user_id AS UserId, token AS Token, expires_at AS ExpiresAt,
                   created_at AS CreatedAt, revoked AS Revoked
            FROM refresh_tokens
            WHERE token = @Token AND revoked = false AND expires_at > NOW()";
        return await connection.QueryFirstOrDefaultAsync<RefreshToken>(sql, new { Token = token });
    }

    public async Task<bool> RevokeAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "UPDATE refresh_tokens SET revoked = true WHERE token = @Token";
        var rows = await connection.ExecuteAsync(sql, new { Token = token });
        return rows > 0;
    }
}
