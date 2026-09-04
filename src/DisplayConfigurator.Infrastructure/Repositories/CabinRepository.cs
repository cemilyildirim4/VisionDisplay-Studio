using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class CabinRepository : ICabinRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    private const string SelectColumns = @"
        c.id AS Id,
        c.series_id AS SeriesId,
        c.category AS Category,
        c.name AS Name,
        c.model_code AS ModelCode,
        c.product_type AS ProductType,
        c.default_modules_per_card AS DefaultModulesPerCard,
        c.price AS Price,
        c.pixel_pitch_mm AS PixelPitchMm,
        c.width_mm AS WidthMm,
        c.height_mm AS HeightMm,
        c.depth_mm AS DepthMm,
        c.weight_kg AS WeightKg,
        c.pixel_width AS PixelWidth,
        c.pixel_height AS PixelHeight,
        c.brightness_nits AS BrightnessNits,
        c.refresh_rate_hz AS RefreshRateHz,
        c.power_typical_watts AS PowerTypicalWatts,
        c.power_max_watts AS PowerMaxWatts,
        c.supply_voltage AS SupplyVoltage,
        c.viewing_distance_m AS ViewingDistanceM,
        c.size_inch AS SizeInch,
        c.bezel_mm AS BezelMm,
        c.filter_category AS FilterCategory,
        c.usage AS Usage,
        c.installation AS Installation,
        c.configurable AS Configurable,
        c.service AS Service,
        c.led_type AS LedType,
        c.protection AS Protection,
        c.certification AS Certification,
        c.features AS Features,
        c.ip_rating AS IpRating,
        c.featured AS Featured,
        c.image_url AS ImageUrl,
        c.sbox_code AS SboxCode,
        c.jig_code AS JigCode,
        c.power_cord_110_code AS PowerCord110Code,
        c.power_cord_220_code AS PowerCord220Code,
        c.created_at AS CreatedAt,
        s.id AS Id,
        s.name AS Name,
        s.description AS Description,
        s.created_at AS CreatedAt";

    public CabinRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private static Cabin MapWithSeries(Cabin cabin, Series series)
    {
        cabin.Series = series?.Id > 0 ? series : null;
        return cabin;
    }

    public async Task<IEnumerable<Cabin>> GetAllAsync(string? category = null, string? productType = null)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        string sql = $@"
            SELECT {SelectColumns}
            FROM cabins c
            LEFT JOIN series s ON c.series_id = s.id
            WHERE (@Category IS NULL OR c.category = @Category)
              AND (@ProductType IS NULL OR UPPER(c.product_type) = UPPER(@ProductType))
            ORDER BY c.id ASC";

        var cabins = await connection.QueryAsync<Cabin, Series, Cabin>(
            sql,
            MapWithSeries,
            new { Category = category, ProductType = productType },
            splitOn: "Id");

        return cabins;
    }

    public async Task<Cabin?> GetByIdAsync(int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        string sql = $@"
            SELECT {SelectColumns}
            FROM cabins c
            LEFT JOIN series s ON c.series_id = s.id
            WHERE c.id = @Id";

        var result = await connection.QueryAsync<Cabin, Series, Cabin>(
            sql,
            MapWithSeries,
            new { Id = id },
            splitOn: "Id");

        return result.FirstOrDefault();
    }

    public async Task<IEnumerable<Cabin>> GetBySeriesIdAsync(int seriesId)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        string sql = $@"
            SELECT {SelectColumns}
            FROM cabins c
            LEFT JOIN series s ON c.series_id = s.id
            WHERE c.series_id = @SeriesId
            ORDER BY c.id ASC";

        var cabins = await connection.QueryAsync<Cabin, Series, Cabin>(
            sql,
            MapWithSeries,
            new { SeriesId = seriesId },
            splitOn: "Id");

        return cabins;
    }

    public async Task<Cabin> CreateAsync(Cabin cabin)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO cabins
            (
                series_id, category, name, model_code, product_type, default_modules_per_card, price,
                pixel_pitch_mm, width_mm, height_mm, depth_mm, weight_kg,
                pixel_width, pixel_height, brightness_nits, refresh_rate_hz,
                power_typical_watts, power_max_watts, supply_voltage, viewing_distance_m, size_inch, bezel_mm,
                filter_category, usage, installation, configurable, service,
                led_type, protection, certification, features,
                ip_rating, featured,
                image_url, sbox_code, jig_code, power_cord_110_code, power_cord_220_code,
                created_at
            )
            VALUES
            (
                @SeriesId, @Category, @Name, @ModelCode, @ProductType, @DefaultModulesPerCard, @Price,
                @PixelPitchMm, @WidthMm, @HeightMm, @DepthMm, @WeightKg,
                @PixelWidth, @PixelHeight, @BrightnessNits, @RefreshRateHz,
                @PowerTypicalWatts, @PowerMaxWatts, @SupplyVoltage, @ViewingDistanceM, @SizeInch, @BezelMm,
                @FilterCategory, @Usage, @Installation, @Configurable, @Service,
                @LedType, @Protection, @Certification, @Features,
                @IpRating, @Featured,
                @ImageUrl, @SboxCode, @JigCode, @PowerCord110Code, @PowerCord220Code,
                NOW()
            )
            RETURNING id;";

        var id = await connection.ExecuteScalarAsync<int>(sql, cabin);
        cabin.Id = id;
        return cabin;
    }

    public async Task<bool> UpdateAsync(Cabin cabin)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE cabins SET
                series_id = @SeriesId,
                category = @Category,
                name = @Name,
                model_code = @ModelCode,
                product_type = @ProductType,
                default_modules_per_card = @DefaultModulesPerCard,
                price = @Price,
                pixel_pitch_mm = @PixelPitchMm,
                width_mm = @WidthMm,
                height_mm = @HeightMm,
                depth_mm = @DepthMm,
                weight_kg = @WeightKg,
                pixel_width = @PixelWidth,
                pixel_height = @PixelHeight,
                brightness_nits = @BrightnessNits,
                refresh_rate_hz = @RefreshRateHz,
                power_typical_watts = @PowerTypicalWatts,
                power_max_watts = @PowerMaxWatts,
                supply_voltage = @SupplyVoltage,
                viewing_distance_m = @ViewingDistanceM,
                size_inch = @SizeInch,
                bezel_mm = @BezelMm,
                filter_category = @FilterCategory,
                usage = @Usage,
                installation = @Installation,
                configurable = @Configurable,
                service = @Service,
                led_type = @LedType,
                protection = @Protection,
                certification = @Certification,
                features = @Features,
                ip_rating = @IpRating,
                featured = @Featured,
                image_url = @ImageUrl,
                sbox_code = @SboxCode,
                jig_code = @JigCode,
                power_cord_110_code = @PowerCord110Code,
                power_cord_220_code = @PowerCord220Code
            WHERE id = @Id";

        var rowsAffected = await connection.ExecuteAsync(sql, cabin);
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = "DELETE FROM cabins WHERE id = @Id";
        var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
        return rowsAffected > 0;
    }

    public async Task<int> CountConfigurationsAsync(int cabinId)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = "SELECT COUNT(1) FROM configurations WHERE cabin_id = @Id";
        return await connection.ExecuteScalarAsync<int>(sql, new { Id = cabinId });
    }

    public async Task<bool> ModelCodeExistsAsync(string modelCode, int? excludeId)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT COUNT(1) FROM cabins
            WHERE model_code = @ModelCode AND (@ExcludeId IS NULL OR id <> @ExcludeId)";

        var count = await connection.ExecuteScalarAsync<int>(sql, new { ModelCode = modelCode, ExcludeId = excludeId });
        return count > 0;
    }
}
