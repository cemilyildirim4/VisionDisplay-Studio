using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class ExportLogRepository : IExportLogRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ExportLogRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ExportLog> CreateAsync(ExportLog log)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO export_logs (user_id, user_name, company_name, model_code, kind, created_at)
            VALUES (@UserId, @UserName, @CompanyName, @ModelCode, @Kind, NOW())
            RETURNING id;";
        log.Id = await connection.ExecuteScalarAsync<int>(sql, log);
        return log;
    }

    public async Task<IEnumerable<ExportLog>> GetRecentAsync(int limit)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id AS Id, user_id AS UserId, user_name AS UserName, company_name AS CompanyName,
                   model_code AS ModelCode, kind AS Kind, created_at AS CreatedAt
            FROM export_logs
            ORDER BY created_at DESC
            LIMIT @Limit";
        return await connection.QueryAsync<ExportLog>(sql, new { Limit = limit });
    }

    public async Task<int> CountByKindAsync(string kind)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = "SELECT COUNT(1) FROM export_logs WHERE kind = @Kind";
        return await connection.ExecuteScalarAsync<int>(sql, new { Kind = kind });
    }
}
