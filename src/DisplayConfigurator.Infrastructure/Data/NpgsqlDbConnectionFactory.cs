using System.Data;
using System.Net.Sockets;
using DisplayConfigurator.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace DisplayConfigurator.Infrastructure.Data;

/// <summary>
/// Npgsql bağlantı fabrikası — geçici kopmalarda OpenAsync birkaç kez yeniden dener.
/// (EF Core EnableRetryOnFailure eşdeğeri; proje Dapper kullandığı için burada uygulanır.)
/// </summary>
public class NpgsqlDbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;
    private readonly ILogger<NpgsqlDbConnectionFactory>? _logger;
    private const int MaxOpenAttempts = 3;

    public NpgsqlDbConnectionFactory(IConfiguration configuration, ILogger<NpgsqlDbConnectionFactory>? logger = null)
    {
        _logger = logger;
        var raw = Environment.GetEnvironmentVariable("CONNECTION_STRING")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "CONNECTION_STRING / ConnectionStrings:DefaultConnection tanımlı değil. DB_PASSWORD ortam değişkenini ayarlayın.");

        var builder = new NpgsqlConnectionStringBuilder(raw);
        if (builder.Timeout <= 0) builder.Timeout = 15;
        if (builder.MaxPoolSize < 20) builder.MaxPoolSize = 50;
        _connectionString = builder.ConnectionString;
    }

    public IDbConnection CreateConnection()
        => CreateConnectionAsync().GetAwaiter().GetResult();

    public async Task<IDbConnection> CreateConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new NpgsqlConnection(_connectionString);
        await OpenWithRetryAsync(connection, cancellationToken);
        return connection;
    }

    private async Task OpenWithRetryAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        Exception? last = null;
        for (var attempt = 1; attempt <= MaxOpenAttempts; attempt++)
        {
            try
            {
                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync(cancellationToken);
                return;
            }
            catch (Exception ex) when (ex is NpgsqlException or SocketException or TimeoutException)
            {
                last = ex;
                _logger?.LogWarning(ex,
                    "PostgreSQL bağlantısı açılamadı (deneme {Attempt}/{Max}).",
                    attempt, MaxOpenAttempts);

                if (attempt < MaxOpenAttempts)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(200 * attempt), cancellationToken);
                    try { connection.Close(); } catch { /* ignore */ }
                }
            }
        }

        throw last ?? new InvalidOperationException("PostgreSQL bağlantısı açılamadı.");
    }
}
