using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Yönetim uçlarını korur. İki geçerli yol (geçiş dönemi):
///  1. JWT Bearer + Role=Admin  (canlıya yakın, hesap bazlı)
///  2. X-Admin-Key paylaşılan parola (beta / acil durum yedek anahtarı)
///
/// JWT Admin varken paylaşılan parola hâlâ çalışır; canlıda Admin:Password
/// boş bırakılarak yalnızca JWT zorunlu hale getirilebilir.
/// </summary>
public class AdminOnlyAttribute : Attribute, IAsyncActionFilter
{
    public const string HeaderName = "X-Admin-Key";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var user = http.User;

        // 1) JWT Admin
        if (user.Identity?.IsAuthenticated == true)
        {
            var role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role");
            if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }
        }

        // 2) Paylaşılan yönetim parolası (X-Admin-Key)
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        var beklenen = config["Admin:Password"];

        if (!string.IsNullOrWhiteSpace(beklenen))
        {
            var gelen = http.Request.Headers[HeaderName].ToString();
            if (!string.IsNullOrEmpty(gelen) && SabitSuredeEsit(gelen, beklenen))
            {
                await next();
                return;
            }

            // Parola tanımlı ama eşleşmedi / gönderilmedi
            if (!string.IsNullOrEmpty(gelen))
            {
                context.Result = new UnauthorizedObjectResult(new { message = "Yönetim parolası geçersiz." });
                return;
            }
        }

        // Ne JWT Admin ne de geçerli X-Admin-Key
        if (string.IsNullOrWhiteSpace(beklenen) && user.Identity?.IsAuthenticated != true)
        {
            context.Result = new ObjectResult(new
            {
                message = "Yönetim erişimi yapılandırılmamış. Ya Admin:Password (ortam değişkeni) tanımlayın " +
                          "ya da Role=Admin olan bir hesapla JWT girişi yapın."
            })
            { StatusCode = StatusCodes.Status503ServiceUnavailable };
            return;
        }

        context.Result = new UnauthorizedObjectResult(new
        {
            message = "Yönetim paneli için Admin hesabıyla giriş yapın veya geçerli X-Admin-Key gönderin."
        });
    }

    private static bool SabitSuredeEsit(string a, string b)
    {
        var beklenenBayt = Encoding.UTF8.GetBytes(b);
        var gelenBayt = Encoding.UTF8.GetBytes(a);
        var gelenSabitUzunluk = SHA256.HashData(gelenBayt);
        var beklenenSabitUzunluk = SHA256.HashData(beklenenBayt);
        return CryptographicOperations.FixedTimeEquals(gelenSabitUzunluk, beklenenSabitUzunluk);
    }
}
