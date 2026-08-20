using Dapper;
using DisplayConfigurator.Application.Interfaces;

namespace DisplayConfigurator.Api.Data;

/// <summary>
/// EF Core yok (Dapper). Canlıya çıkışta ContentRoot/Migrations/*.sql dosyalarını
/// sıra numarasına göre uygular; schema_migrations tablosunda izler.
/// Betikler IF NOT EXISTS kullanmalı — tekrar çalıştırma güvenli olsun.
/// </summary>
public static class SqlMigrationRunner
{
    public static async Task ApplyAsync(WebApplication app)
    {
        var dir = Path.Combine(app.Environment.ContentRootPath, "Migrations");
        if (!Directory.Exists(dir))
        {
            app.Logger.LogWarning("Migrations klasörü bulunamadı: {Dir}", dir);
            return;
        }

        var db = app.Services.GetRequiredService<IDbConnectionFactory>();
        using var conn = await db.CreateConnectionAsync();

        await conn.ExecuteAsync("""
            CREATE TABLE IF NOT EXISTS public.schema_migrations
            (
                filename character varying(200) NOT NULL,
                applied_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename)
            );
            """);

        var applied = (await conn.QueryAsync<string>("SELECT filename FROM public.schema_migrations"))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var files = Directory.GetFiles(dir, "*.sql")
            .OrderBy(f => Path.GetFileName(f), StringComparer.OrdinalIgnoreCase)
            .ToArray();

        foreach (var file in files)
        {
            var name = Path.GetFileName(file);
            if (applied.Contains(name))
            {
                app.Logger.LogDebug("Migration zaten uygulanmış, atlanıyor: {Name}", name);
                continue;
            }

            var sql = await File.ReadAllTextAsync(file);
            if (string.IsNullOrWhiteSpace(sql))
                continue;

            await conn.ExecuteAsync(sql);
            await conn.ExecuteAsync(
                "INSERT INTO public.schema_migrations (filename) VALUES (@name)",
                new { name });
            app.Logger.LogInformation("Migration uygulandı: {Name}", name);
        }
    }
}
