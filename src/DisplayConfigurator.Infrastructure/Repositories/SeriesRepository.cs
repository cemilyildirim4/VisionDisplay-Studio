using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class SeriesRepository : ISeriesRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SeriesRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<Series>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT
                id AS Id,
                name AS Name,
                description AS Description,
                created_at AS CreatedAt
            FROM series
            ORDER BY id ASC";

        return await connection.QueryAsync<Series>(sql);
    }

    public async Task<bool> ExistsAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "SELECT COUNT(1) FROM series WHERE id = @Id";
        var count = await connection.ExecuteScalarAsync<int>(sql, new { Id = id });
        return count > 0;
    }

    public async Task<Series> CreateAsync(Series series)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            INSERT INTO series (name, description, created_at)
            VALUES (@Name, @Description, NOW())
            RETURNING id;";

        var id = await connection.ExecuteScalarAsync<int>(sql, series);
        series.Id = id;
        return series;
    }

    public async Task<bool> UpdateAsync(Series series)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            UPDATE series SET
                name = @Name,
                description = @Description
            WHERE id = @Id";

        var rowsAffected = await connection.ExecuteAsync(sql, series);
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "DELETE FROM series WHERE id = @Id";
        var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
        return rowsAffected > 0;
    }

    public async Task<int> CountCabinsAsync(int seriesId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "SELECT COUNT(1) FROM cabins WHERE series_id = @SeriesId";
        return await connection.ExecuteScalarAsync<int>(sql, new { SeriesId = seriesId });
    }
}
