using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class FeedbackRepository : IFeedbackRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public FeedbackRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<FeedbackReport>> GetAllAsync(int limit, bool onlyOpen = false)
    {
        using var connection = _connectionFactory.CreateConnection();
        string sql = $@"
            SELECT
                id AS Id,
                note AS Note,
                role AS Role,
                page_url AS PageUrl,
                user_agent AS UserAgent,
                resolved AS Resolved,
                created_at AS CreatedAt
            FROM feedback_reports
            {(onlyOpen ? "WHERE resolved = false" : string.Empty)}
            ORDER BY created_at DESC
            LIMIT @Limit";

        return await connection.QueryAsync<FeedbackReport>(sql, new { Limit = limit });
    }

    public async Task<FeedbackReport> CreateAsync(FeedbackReport report)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            INSERT INTO feedback_reports (note, role, page_url, user_agent, resolved, created_at)
            VALUES (@Note, @Role, @PageUrl, @UserAgent, false, NOW())
            RETURNING id;";

        report.Id = await connection.ExecuteScalarAsync<int>(sql, report);
        return report;
    }

    public async Task<bool> SetResolvedAsync(int id, bool resolved)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "UPDATE feedback_reports SET resolved = @Resolved WHERE id = @Id;";
        return await connection.ExecuteAsync(sql, new { Id = id, Resolved = resolved }) > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "DELETE FROM feedback_reports WHERE id = @Id;";
        return await connection.ExecuteAsync(sql, new { Id = id }) > 0;
    }
}
