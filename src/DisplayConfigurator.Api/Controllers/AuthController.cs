using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Application.Security;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// Production kimlik doğrulama: e-posta/parola ile kayıt ve giriş.
/// Kayıt AÇIKTIR ve her zaman "Dealer" (bayi) rolü verir. Yönetici ve tester
/// rolleri buradan alınamaz; onları yalnızca Admin (POST /api/users) verir.
/// </summary>
[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IInviteCodeRepository _inviteCodeRepository;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IConfiguration _config;

    public AuthController(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IInviteCodeRepository inviteCodeRepository,
        IJwtTokenService jwtTokenService,
        IConfiguration config)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _inviteCodeRepository = inviteCodeRepository;
        _jwtTokenService = jwtTokenService;
        _config = config;
    }

    /// <summary>
    /// Bayi/müşteri kendi hesabını açar. Rol HER ZAMAN "Dealer"; istek ne
    /// gönderirse göndersin yükseltme yapılamaz — yetki yükseltme yolu
    /// yalnızca Admin'in kullanıcı yönetiminden geçer.
    ///
    /// Açılan hesap kendi kaydettiği yapılandırma ve teklifleri görür
    /// (GET /api/configurations/mine, /api/quotes/mine); başkasınınkine
    /// erişemez. Hepsini yalnızca Admin görür.
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();

        /*
         * Var olan e-postayı 409 ile söylüyoruz. Bu, kayıtlı e-postaları
         * dışarıya sızdırır; ama alternatifi (sessizce başarılı gibi
         * davranmak) kullanıcıyı parolasını hatırlamadığı bir hesapla baş
         * başa bırakıyor. Kayıt zaten herkese açık olduğu için aynı bilgi
         * denemeyle de öğrenilebilir; net hata mesajı tercih edildi.
         */
        var existing = await _userRepository.GetByEmailAsync(email);
        if (existing != null)
            return Conflict(new { message = "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin." });

        var user = await _userRepository.CreateAsync(new User
        {
            Email = email,
            PasswordHash = PasswordHasher.Hash(dto.Password),
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? null : dto.DisplayName.Trim(),
            // DTO'daki StaffCode bilerek OKUNMUYOR: rol buradan yükseltilemez.
            Role = "Dealer",
        });

        return await IssueTokensAsync(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "E-posta veya parola hatalı." });

        return await IssueTokensAsync(user);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenDto dto)
    {
        var stored = await _refreshTokenRepository.GetActiveAsync(dto.RefreshToken);
        if (stored == null)
            return Unauthorized(new { message = "Oturum süresi dolmuş, lütfen tekrar giriş yapın." });

        var user = await _userRepository.GetByIdAsync(stored.UserId);
        if (user == null)
            return Unauthorized(new { message = "Kullanıcı bulunamadı." });

        // Rotasyon: eski refresh token tekrar kullanılamaz hâle getirilir —
        // bir jeton sızsa bile yalnızca bir kez işe yarar.
        await _refreshTokenRepository.RevokeAsync(dto.RefreshToken);

        return await IssueTokensAsync(user);
    }

    /// <summary>
    /// BETA: kayıt zorunluluğu olmadan geçici erişim. Davet kodu geçerliyse
    /// "Guest" rolünde, kısa ömürlü (varsayılan 24 saat) bir jeton döner.
    /// </summary>
    [HttpPost("guest")]
    public async Task<ActionResult<AuthResponseDto>> RedeemInvite([FromBody] RedeemInviteDto dto)
    {
        var ok = await _inviteCodeRepository.TryRedeemAsync(dto.Code.Trim());
        if (!ok)
            return BadRequest(new { message = "Davet kodu geçersiz, süresi dolmuş veya kullanım hakkı tükenmiş." });

        var guestUser = new User { Id = 0, Email = $"guest-{Guid.NewGuid():N}@beta.local", Role = "Guest", DisplayName = "Misafir" };
        var (token, expiresAt) = _jwtTokenService.GenerateAccessToken(guestUser);

        return Ok(new AuthResponseDto
        {
            AccessToken = token,
            AccessTokenExpiresAt = expiresAt,
            Role = "Guest",
        });
    }

    private async Task<ActionResult<AuthResponseDto>> IssueTokensAsync(User user)
    {
        var (accessToken, expiresAt) = _jwtTokenService.GenerateAccessToken(user);
        var refreshTokenValue = _jwtTokenService.GenerateRefreshToken();
        var refreshDays = int.TryParse(_config["Jwt:RefreshTokenDays"], out var d) ? d : 30;

        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshDays),
        });

        return Ok(new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            AccessTokenExpiresAt = expiresAt,
            Role = user.Role,
            Email = user.Email,
            DisplayName = user.DisplayName,
        });
    }
}
