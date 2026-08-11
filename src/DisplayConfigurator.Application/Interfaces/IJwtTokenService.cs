using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IJwtTokenService
{
    (string token, DateTime expiresAt) GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
