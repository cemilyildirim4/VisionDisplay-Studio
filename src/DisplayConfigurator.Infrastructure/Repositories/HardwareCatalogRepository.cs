using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class HardwareCatalogRepository : IHardwareCatalogRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public HardwareCatalogRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public Task<IEnumerable<PowerSupply>> GetPowerSuppliesAsync() =>
        QueryAllAsync<PowerSupply>("power_supplies", PowerSupplyColumns);
    public Task<PowerSupply?> GetPowerSupplyByIdAsync(int id) =>
        QueryByIdAsync<PowerSupply>("power_supplies", PowerSupplyColumns, id);
    public Task<PowerSupply> CreatePowerSupplyAsync(PowerSupply item) =>
        CreateAsync(item, "power_supplies",
            "(name, model, price, output_voltage, max_power_output_watt, efficiency_ratio, heat_dissipation_btu, created_at)",
            "(@Name, @Model, @Price, @OutputVoltage, @MaxPowerOutputWatt, @EfficiencyRatio, @HeatDissipationBtu, NOW())");
    public Task<bool> UpdatePowerSupplyAsync(PowerSupply item) =>
        UpdateAsync(item, "power_supplies", @"
                name = @Name, model = @Model, price = @Price,
                output_voltage = @OutputVoltage, max_power_output_watt = @MaxPowerOutputWatt,
                efficiency_ratio = @EfficiencyRatio, heat_dissipation_btu = @HeatDissipationBtu");
    public Task<bool> DeletePowerSupplyAsync(int id) => DeleteAsync("power_supplies", id);
    public Task<int> CountPowerSupplyReferencesAsync(int id) => CountReferencesAsync("power_supply_id", id);

    public Task<IEnumerable<MiniPc>> GetMiniPcsAsync() =>
        QueryAllAsync<MiniPc>("mini_pcs", MiniPcColumns);
    public Task<MiniPc?> GetMiniPcByIdAsync(int id) =>
        QueryByIdAsync<MiniPc>("mini_pcs", MiniPcColumns, id);
    public Task<MiniPc> CreateMiniPcAsync(MiniPc item) =>
        CreateAsync(item, "mini_pcs",
            "(name, model, price, cpu_ram_info, storage, operating_system, max_supported_resolution, power_draw_watt, created_at)",
            "(@Name, @Model, @Price, @CpuRamInfo, @Storage, @OperatingSystem, @MaxSupportedResolution, @PowerDrawWatt, NOW())");
    public Task<bool> UpdateMiniPcAsync(MiniPc item) =>
        UpdateAsync(item, "mini_pcs", @"
                name = @Name, model = @Model, price = @Price,
                cpu_ram_info = @CpuRamInfo, storage = @Storage, operating_system = @OperatingSystem,
                max_supported_resolution = @MaxSupportedResolution, power_draw_watt = @PowerDrawWatt");
    public Task<bool> DeleteMiniPcAsync(int id) => DeleteAsync("mini_pcs", id);
    public Task<int> CountMiniPcReferencesAsync(int id) => CountReferencesAsync("mini_pc_id", id);

    public Task<IEnumerable<PatchCable>> GetPatchCablesAsync() =>
        QueryAllAsync<PatchCable>("patch_cables", PatchCableColumns);
    public Task<PatchCable?> GetPatchCableByIdAsync(int id) =>
        QueryByIdAsync<PatchCable>("patch_cables", PatchCableColumns, id);
    public Task<PatchCable> CreatePatchCableAsync(PatchCable item) =>
        CreateAsync(item, "patch_cables",
            "(name, model, price, cable_type, length_meters, connector_type, created_at)",
            "(@Name, @Model, @Price, @CableType, @LengthMeters, @ConnectorType, NOW())");
    public Task<bool> UpdatePatchCableAsync(PatchCable item) =>
        UpdateAsync(item, "patch_cables", @"
                name = @Name, model = @Model, price = @Price,
                cable_type = @CableType, length_meters = @LengthMeters, connector_type = @ConnectorType");
    public Task<bool> DeletePatchCableAsync(int id) => DeleteAsync("patch_cables", id);
    public Task<int> CountPatchCableReferencesAsync(int id) => CountReferencesAsync("patch_cable_id", id);

    public Task<IEnumerable<ReceivingCard>> GetReceivingCardsAsync() =>
        QueryAllAsync<ReceivingCard>("receiving_cards", ReceivingCardColumns);
    public Task<ReceivingCard?> GetReceivingCardByIdAsync(int id) =>
        QueryByIdAsync<ReceivingCard>("receiving_cards", ReceivingCardColumns, id);
    public Task<ReceivingCard> CreateReceivingCardAsync(ReceivingCard item) =>
        CreateAsync(item, "receiving_cards",
            "(name, model, price, max_pixel_width, max_pixel_height, hub_port_count, power_draw_watt, created_at)",
            "(@Name, @Model, @Price, @MaxPixelWidth, @MaxPixelHeight, @HubPortCount, @PowerDrawWatt, NOW())");
    public Task<bool> UpdateReceivingCardAsync(ReceivingCard item) =>
        UpdateAsync(item, "receiving_cards", @"
                name = @Name, model = @Model, price = @Price,
                max_pixel_width = @MaxPixelWidth, max_pixel_height = @MaxPixelHeight,
                hub_port_count = @HubPortCount, power_draw_watt = @PowerDrawWatt");
    public Task<bool> DeleteReceivingCardAsync(int id) => DeleteAsync("receiving_cards", id);
    public Task<int> CountReceivingCardReferencesAsync(int id) => CountReferencesAsync("receiving_card_id", id);

    public Task<IEnumerable<Processor>> GetProcessorsAsync() =>
        QueryAllAsync<Processor>("processors", ProcessorColumns);
    public Task<Processor?> GetProcessorByIdAsync(int id) =>
        QueryByIdAsync<Processor>("processors", ProcessorColumns, id);
    public Task<Processor> CreateProcessorAsync(Processor item) =>
        CreateAsync(item, "processors",
            "(name, model, price, max_pixel_capacity_mpx, ethernet_port_count, input_ports_info, power_draw_watt, created_at)",
            "(@Name, @Model, @Price, @MaxPixelCapacityMpx, @EthernetPortCount, @InputPortsInfo, @PowerDrawWatt, NOW())");
    public Task<bool> UpdateProcessorAsync(Processor item) =>
        UpdateAsync(item, "processors", @"
                name = @Name, model = @Model, price = @Price,
                max_pixel_capacity_mpx = @MaxPixelCapacityMpx, ethernet_port_count = @EthernetPortCount,
                input_ports_info = @InputPortsInfo, power_draw_watt = @PowerDrawWatt");
    public Task<bool> DeleteProcessorAsync(int id) => DeleteAsync("processors", id);
    public Task<int> CountProcessorReferencesAsync(int id) => CountReferencesAsync("processor_id", id);

    private const string CommonColumns = @"
        id AS Id,
        name AS Name,
        model AS Model,
        price AS Price,
        created_at AS CreatedAt";

    private const string PowerSupplyColumns = CommonColumns + @",
        output_voltage AS OutputVoltage,
        max_power_output_watt AS MaxPowerOutputWatt,
        efficiency_ratio AS EfficiencyRatio,
        heat_dissipation_btu AS HeatDissipationBtu";

    private const string MiniPcColumns = CommonColumns + @",
        cpu_ram_info AS CpuRamInfo,
        storage AS Storage,
        operating_system AS OperatingSystem,
        max_supported_resolution AS MaxSupportedResolution,
        power_draw_watt AS PowerDrawWatt";

    private const string PatchCableColumns = CommonColumns + @",
        cable_type AS CableType,
        length_meters AS LengthMeters,
        connector_type AS ConnectorType";

    private const string ReceivingCardColumns = CommonColumns + @",
        max_pixel_width AS MaxPixelWidth,
        max_pixel_height AS MaxPixelHeight,
        hub_port_count AS HubPortCount,
        power_draw_watt AS PowerDrawWatt";

    private const string ProcessorColumns = CommonColumns + @",
        max_pixel_capacity_mpx AS MaxPixelCapacityMpx,
        ethernet_port_count AS EthernetPortCount,
        input_ports_info AS InputPortsInfo,
        power_draw_watt AS PowerDrawWatt";

    private async Task<IEnumerable<T>> QueryAllAsync<T>(string table, string columns)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        return await connection.QueryAsync<T>($"SELECT {columns} FROM {table} ORDER BY name, id");
    }

    private async Task<T?> QueryByIdAsync<T>(string table, string columns, int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<T>(
            $"SELECT {columns} FROM {table} WHERE id = @Id", new { Id = id });
    }

    private async Task<T> CreateAsync<T>(T item, string table, string cols, string vals) where T : HardwareComponent
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        item.Id = await connection.ExecuteScalarAsync<int>(
            $"INSERT INTO {table} {cols} VALUES {vals} RETURNING id;", item);
        return item;
    }

    private async Task<bool> UpdateAsync<T>(T item, string table, string setClause) where T : HardwareComponent
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(
            $"UPDATE {table} SET {setClause} WHERE id = @Id", item);
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
