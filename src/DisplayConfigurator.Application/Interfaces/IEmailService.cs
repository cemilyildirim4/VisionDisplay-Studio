namespace DisplayConfigurator.Application.Interfaces;

/// <summary>
/// SMTP ayarları (appsettings "Smtp" bölümü) boşsa uygulama SmtpEmailService
/// üzerinden yalnızca log basar — e-posta göndermek isteğe bağlıdır, eksik
/// yapılandırma teklif/konfigürasyon akışını asla kilitlemez.
/// </summary>
public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody);
}
