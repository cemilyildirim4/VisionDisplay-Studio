using Dapper;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class QuoteRepository : IQuoteRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    private const string SelectColumns = @"
        id AS Id,
        customer_name AS CustomerName,
        phone AS Phone,
        email AS Email,
        address AS Address,
        message AS Message,
        model_code AS ModelCode,
        wall_width_m AS WallWidthM,
        wall_height_m AS WallHeightM,
        screen_mode AS ScreenMode,
        ""columns"" AS Columns,
        ""rows"" AS Rows,
        screen_type AS ScreenType,
        resolution AS Resolution,
        screens_summary AS ScreensSummary,
        config_json AS ConfigJson,
        status AS Status,
        revision AS Revision,
        admin_note AS AdminNote,
        user_id AS UserId,
        created_at AS CreatedAt";

    public QuoteRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PagedResultDto<Quote>> GetPagedAsync(PagedQueryDto query)
    {
        using var connection = await _connectionFactory.CreateConnectionAsync();

        var hasSearch = !string.IsNullOrWhiteSpace(query.Search);
        var whereClause = hasSearch
            ? "WHERE customer_name ILIKE @Search OR phone ILIKE @Search OR email ILIKE @Search OR model_code ILIKE @Search"
            : string.Empty;

        var countSql = $"SELECT COUNT(1) FROM quotes {whereClause}";
        var dataSql = $@"
            SELECT {SelectColumns}
            FROM quotes
            {whereClause}
            ORDER BY created_at DESC
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
        var sql = $"SELECT {SelectColumns} FROM quotes WHERE user_id = @UserId ORDER BY created_at DESC";
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
                config_json, status, revision, user_id, created_at
            )
            VALUES
            (
                @CustomerName, @Phone, @Email, @Address, @Message,
                @ModelCode, @WallWidthM, @WallHeightM, @ScreenMode,
                @Columns, @Rows, @ScreenType, @Resolution, @ScreensSummary,
                @ConfigJson, @Status, @Revision, @UserId, NOW()
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
