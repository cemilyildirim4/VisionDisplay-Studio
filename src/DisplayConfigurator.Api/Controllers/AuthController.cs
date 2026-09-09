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
    /// Davet kodu ile BAYİ girişi.
    ///
    /// Kullanıcı adı ve kod birlikte doğrulanıyor; geçerliyse o kullanıcı
    /// adına ait bir bayi hesabı açılıyor (varsa yeniden kullanılıyor) ve
    /// normal giriş jetonları veriliyor.
    ///
    /// NEDEN GERÇEK HESAP: eskiden kimliksiz bir "Guest" jetonu dönüyordu;
    /// kullanıcı numarası olmadığı için "Tekliflerim" 401 veriyor,
    /// kaydedilen teklifler de kimseye bağlanmıyordu. Gerçek kayıt açılınca
    /// bayi kendi tekliflerini ve yapılandırmalarını görüyor, yönetici de
    /// kullanıcı listesinde kimin girdiğini görebiliyor.
    ///
    /// Bu hesaba PAROLA İLE GİRİLEMEZ: parola alanına rastgele, kimsenin
    /// bilmediği bir değer yazılıyor. Tek giriş yolu davet kodu.
    /// </summary>
    [HttpPost("guest")]
    public async Task<ActionResult<AuthResponseDto>> RedeemInvite([FromBody] RedeemInviteDto dto)
    {
        var ad = dto.UserName?.Trim();
        var kod = dto.Code.Trim();
        var ok = await _inviteCodeRepository.TryRedeemAsync(kod, ad);
        if (!ok)
            return BadRequest(new { message = "Kullanıcı adı veya davet kodu geçersiz, süresi dolmuş ya da kullanım hakkı tükenmiş." });

        var gorunenAd = string.IsNullOrWhiteSpace(ad) ? kod : ad!;
        var eposta = DavetEpostasi(gorunenAd);

        var user = await _userRepository.GetByEmailAsync(eposta);
        if (user == null)
        {
            user = await _userRepository.CreateAsync(new User
            {
                Email = eposta,
                // Parola ile giriş kapalı: rastgele değer, hiçbir yerde saklanmıyor.
                PasswordHash = PasswordHasher.Hash(Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N")),
                DisplayName = gorunenAd,
                Role = "Dealer",
            });
        }

        var yanit = await IssueTokensAsync(user);
        // Firma bilgileri koda bağlı; oturuma taşınsın diye yanıta ekleniyor.
        var davet = await _inviteCodeRepository.GetByCodeAsync(kod);
        if (yanit.Result is OkObjectResult okSonuc && okSonuc.Value is AuthResponseDto govde && davet != null)
        {
            govde.CompanyName = davet.CompanyName;
            govde.CompanyPhone = davet.Phone;
            govde.CompanyEmail = davet.Email;
            govde.CompanyNote = davet.Note;
        }

        return yanit;
    }

    /// <summary>
    /// Kullanıcı adından davet hesabı e-postası üretir: "ahmet yılmaz" →
    /// "ahmet-yilmaz@davet.local". Aynı ad hep aynı hesaba düşsün diye
    /// sadeleştirme deterministik.
    /// </summary>
    private static string DavetEpostasi(string ad)
    {
        var kucuk = ad.ToLowerInvariant()
            .Replace('ı', 'i').Replace('ğ', 'g').Replace('ü', 'u')
            .Replace('ş', 's').Replace('ö', 'o').Replace('ç', 'c');

        var yazi = new string(kucuk.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray())
            .Trim('-');
        while (yazi.Contains("--")) yazi = yazi.Replace("--", "-");
        if (string.IsNullOrWhiteSpace(yazi)) yazi = "davet";

        return $"{yazi}@davet.local";
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
