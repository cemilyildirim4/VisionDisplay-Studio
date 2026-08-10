using System.Data;
using DisplayConfigurator.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace DisplayConfigurator.Infrastructure.Data;

public class NpgsqlDbConnectionFactory : IDbConnectionFactory
{
    private readonly IConfiguration _configuration;

    public NpgsqlDbConnectionFactory(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public IDbConnection CreateConnection()
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        return new NpgsqlConnection(connectionString);
    }
}