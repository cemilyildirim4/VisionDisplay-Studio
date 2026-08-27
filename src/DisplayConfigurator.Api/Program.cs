using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using Dapper;
using DisplayConfigurator.Api.Data;
using DisplayConfigurator.Api.ExceptionHandling;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Configuration;
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

// Sırlar appsettings / launchSettings içinde tutulmaz. JWT ve DB parolası
// yalnızca ortam değişkeninden (Docker .env, JWT_SECRET, DB_PASSWORD) okunur.
var jwtSecret = FirstNonEmpty(
    Environment.GetEnvironmentVariable("JWT_SECRET"),
    builder.Configuration["Jwt:Secret"]);
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException(
        "JWT_SECRET ortam değişkeni tanımlı değil. Kök dizindeki .env.example dosyasını .env olarak kopyalayıp doldurun.");
}
if (jwtSecret.Length < 32)
{
    throw new InvalidOperationException("JWT_SECRET en az 32 karakter olmalıdır.");
}

var connectionString = ResolveConnectionString(builder.Configuration);
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Jwt:Secret"] = jwtSecret,
    ["ConnectionStrings:DefaultConnection"] = connectionString,
});

// Kestrel'in yanıtlara "Server: Kestrel" başlığı eklemesini kapatıyoruz —
// sunucu yazılımını/versiyonunu saldırgana ücretsiz bilgi olarak vermeyelim.
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// 1. Controller servisleri
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = ValidationProblemFactory.Create;
    });
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<Rfc7807ExceptionHandler>();

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
builder.Services.AddScoped<IHardwareCatalogRepository, HardwareCatalogRepository>();
builder.Services.AddScoped<IConfigurationService, ConfigurationService>();
builder.Services.AddScoped<IPdfReportService, PdfReportService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IInviteCodeRepository, InviteCodeRepository>();
builder.Services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// 4. CORS — Render CORS_ORIGINS (virgülle ayrılmış). Origin eşleşmezse ASP.NET
// Access-Control-Allow-Origin hiç yazmaz; tarayıcı bunu "Missing Header" gösterir.
var corsOrigins = ParseCorsOrigins(builder.Configuration);
var corsAllowAnyOrigin = corsOrigins.Count == 0;

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("Content-Disposition")
              .SetPreflightMaxAge(TimeSpan.FromHours(1));

        if (corsAllowAnyOrigin)
        {
            // AllowCredentials ile birlikte kullanılamaz.
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.SetIsOriginAllowed(origin => IsAllowedCorsOrigin(origin, corsOrigins));
        }
    });
});

// 5. Kimlik doğrulama (JWT) — sır yalnızca JWT_SECRET ortam değişkeninden gelir.
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
if (string.IsNullOrWhiteSpace(jwtIssuer)) jwtIssuer = "display-configurator";

var jwtAudience = builder.Configuration["Jwt:Audience"];
if (string.IsNullOrWhiteSpace(jwtAudience)) jwtAudience = "display-configurator-client";

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

builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString,
        name: "postgres",
        failureStatus: HealthStatus.Unhealthy,
        tags: ["ready", "db"]);

// Nginx / reverse proxy arkasında gerçek istemci IP'si X-Forwarded-For ile gelir.
// Bu middleware UseRateLimiter'dan ÖNCE çalışmalı; aksi halde tüm istekler
// proxy IP'sinde birleşir ve rate limit ya herkesi birlikte keser ya da işlemez.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    // Kestrel varsayılan olarak yalnızca loopback'e güvenir. Docker'da nginx
    // ayrı bir container IP'sinden gelir; listeler boşaltılmazsa başlık yok sayılır.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();

    var knownProxy = builder.Configuration["ForwardedHeaders:KnownProxy"];
    if (!string.IsNullOrWhiteSpace(knownProxy) && IPAddress.TryParse(knownProxy, out var proxyAddr))
        options.KnownProxies.Add(proxyAddr);
});

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

app.Logger.LogInformation(
    "CORS: {Mode}; izinli origin'ler: {Origins}",
    corsAllowAnyOrigin ? "AllowAnyOrigin" : "allow-list",
    corsAllowAnyOrigin ? "*" : string.Join(", ", corsOrigins));

// Reverse proxy (nginx) X-Forwarded-For / X-Forwarded-Proto başlıklarını
// Connection.RemoteIpAddress ve şemaya yansıtır. Rate limiter ve loglar
// gerçek istemci IP'sini görsün diye diğer middleware'lerden önce çalışır.
app.UseForwardedHeaders();

// RFC 7807 Problem Details — Production'da ex.Message / yığın izi istemciye gitmez.
app.UseExceptionHandler();

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
    // API Vercel gibi başka origin'lerden fetch edilir; same-site CORS'u
    // tarayıcıda "No Access-Control-Allow-Origin" gibi gösterir.
    headers["Cross-Origin-Resource-Policy"] = "cross-origin";
    // API yanıtları (özellikle admin/teklif verileri) tarayıcı önbelleğinde
    // veya paylaşımlı proxy'lerde kalmasın.
    headers["Cache-Control"] = "no-store";
    await next();
});

// 8. CORS — UseRouting'den sonra, UseAuthorization ve MapControllers'dan önce.
app.UseRouting();
app.UseCors("AllowReactApp");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// 9. Controller endpoint'lerini bağlıyoruz
app.MapControllers().RequireCors("AllowReactApp");

app.MapHealthChecks("/healthz").AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapHealthChecks("/api/health").AllowAnonymous();

// Dapper: EF Database.Migrate() yok. SQL betikleri schema_migrations ile izlenir.
await SqlMigrationRunner.ApplyAsync(app);

app.Run();

static string? FirstNonEmpty(params string?[] values)
{
    foreach (var value in values)
    {
        if (!string.IsNullOrWhiteSpace(value)) return value;
    }

    return null;
}

static string ResolveConnectionString(IConfiguration config)
{
    var raw = FirstNonEmpty(
        Environment.GetEnvironmentVariable("CONNECTION_STRING"),
        config.GetConnectionString("DefaultConnection"));

    var dbPassword = FirstNonEmpty(
        Environment.GetEnvironmentVariable("DB_PASSWORD"),
        Environment.GetEnvironmentVariable("POSTGRES_PASSWORD"));

    if (string.IsNullOrWhiteSpace(raw))
    {
        if (string.IsNullOrWhiteSpace(dbPassword))
        {
            throw new InvalidOperationException(
                "DB_PASSWORD (veya CONNECTION_STRING) ortam değişkeni tanımlı değil. .env.example dosyasını .env olarak kopyalayıp doldurun.");
        }

        var host = FirstNonEmpty(Environment.GetEnvironmentVariable("DB_HOST"), "localhost")!;
        var port = FirstNonEmpty(Environment.GetEnvironmentVariable("DB_PORT"), "5432")!;
        var database = FirstNonEmpty(Environment.GetEnvironmentVariable("DB_NAME"), "display_configurator_db")!;
        var user = FirstNonEmpty(Environment.GetEnvironmentVariable("DB_USER"), "postgres")!;
        raw = $"Host={host};Port={port};Database={database};Username={user};Password={dbPassword}";
    }

    var builder = new NpgsqlConnectionStringBuilder(raw);
    if (string.IsNullOrWhiteSpace(builder.Password) && !string.IsNullOrWhiteSpace(dbPassword))
        builder.Password = dbPassword;

    if (string.IsNullOrWhiteSpace(builder.Password))
    {
        throw new InvalidOperationException(
            "Veritabanı parolası eksik. DB_PASSWORD veya CONNECTION_STRING ortam değişkenini ayarlayın.");
    }

    return builder.ConnectionString;
}

static HashSet<string> ParseCorsOrigins(IConfiguration config)
{
    var raw = FirstNonEmpty(
        Environment.GetEnvironmentVariable("CORS_ORIGINS"),
        config["CORS_ORIGINS"],
        config["Cors:OriginsCsv"]);

    // Açık wildcard: her origin. Aksi halde liste her zaman Vercel üretim origin'ini içerir;
    // Render'da CORS_ORIGINS=localhost kalsa bile tarayıcı ACAO alır.
    if (string.Equals(raw?.Trim(), "*", StringComparison.Ordinal))
        return [];

    var origins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "https://vision-display-studio.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
    };

    if (string.IsNullOrWhiteSpace(raw))
        return origins;

    foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        var origin = NormalizeCorsOrigin(part);
        if (origin.Length > 0 && origin != "*")
            origins.Add(origin);
    }

    return origins;
}

static string NormalizeCorsOrigin(string value)
{
    var origin = value.Trim().Trim('"', '\'').TrimEnd('/');
    return origin;
}

static bool IsAllowedCorsOrigin(string origin, HashSet<string> allowed)
{
    if (string.IsNullOrWhiteSpace(origin))
        return false;

    origin = NormalizeCorsOrigin(origin);
    if (allowed.Contains(origin))
        return true;

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        return false;

    // Vercel preview: vision-display-studio-git-….vercel.app
    return uri.Host.Equals("vision-display-studio.vercel.app", StringComparison.OrdinalIgnoreCase)
        || (uri.Host.StartsWith("vision-display-studio", StringComparison.OrdinalIgnoreCase)
            && uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase));
}
