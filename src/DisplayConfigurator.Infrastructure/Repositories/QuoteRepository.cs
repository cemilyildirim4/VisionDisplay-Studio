using Dapper;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class QuoteRepository : IQuoteRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    private const string SelectColumns = @"
        q.id AS Id,
        COALESCE(NULLIF(TRIM(q.customer_name), ''), NULLIF(TRIM(u.display_name), '')) AS CustomerName,
        q.phone AS Phone,
        COALESCE(NULLIF(TRIM(q.email), ''), NULLIF(TRIM(u.email), '')) AS Email,
        q.address AS Address,
        q.message AS Message,
        q.model_code AS ModelCode,
        q.wall_width_m AS WallWidthM,
        q.wall_height_m AS WallHeightM,
        q.screen_mode AS ScreenMode,
        q.""columns"" AS Columns,
        q.""rows"" AS Rows,
        q.screen_type AS ScreenType,
        q.resolution AS Resolution,
        q.screens_summary AS ScreensSummary,
        q.config_json AS ConfigJson,
        q.status AS Status,
        q.revision AS Revision,
        q.admin_note AS AdminNote,
        q.user_id AS UserId,
        q.has_mini_pc AS HasMiniPc,
        q.labor_cost_multiplier AS LaborCostMultiplier,
        q.cabin_id AS CabinId,
        q.power_supply_id AS PowerSupplyId,
        q.mini_pc_id AS MiniPcId,
        q.patch_cable_id AS PatchCableId,
        q.receiving_card_id AS ReceivingCardId,
        q.processor_id AS ProcessorId,
        q.created_at AS CreatedAt";

    private const string FromQuotes = @"
        FROM quotes q
        LEFT JOIN users u ON q.user_id = u.id";

    public QuoteRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PagedResultDto<Quote>> GetPagedAsync(PagedQueryDto query)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();

        var hasSearch = !string.IsNullOrWhiteSpace(query.Search);
        var whereClause = hasSearch
            ? "WHERE q.customer_name ILIKE @Search OR q.phone ILIKE @Search OR q.email ILIKE @Search OR q.model_code ILIKE @Search OR u.display_name ILIKE @Search OR u.email ILIKE @Search"
            : string.Empty;

        var countSql = $"SELECT COUNT(1) {FromQuotes} {whereClause}";
        var dataSql = $@"
            SELECT {SelectColumns}
            {FromQuotes}
            {whereClause}
            ORDER BY q.created_at DESC
            OFFSET @Offset LIMIT @PageSize";

        var parameters = new
        {
            Search = hasSearch ? $"%{query.Search}%" : null,
            Offset = (query.Page - 1) * query.PageSize,
            query.PageSize,
        };

        var total = await connection.ExecuteScalarAsync<int>(countSql, parameters);
        var items = await connection.QueryAsync<Quote>(dataSql, parameters);

        return new PagedResultDto<Quote>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<IEnumerable<Quote>> GetByUserIdAsync(int userId)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = $"SELECT {SelectColumns} {FromQuotes} WHERE q.user_id = @UserId ORDER BY q.created_at DESC";
        return await connection.QueryAsync<Quote>(sql, new { UserId = userId });
    }

    public async Task<Quote> CreateAsync(Quote quote)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO quotes
            (
                customer_name, phone, email, address, message,
                model_code, wall_width_m, wall_height_m, screen_mode,
                ""columns"", ""rows"", screen_type, resolution, screens_summary,
                config_json, status, revision, user_id,
                has_mini_pc, labor_cost_multiplier,
                cabin_id, power_supply_id, mini_pc_id,
                patch_cable_id, receiving_card_id, processor_id,
                created_at
            )
            VALUES
            (
                @CustomerName, @Phone, @Email, @Address, @Message,
                @ModelCode, @WallWidthM, @WallHeightM, @ScreenMode,
                @Columns, @Rows, @ScreenType, @Resolution, @ScreensSummary,
                @ConfigJson, @Status, @Revision, @UserId,
                @HasMiniPc, @LaborCostMultiplier,
                @CabinId, @PowerSupplyId, @MiniPcId,
                @PatchCableId, @ReceivingCardId, @ProcessorId,
                NOW()
            )
            RETURNING id;";

        var id = await connection.ExecuteScalarAsync<int>(sql, quote);
        quote.Id = id;
        return quote;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = "DELETE FROM quotes WHERE id = @Id";
        var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
        return rowsAffected > 0;
    }

    public async Task<bool> UpdateStatusAsync(int id, string status, string? adminNote)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE quotes
            SET status = @Status, admin_note = COALESCE(@AdminNote, admin_note), revision = revision + 1
            WHERE id = @Id";
        var rows = await connection.ExecuteAsync(sql, new { Id = id, Status = status, AdminNote = adminNote });
        return rows > 0;
    }
}
