using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DisplayConfigurator.Infrastructure.Services;

/// <summary>
/// Kısa ömürlü (varsayılan 15 dk) HMAC-SHA256 imzalı JWT erişim jetonu üretir.
/// Jwt:Secret en az 32 karakter olmalı (appsettings/ortam değişkeni) — kısa
/// bir sırra karşı ASP.NET Core başlangıçta hata verir, bu bilinçli bir tercihtir.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public (string token, DateTime expiresAt) GenerateAccessToken(User user)
    {
        var secret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret tanımlı değil.");
        var minutes = int.TryParse(_config["Jwt:AccessTokenMinutes"], out var m) ? m : 15;
        var expiresAt = DateTime.UtcNow.AddMinutes(minutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("displayName", user.DisplayName ?? user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "display-configurator",
            audience: _config["Jwt:Audience"] ?? "display-configurator-client",
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string GenerateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
