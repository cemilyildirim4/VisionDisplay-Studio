using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken> CreateAsync(RefreshToken token);
    Task<RefreshToken?> GetActiveAsync(string token);
    Task<bool> RevokeAsync(string token);
}
