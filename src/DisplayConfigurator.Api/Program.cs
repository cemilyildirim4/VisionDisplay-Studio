using System.Text;
using System.Threading.RateLimiting;
using System.Net.Sockets;
using Dapper;
using Microsoft.AspNetCore.Diagnostics;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Infrastructure.Data;
using DisplayConfigurator.Infrastructure.Repositories;
using DisplayConfigurator.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

// Dapper haritalama ayarı (veritabanındaki snake_case sütunları C# PascalCase ile eşleştirir)
DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

// Kestrel'in yanıtlara "Server: Kestrel" başlığı eklemesini kapatıyoruz —
// sunucu yazılımını/versiyonunu saldırgana ücretsiz bilgi olarak vermeyelim.
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// 1. Controller servisleri
builder.Services.AddControllers();

// 2. Swagger / OpenAPI konfigürasyonu
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Projenizin Gerçek Bağımlılıkları (Dependency Injection)
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlDbConnectionFactory>();
builder.Services.AddMemoryCache();

builder.Services.AddScoped<ICabinRepository, CabinRepository>();
builder.Services.AddScoped<ISeriesRepository, SeriesRepository>();
builder.Services.AddScoped<IQuoteRepository, QuoteRepository>();
builder.Services.AddScoped<IChatLogRepository, ChatLogRepository>();
builder.Services.AddScoped<IFeedbackRepository, FeedbackRepository>();
builder.Services.AddScoped<IConfigurationRepository, ConfigurationRepository>();
builder.Services.AddScoped<IConfigurationService, ConfigurationService>();
builder.Services.AddScoped<IPdfReportService, PdfReportService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IInviteCodeRepository, InviteCodeRepository>();
builder.Services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// 4. CORS ayarları (React Frontend ile sorunsuz haberleşmek için)
// Origin listesi appsettings.json > Cors:Origins altından okunur; tanımlı değilse
// yerel geliştirme adresleri (Vite varsayılan portları) kullanılır.
var izinliAdresler = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
if (izinliAdresler is null || izinliAdresler.Length == 0)
{
    izinliAdresler =
    [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        // Eskiden AllowAnyMethod/AllowAnyHeader kullanılıyordu — çalışıyor
        // olmasına rağmen gereğinden geniş bir yüzey açıyordu. Sadece
        // kullanılan metod/header'lara izin veriyoruz (Authorization eklendi:
        // JWT ile korunan "mine" uçları için gerekli).
        policy.WithOrigins(izinliAdresler)
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
              .WithHeaders("Content-Type", "Authorization", "X-Admin-Key", "X-Guest-Token")
              .WithExposedHeaders("Content-Disposition") // PDF indirmede dosya adı için
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10)); // OPTIONS önbelleği — CORS dalgalanmasını azaltır
    });
});

// 5. Kimlik doğrulama (JWT) — bayi/müşteri girişi ve BetaGate için.
// Jwt:Secret üretimde MUTLAKA appsettings.Development.json/.env yerine gerçek
// bir sır yöneticisinden (Docker secret, KeyVault, env var) verilmeli; burada
// yalnızca yerel geliştirme için 64 karakterlik bir varsayılan tanımlıdır.
//
// ÖNEMLİ: `??` yerine IsNullOrWhiteSpace kontrolü kullanılıyor. docker-compose.yml
// `Jwt__Secret: ${JWT_SECRET:-}` şeklinde tanımlı olduğundan, .env'de JWT_SECRET
// hiç ayarlanmamışsa IConfiguration bu değeri NULL değil BOŞ DİZE ("") olarak
// döndürür — `??` operatörü boş dizeyi tetiklemez. Bu yüzden eskiden JWT_SECRET
// ayarlanmadığında `SymmetricSecurityKey` sıfır uzunluklu anahtarla oluşturulmaya
// çalışılıyor ve JWT doğrulaması gereken HER istek (hatta herkese açık uçlar da,
// çünkü AuthenticationMiddleware her istekte devreye giriyor) 500 ile patlıyordu.
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
    jwtSecret = "GELISTIRME-ORTAMI-ICIN-VARSAYILAN-64-KARAKTERLIK-GIZLI-ANAHTAR-DEGISTIR";

var jwtIssuer = builder.Configuration["Jwt:Issuer"];
if (string.IsNullOrWhiteSpace(jwtIssuer)) jwtIssuer = "display-configurator";

var jwtAudience = builder.Configuration["Jwt:Audience"];
if (string.IsNullOrWhiteSpace(jwtAudience)) jwtAudience = "display-configurator-client";

if (!builder.Environment.IsDevelopment() &&
    jwtSecret == "GELISTIRME-ORTAMI-ICIN-VARSAYILAN-64-KARAKTERLIK-GIZLI-ANAHTAR-DEGISTIR")
{
    // Production'da varsayılan (herkesçe bilinen) anahtarla asla ayağa kalkmasın —
    // sessizce güvensiz çalışmak yerine başlangıçta net bir hata ile durur.
    throw new InvalidOperationException(
        "Jwt:Secret üretim ortamında ayarlanmalı (JWT_SECRET ortam değişkeni). Varsayılan geliştirme anahtarı kullanılamaz.");
}

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.FromSeconds(30),
    };
});

// OAuth (Google) — yalnızca Google:ClientId appsettings/ortam değişkeninde
// tanımlıysa devreye girer. Boşken hem builder hatasız kalır hem de gereksiz
// bir "Google ile giriş yap" seçeneği frontend'de gösterilmez (bkz. rapor).
var googleClientId = builder.Configuration["Google:ClientId"];
var googleClientSecret = builder.Configuration["Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authBuilder.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme;
    });
}

builder.Services.AddAuthorization();

// 6. Rate limiting — API adresini bilen herkes sınırsız istek atamasın diye.
// IP başına global bir pencere + yazma (POST/PUT/DELETE) uçları için daha sıkı
// bir "write" politikası. Aşılırsa 429 Too Many Requests döner.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });

    options.AddPolicy("write", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });

    options.AddPolicy("auth", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        // Login/register kaba kuvvet denemelerine karşı çok daha sıkı: dakikada 10.
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });
});

var app = builder.Build();

// 0. Merkezi (global) hata yakalama — pipeline'daki EN İLK middleware.
// Controller'larda try/catch atlanan veya beklenmedik (NullReference, DB
// bağlantı hatası vb.) her istisna buraya düşer: ham .NET yığın izi/HTML
// hata sayfası hiçbir zaman istemciye sızmaz, ILogger ile anlamlı bir log
// (istek yolu + trace id) üretilir ve istemciye tek biçimli bir JSON
// gövdesi döner. Development'ta ayrıca hata mesajı/istisna türü de eklenir.
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("GlobalExceptionHandler");

        logger.LogError(exception, "Yakalanmamış istisna. Yol: {Path}, TraceId: {TraceId}",
            context.Request.Path, context.TraceIdentifier);

        // Geçici DB / ağ hatalarında 503 — istemci retry yapabilsin, süreç ayakta kalsın
        var isTransient =
            exception is NpgsqlException
            || exception is TimeoutException
            || exception is SocketException
            || exception?.InnerException is NpgsqlException
            || exception?.InnerException is SocketException;

        var status = isTransient
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status500InternalServerError;

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = status;

        var isDevelopment = context.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();
        await context.Response.WriteAsJsonAsync(new
        {
            title = isTransient
                ? "Veritabanı veya ağ geçici olarak kullanılamıyor. Lütfen tekrar deneyin."
                : "Sunucuda beklenmeyen bir hata oluştu.",
            status,
            traceId = context.TraceIdentifier,
            detail = isDevelopment ? exception?.ToString() : null,
        });
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Production'da HTTPS zorunlu tutulur; yerel Docker geliştirme HTTP
    // üzerinden çalıştığı için bu blok yalnızca Development DIŞINDA aktif.
    app.UseHsts();
    app.UseHttpsRedirection();
}

// 7. Güvenlik başlıkları — Helmet.js'in ASP.NET Core karşılığı.
// Tarayıcıya MIME sniffing, clickjacking (iframe'e gömme) ve gereksiz
// referrer sızıntısına karşı talimat verir. Content-Security-Policy, uygulamanın
// kendi origin'i dışında script/stil yüklemesini varsayılan olarak reddeder.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()";
    headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'";
    // Bu API sekmeler arası pencere referansı (window.opener) taşımaz;
    // aynı-origin izole edilerek Spectre benzeri yan-kanal sızıntıları
    // ve "tabnabbing" sınıfı saldırılara karşı ek bir katman eklenir.
    headers["Cross-Origin-Opener-Policy"] = "same-origin";
    // Yanıtlar farklı origin'lerden <script>/<img> olarak gömülmeye
    // çalışılırsa (örn. veri sızdırma amaçlı) reddedilir; frontend zaten
    // API'yi doğrudan fetch ile çağırıyor, bu davranışı bozmaz.
    headers["Cross-Origin-Resource-Policy"] = "same-site";
    // API yanıtları (özellikle admin/teklif verileri) tarayıcı önbelleğinde
    // veya paylaşımlı proxy'lerde kalmasın.
    headers["Cache-Control"] = "no-store";
    await next();
});

// 8. CORS politikasını devreye alıyoruz
app.UseCors("AllowReactApp");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// 9. Controller endpoint'lerini bağlıyoruz
app.MapControllers();

// Sağlık kontrolü — Docker / yük dengeleyici / frontend canlılık için
app.MapGet("/api/health", async (IDbConnectionFactory dbFactory, ILoggerFactory loggerFactory) =>
{
    var log = loggerFactory.CreateLogger("Health");
    try
    {
        await using var conn = (NpgsqlConnection)dbFactory.CreateConnection();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1";
        cmd.CommandTimeout = 5;
        await cmd.ExecuteScalarAsync();
        return Results.Ok(new { status = "healthy", time = DateTime.UtcNow });
    }
    catch (Exception ex)
    {
        log.LogWarning(ex, "Health check başarısız");
        return Results.Json(new { status = "unhealthy", time = DateTime.UtcNow }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.Run();
