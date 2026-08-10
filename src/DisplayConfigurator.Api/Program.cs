using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Infrastructure.Data;
using DisplayConfigurator.Infrastructure.Repositories;
using DisplayConfigurator.Infrastructure.Services;

// Dapper haritalama ayarı (veritabanındaki snake_case sütunları C# PascalCase ile eşleştirir)
DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// 1. Controller servisleri
builder.Services.AddControllers();

// 2. Swagger / OpenAPI konfigürasyonu
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Projenizin Gerçek Bağımlılıkları (Dependency Injection)
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlDbConnectionFactory>();
builder.Services.AddScoped<ICabinRepository, CabinRepository>();
builder.Services.AddScoped<IConfigurationRepository, ConfigurationRepository>();
builder.Services.AddScoped<IConfigurationService, ConfigurationService>();

// 4. CORS ayarları (React Frontend ile sorunsuz haberleşmek için)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// React HTTP üzerinden bağlandığı için HTTPS yönlendirme engelini kaldırıyoruz:
// app.UseHttpsRedirection();

// 5. CORS politikasını devreye alıyoruz
app.UseCors("AllowAll");

app.UseAuthorization();

// 6. Controller endpoint'lerini bağlıyoruz
app.MapControllers();

app.Run();