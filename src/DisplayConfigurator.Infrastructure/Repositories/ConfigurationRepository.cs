using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class ConfigurationRepository : IConfigurationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ConfigurationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<Configuration>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT 
                cfg.id AS Id,
                cfg.title AS ProjectName,
                cfg.customer_name AS CustomerName,
                cfg.cabin_id AS CabinId,
                cfg.total_columns AS Cols,
                cfg.total_rows AS Rows,
                cfg.total_width_mm AS TotalWidthMm,
                cfg.total_height_mm AS TotalHeightMm,
                cfg.total_resolution AS TotalResolution,
                cfg.total_weight_kg AS TotalWeightKg,
                cfg.total_max_power_kw AS TotalMaxPowerKw,
                cfg.total_avg_power_kw AS TotalAvgPowerKw,
                cfg.aspect_ratio AS AspectRatio,
                cfg.is_full_hd AS IsFullHd,
                cfg.is_4k AS Is4K,
                cfg.total_price AS TotalPrice,
                cfg.created_at AS CreatedAt,
                cab.id AS Id,
                cab.model_name AS ModelName,
                cab.price AS Price
            FROM configurations cfg
            LEFT JOIN cabins cab ON cfg.cabin_id = cab.id
            ORDER BY cfg.created_at DESC";

        return await connection.QueryAsync<Configuration, Cabin, Configuration>(
            sql,
            (config, cabin) =>
            {
                config.Cabin = cabin;
                return config;
            },
            splitOn: "Id"
        );
    }

    public async Task<Configuration?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            SELECT 
                cfg.id AS Id,
                cfg.title AS ProjectName,
                cfg.customer_name AS CustomerName,
                cfg.cabin_id AS CabinId,
                cfg.total_columns AS Cols,
                cfg.total_rows AS Rows,
                cfg.total_width_mm AS TotalWidthMm,
                cfg.total_height_mm AS TotalHeightMm,
                cfg.total_resolution AS TotalResolution,
                cfg.total_weight_kg AS TotalWeightKg,
                cfg.total_max_power_kw AS TotalMaxPowerKw,
                cfg.total_avg_power_kw AS TotalAvgPowerKw,
                cfg.aspect_ratio AS AspectRatio,
                cfg.is_full_hd AS IsFullHd,
                cfg.is_4k AS Is4K,
                cfg.total_price AS TotalPrice,
                cfg.created_at AS CreatedAt,
                cab.id AS Id,
                cab.model_name AS ModelName,
                cab.price AS Price
            FROM configurations cfg
            LEFT JOIN cabins cab ON cfg.cabin_id = cab.id
            WHERE cfg.id = @Id";

        var result = await connection.QueryAsync<Configuration, Cabin, Configuration>(
            sql,
            (config, cabin) =>
            {
                config.Cabin = cabin;
                return config;
            },
            new { Id = id },
            splitOn: "Id"
        );

        return result.FirstOrDefault();
    }

    public async Task<int> CreateAsync(Configuration config)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string sql = @"
            INSERT INTO configurations 
            (
                title, 
                customer_name, 
                cabin_id, 
                total_columns, 
                total_rows, 
                total_width_mm, 
                total_height_mm, 
                total_resolution, 
                total_weight_kg, 
                total_max_power_kw, 
                total_avg_power_kw, 
                aspect_ratio, 
                is_full_hd, 
                is_4k, 
                total_price, 
                created_at
            )
            VALUES 
            (
                @ProjectName, 
                @CustomerName, 
                @CabinId, 
                @Cols, 
                @Rows, 
                @TotalWidthMm, 
                @TotalHeightMm, 
                @TotalResolution, 
                @TotalWeightKg, 
                @TotalMaxPowerKw, 
                @TotalAvgPowerKw, 
                @AspectRatio, 
                @IsFullHd, 
                @Is4K, 
                @TotalPrice, 
                COALESCE(@CreatedAt, NOW())
            )
            RETURNING id;";

        return await connection.ExecuteScalarAsync<int>(sql, config);
    }

    // YENİ: Alt Alta Düzenlenmiş Silme Metodu
    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        const string sql = @"
            DELETE FROM configurations 
            WHERE id = @Id;";

        var rowsAffected = await connection.ExecuteAsync(
            sql, 
            new { Id = id }
        );

        return rowsAffected > 0;
    }
}