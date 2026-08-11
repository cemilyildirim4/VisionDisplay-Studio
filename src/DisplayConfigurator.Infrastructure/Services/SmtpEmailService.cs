using System.Net;
using System.Net.Mail;
using DisplayConfigurator.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DisplayConfigurator.Infrastructure.Services;

/// <summary>
/// Smtp:Host boşsa (yapılandırılmamışsa) e-posta göndermeyi sessizce atlar ve
/// yalnızca loglar — beta/geliştirme ortamında SMTP sunucusu olmadan da
/// teklif/durum akışlarının kırılmaması için bilinçli bir "no-op" tasarımı.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var host = _config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(to))
        {
            _logger.LogInformation("E-posta gönderilmedi (SMTP yapılandırılmamış). Alıcı: {To}, Konu: {Subject}", to, subject);
            return;
        }

        try
        {
            var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
            var user = _config["Smtp:User"];
            var pass = _config["Smtp:Password"];
            var from = _config["Smtp:From"] ?? user ?? "no-reply@display-configurator.local";

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = string.IsNullOrWhiteSpace(user) ? null : new NetworkCredential(user, pass),
            };

            using var message = new MailMessage(from, to, subject, htmlBody) { IsBodyHtml = true };
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            // E-posta gönderimi asla ana iş akışını (teklif kaydı vb.) düşürmemeli.
            _logger.LogError(ex, "E-posta gönderilemedi. Alıcı: {To}", to);
        }
    }
}
