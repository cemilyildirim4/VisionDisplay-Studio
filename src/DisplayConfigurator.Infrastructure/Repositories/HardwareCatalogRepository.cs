using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class HardwareCatalogRepository : IHardwareCatalogRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    private const string SelectColumns = @"
        id AS Id,
        name AS Name,
        model AS Model,
        price AS Price,
        power_draw_watt AS PowerDrawWatt,
        heat_dissipation_btu AS HeatDissipationBTU,
        efficiency_ratio AS EfficiencyRatio,
        created_at AS CreatedAt";

    public HardwareCatalogRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public Task<IEnumerable<PowerSupply>> GetPowerSuppliesAsync() =>
        QueryAllAsync<PowerSupply>("power_supplies");

    public Task<PowerSupply?> GetPowerSupplyByIdAsync(int id) =>
        QueryByIdAsync<PowerSupply>("power_supplies", id);

    public Task<IEnumerable<MiniPc>> GetMiniPcsAsync() =>
        QueryAllAsync<MiniPc>("mini_pcs");

    public Task<MiniPc?> GetMiniPcByIdAsync(int id) =>
        QueryByIdAsync<MiniPc>("mini_pcs", id);

    public Task<IEnumerable<PatchCable>> GetPatchCablesAsync() =>
        QueryAllAsync<PatchCable>("patch_cables");

    public Task<PatchCable?> GetPatchCableByIdAsync(int id) =>
        QueryByIdAsync<PatchCable>("patch_cables", id);

    public Task<IEnumerable<ReceivingCard>> GetReceivingCardsAsync() =>
        QueryAllAsync<ReceivingCard>("receiving_cards");

    public Task<ReceivingCard?> GetReceivingCardByIdAsync(int id) =>
        QueryByIdAsync<ReceivingCard>("receiving_cards", id);

    public Task<IEnumerable<Processor>> GetProcessorsAsync() =>
        QueryAllAsync<Processor>("processors");

    public Task<Processor?> GetProcessorByIdAsync(int id) =>
        QueryByIdAsync<Processor>("processors", id);

    private async Task<IEnumerable<T>> QueryAllAsync<T>(string table)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = $"SELECT {SelectColumns} FROM {table} ORDER BY name, id";
        return await connection.QueryAsync<T>(sql);
    }

    private async Task<T?> QueryByIdAsync<T>(string table, int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = $"SELECT {SelectColumns} FROM {table} WHERE id = @Id";
        return await connection.QuerySingleOrDefaultAsync<T>(sql, new { Id = id });
    }
}
