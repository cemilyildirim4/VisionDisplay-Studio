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

    public Task<IEnumerable<PowerSupply>> GetPowerSuppliesAsync() => QueryAllAsync<PowerSupply>("power_supplies");
    public Task<PowerSupply?> GetPowerSupplyByIdAsync(int id) => QueryByIdAsync<PowerSupply>("power_supplies", id);
    public Task<PowerSupply> CreatePowerSupplyAsync(PowerSupply item) => CreateAsync(item, "power_supplies");
    public Task<bool> UpdatePowerSupplyAsync(PowerSupply item) => UpdateAsync(item, "power_supplies");
    public Task<bool> DeletePowerSupplyAsync(int id) => DeleteAsync("power_supplies", id);
    public Task<int> CountPowerSupplyReferencesAsync(int id) => CountReferencesAsync("power_supply_id", id);

    public Task<IEnumerable<MiniPc>> GetMiniPcsAsync() => QueryAllAsync<MiniPc>("mini_pcs");
    public Task<MiniPc?> GetMiniPcByIdAsync(int id) => QueryByIdAsync<MiniPc>("mini_pcs", id);
    public Task<MiniPc> CreateMiniPcAsync(MiniPc item) => CreateAsync(item, "mini_pcs");
    public Task<bool> UpdateMiniPcAsync(MiniPc item) => UpdateAsync(item, "mini_pcs");
    public Task<bool> DeleteMiniPcAsync(int id) => DeleteAsync("mini_pcs", id);
    public Task<int> CountMiniPcReferencesAsync(int id) => CountReferencesAsync("mini_pc_id", id);

    public Task<IEnumerable<PatchCable>> GetPatchCablesAsync() => QueryAllAsync<PatchCable>("patch_cables");
    public Task<PatchCable?> GetPatchCableByIdAsync(int id) => QueryByIdAsync<PatchCable>("patch_cables", id);
    public Task<PatchCable> CreatePatchCableAsync(PatchCable item) => CreateAsync(item, "patch_cables");
    public Task<bool> UpdatePatchCableAsync(PatchCable item) => UpdateAsync(item, "patch_cables");
    public Task<bool> DeletePatchCableAsync(int id) => DeleteAsync("patch_cables", id);
    public Task<int> CountPatchCableReferencesAsync(int id) => CountReferencesAsync("patch_cable_id", id);

    public Task<IEnumerable<ReceivingCard>> GetReceivingCardsAsync() => QueryAllAsync<ReceivingCard>("receiving_cards");
    public Task<ReceivingCard?> GetReceivingCardByIdAsync(int id) => QueryByIdAsync<ReceivingCard>("receiving_cards", id);
    public Task<ReceivingCard> CreateReceivingCardAsync(ReceivingCard item) => CreateAsync(item, "receiving_cards");
    public Task<bool> UpdateReceivingCardAsync(ReceivingCard item) => UpdateAsync(item, "receiving_cards");
    public Task<bool> DeleteReceivingCardAsync(int id) => DeleteAsync("receiving_cards", id);
    public Task<int> CountReceivingCardReferencesAsync(int id) => CountReferencesAsync("receiving_card_id", id);

    public Task<IEnumerable<Processor>> GetProcessorsAsync() => QueryAllAsync<Processor>("processors");
    public Task<Processor?> GetProcessorByIdAsync(int id) => QueryByIdAsync<Processor>("processors", id);
    public Task<Processor> CreateProcessorAsync(Processor item) => CreateAsync(item, "processors");
    public Task<bool> UpdateProcessorAsync(Processor item) => UpdateAsync(item, "processors");
    public Task<bool> DeleteProcessorAsync(int id) => DeleteAsync("processors", id);
    public Task<int> CountProcessorReferencesAsync(int id) => CountReferencesAsync("processor_id", id);

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

    private async Task<T> CreateAsync<T>(T item, string table) where T : HardwareComponent
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = $@"
            INSERT INTO {table}
                (name, model, price, power_draw_watt, heat_dissipation_btu, efficiency_ratio, created_at)
            VALUES
                (@Name, @Model, @Price, @PowerDrawWatt, @HeatDissipationBTU, @EfficiencyRatio, NOW())
            RETURNING id;";
        item.Id = await connection.ExecuteScalarAsync<int>(sql, item);
        return item;
    }

    private async Task<bool> UpdateAsync<T>(T item, string table) where T : HardwareComponent
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = $@"
            UPDATE {table} SET
                name = @Name,
                model = @Model,
                price = @Price,
                power_draw_watt = @PowerDrawWatt,
                heat_dissipation_btu = @HeatDissipationBTU,
                efficiency_ratio = @EfficiencyRatio
            WHERE id = @Id";
        var rows = await connection.ExecuteAsync(sql, item);
        return rows > 0;
    }

    private async Task<bool> DeleteAsync(string table, int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync($"DELETE FROM {table} WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    private async Task<int> CountReferencesAsync(string fkColumn, int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var configs = await connection.ExecuteScalarAsync<int>(
            $"SELECT COUNT(1) FROM configurations WHERE {fkColumn} = @Id", new { Id = id });
        var quotes = await connection.ExecuteScalarAsync<int>(
            $"SELECT COUNT(1) FROM quotes WHERE {fkColumn} = @Id", new { Id = id });
        return configs + quotes;
    }
}
