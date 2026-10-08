namespace DisplayConfigurator.Application.Interfaces;

/// <summary>Güncel USD/TRY. Alınamazsa null; PDF yine üretilir, kur notu basılmaz.</summary>
public interface IUsdTryRateSource
{
    Task<decimal?> TryGetAsync(CancellationToken cancellationToken = default);
}
