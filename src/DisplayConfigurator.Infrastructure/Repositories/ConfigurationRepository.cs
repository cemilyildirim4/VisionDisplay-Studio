using Dapper;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class ConfigurationRepository : IConfigurationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    // NOT: assembly_type/modules_per_card/receiving_card_count/required_rj45_ports/
    // recommended_processor sütunları önceden burada eksikti — motor bu değerleri
    // hesaplıyordu ama SELECT/INSERT'e dahil edilmediği için ilk yanıttan sonra
    // (sayfa yenilenince) kayboluyorlardı. Aşağıda düzeltildi.
    private const string SelectColumns = @"
        cfg.id AS Id,
        cfg.title AS ProjectName,
        cfg.customer_name AS CustomerName,
        cfg.cabin_id AS CabinId,
        cfg.assembly_type AS AssemblyType,
        cfg.modules_per_card AS ModulesPerCard,
        cfg.receiving_card_count AS ReceivingCardCount,
        cfg.required_rj45_ports AS RequiredRj45Ports,
        cfg.recommended_processor AS RecommendedProcessor,
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
        cfg.status AS Status,
        cfg.revision AS Revision,
        cfg.user_id AS UserId,
        cfg.created_at AS CreatedAt";

    public ConfigurationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PagedResultDto<Configuration>> GetPagedAsync(PagedQueryDto query)
    {
        using var connection = _connectionFactory.CreateConnection();

        var hasSearch = !string.IsNullOrWhiteSpace(query.Search);
        var whereClause = hasSearch
            ? "WHERE cfg.title ILIKE @Search OR cfg.customer_name ILIKE @Search"
            : string.Empty;

        var countSql = $"SELECT COUNT(1) FROM configurations cfg {whereClause}";
        var dataSql = $@"
            SELECT
                {SelectColumns},
                cab.id AS Id,
                cab.model_code AS ModelCode,
                cab.price AS Price
            FROM configurations cfg
            LEFT JOIN cabins cab ON cfg.cabin_id = cab.id
            {whereClause}
            ORDER BY cfg.created_at DESC
            OFFSET @Offset LIMIT @PageSize";

        var parameters = new
        {
            Search = hasSearch ? $"%{query.Search}%" : null,
            Offset = (query.Page - 1) * query.PageSize,
            query.PageSize,
        };

        var total = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = await connection.QueryAsync<Configuration, Cabin, Configuration>(
            dataSql,
            (config, cabin) => { config.Cabin = cabin; return config; },
            parameters,
            splitOn: "Id");

        return new PagedResultDto<Configuration>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<IEnumerable<Configuration>> GetByUserIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = $@"
            SELECT {SelectColumns}, cab.id AS Id, cab.model_code AS ModelCode, cab.price AS Price
            FROM configurations cfg
            LEFT JOIN cabins cab ON cfg.cabin_id = cab.id
            WHERE cfg.user_id = @UserId
            ORDER BY cfg.created_at DESC";

        return await connection.QueryAsync<Configuration, Cabin, Configuration>(
            sql,
            (config, cabin) => { config.Cabin = cabin; return config; },
            new { UserId = userId },
            splitOn: "Id");
    }

    public async Task<Configuration?> GetByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = $@"
            SELECT {SelectColumns}, cab.id AS Id, cab.model_code AS ModelCode, cab.price AS Price
            FROM configurations cfg
            LEFT JOIN cabins cab ON cfg.cabin_id = cab.id
            WHERE cfg.id = @Id";

        var result = await connection.QueryAsync<Configuration, Cabin, Configuration>(
            sql,
            (config, cabin) => { config.Cabin = cabin; return config; },
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
                assembly_type,
                modules_per_card,
                receiving_card_count,
                required_rj45_ports,
                recommended_processor,
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
                status,
                revision,
                user_id,
                created_at
            )
            VALUES 
            (
                @ProjectName, 
                @CustomerName, 
                @CabinId, 
                @AssemblyType,
                @ModulesPerCard,
                @ReceivingCardCount,
                @RequiredRj45Ports,
                @RecommendedProcessor,
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
                @Status,
                @Revision,
                @UserId,
                COALESCE(@CreatedAt, NOW())
            )
            RETURNING id;";

        return await connection.ExecuteScalarAsync<int>(sql, config);
    }

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

    public async Task<bool> UpdateStatusAsync(int id, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "UPDATE configurations SET status = @Status, revision = revision + 1 WHERE id = @Id";
        var rows = await connection.ExecuteAsync(sql, new { Id = id, Status = status });
        return rows > 0;
    }
}
