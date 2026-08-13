using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Application.Security;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// Production kimlik doğrulama: e-posta/parola ile bayi/müşteri kaydı ve girişi,
/// kısa ömürlü JWT + uzun ömürlü refresh token çifti üretir. Google/Microsoft
/// OAuth girişleri (opsiyonel) appsettings'te Client Id tanımlıysa Program.cs
/// içinde koşullu olarak eklenir — bkz. entegrasyon raporu.
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

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        var existing = await _userRepository.GetByEmailAsync(dto.Email);
        if (existing != null)
            return Conflict(new { message = "Bu e-posta adresiyle zaten bir hesap var." });

        // Rol: kod yoksa bayi (kayıt herkese açık); doğru personel kodu varsa
        // Tester/Admin. Yanlış kod sessizce bayi yapılmaz — kullanıcı kodu
        // bilerek girmiştir, hatalı olduğu söylenmeli.
        var role = "Dealer";
        if (!string.IsNullOrWhiteSpace(dto.StaffCode))
        {
            var kod = dto.StaffCode.Trim();
            var testerKod = _config["Staff:TesterCode"];
            var adminKod = _config["Staff:AdminCode"];

            if (!string.IsNullOrEmpty(adminKod) && FixedTimeEquals(kod, adminKod))
                role = "Admin";
            else if (!string.IsNullOrEmpty(testerKod) && FixedTimeEquals(kod, testerKod))
                role = "Tester";
            else
                return BadRequest(new { message = "Erişim kodu geçersiz." });
        }

        var user = new User
        {
            Email = dto.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHasher.Hash(dto.Password),
            DisplayName = dto.DisplayName,
            Role = role,
        };

        var created = await _userRepository.CreateAsync(user);
        return await IssueTokensAsync(created);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "E-posta veya parola hatalı." });

        /*
         * Girişte erişim kodu ARTIK SORULMUYOR. Konfigüratördeki oturum ekranı
         * bayi/müşteri içindir ve kod alanı oradan kaldırıldı; şart burada
         * kalsaydı personel hesapları hiç giriş yapamazdı. Yönetim paneli kendi
         * erişim koduyla ayrıca korunuyor.
         */
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

    /// <summary>
    /// Kod karşılaştırması sabit sürelidir: normal string eşitliği ilk farklı
    /// karakterde çıktığı için yanıt süresinden kodun ne kadarının doğru
    /// olduğu çıkarılabilir.
    /// </summary>
    private static bool FixedTimeEquals(string a, string b)
        => System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(a),
            System.Text.Encoding.UTF8.GetBytes(b));

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
