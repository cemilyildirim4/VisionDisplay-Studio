using System.Globalization;
using Dapper;
using DisplayConfigurator.Application.Interfaces;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class SystemSettingsRepository : ISystemSettingsRepository
{
    public const string LaborCostMultiplierKey = "labor_cost_multiplier";

    private readonly IDbConnectionFactory _connectionFactory;

    public SystemSettingsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<decimal> GetLaborCostMultiplierAsync()
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var raw = await connection.ExecuteScalarAsync<string?>(
            "SELECT value FROM system_settings WHERE key = @Key",
            new { Key = LaborCostMultiplierKey });

        if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) && value >= 0)
            return value;

        return 1m;
    }

    public async Task SetLaborCostMultiplierAsync(decimal value)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            INSERT INTO system_settings (key, value, updated_at)
            VALUES (@Key, @Value, NOW())
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, updated_at = NOW()",
            new
            {
                Key = LaborCostMultiplierKey,
                Value = value.ToString("0.####", CultureInfo.InvariantCulture),
            });
    }
}
