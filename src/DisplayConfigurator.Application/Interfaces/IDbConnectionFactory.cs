using System.Data;

namespace DisplayConfigurator.Application.Interfaces;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
    Task<IDbConnection> CreateConnectionAsync(CancellationToken cancellationToken = default);
}
