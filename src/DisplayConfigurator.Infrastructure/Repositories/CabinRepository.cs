using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class CabinRepository : ICabinRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public CabinRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<Cabin>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT 
                c.id AS Id,
                c.series_id AS SeriesId,
                s.name AS SeriesName,
                c.model_name AS ModelName,
                c.product_type AS ProductType,
                c.default_modules_per_card AS DefaultModulesPerCard,
                c.pixel_pitch AS PixelPitch,
                c.width_mm AS WidthMm,
                c.height_mm AS HeightMm,
                c.resolution_width AS ResolutionWidth,
                c.resolution_height AS ResolutionHeight,
                c.weight_kg AS WeightKg,
                c.price AS Price,
                c.created_at AS CreatedAt,
                c.max_power_watts AS MaxPowerWatts,
                c.avg_power_watts AS AvgPowerWatts
            FROM cabins c
            LEFT JOIN series s ON c.series_id = s.id
            ORDER BY c.id ASC";

        return await connection.QueryAsync<Cabin>(sql);
    }

    public async Task<Cabin?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT 
                c.id AS Id,
                c.series_id AS SeriesId,
                s.name AS SeriesName,
                c.model_name AS ModelName,
                c.product_type AS ProductType,
                c.default_modules_per_card AS DefaultModulesPerCard,
                c.pixel_pitch AS PixelPitch,
                c.width_mm AS WidthMm,
                c.height_mm AS HeightMm,
                c.resolution_width AS ResolutionWidth,
                c.resolution_height AS ResolutionHeight,
                c.weight_kg AS WeightKg,
                c.price AS Price,
                c.created_at AS CreatedAt,
                c.max_power_watts AS MaxPowerWatts,
                c.avg_power_watts AS AvgPowerWatts
            FROM cabins c
            LEFT JOIN series s ON c.series_id = s.id
            WHERE c.id = @Id";

        return await connection.QueryFirstOrDefaultAsync<Cabin>(sql, new { Id = id });
    }

    public async Task<IEnumerable<Cabin>> GetBySeriesIdAsync(int seriesId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT 
                c.id AS Id,
                c.series_id AS SeriesId,
                s.name AS SeriesName,
                c.model_name AS ModelName,
                c.product_type AS ProductType,
                c.default_modules_per_card AS DefaultModulesPerCard,
                c.pixel_pitch AS PixelPitch,
                c.width_mm AS WidthMm,
                c.height_mm AS HeightMm,
                c.resolution_width AS ResolutionWidth,
                c.resolution_height AS ResolutionHeight,
                c.weight_kg AS WeightKg,
                c.price AS Price,
                c.created_at AS CreatedAt,
                c.max_power_watts AS MaxPowerWatts,
                c.avg_power_watts AS AvgPowerWatts
            FROM cabins c
            LEFT JOIN series s ON c.series_id = s.id
            WHERE c.series_id = @SeriesId 
            ORDER BY c.id ASC";

        return await connection.QueryAsync<Cabin>(sql, new { SeriesId = seriesId });
    }
}