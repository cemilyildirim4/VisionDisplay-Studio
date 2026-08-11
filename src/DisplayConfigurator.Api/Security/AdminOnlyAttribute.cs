using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Yönetim işlemlerini paylaşılan bir parolayla korur.
///
/// NEDEN SUNUCUDA:
/// Koruma yalnızca arayüzde olsaydı gerçek bir koruma olmazdı — API adresini
/// bilen herkes tarayıcıdan ya da curl ile doğrudan POST/PUT/DELETE atıp model
/// ekleyip silebilirdi. Yetki kontrolü isteği KARŞILAYAN tarafta olmak zorunda.
///
/// KAPSAM:
/// Yalnızca DEĞİŞTİREN uçlar korunuyor. Model listesi (GET) herkese açık
/// kalmalı, çünkü konfigüratörün kendisi onu okuyor.
///
/// PAROLA NEREDE:
/// appsettings.Development.json içindeki "Admin:Password" (o dosya .gitignore
/// ile hariç tutulmalı) ya da ortam değişkeni: Admin__Password=...
/// Parola tanımlı değilse uçlar KAPALI kalır — "parola yoksa serbest" davranışı
/// sessizce güvensiz bir kurulum üretirdi.
/// </summary>
public class AdminOnlyAttribute : Attribute, IAsyncActionFilter
{
    public const string HeaderName = "X-Admin-Key";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var beklenen = config["Admin:Password"];

        if (string.IsNullOrWhiteSpace(beklenen))
        {
            context.Result = new ObjectResult(new
            {
                message = "Yönetim parolası sunucuda tanımlı değil. " +
                          "appsettings.Development.json içine \"Admin\": { \"Password\": \"...\" } ekleyin."
            })
            { StatusCode = StatusCodes.Status503ServiceUnavailable };
            return;
        }

        var gelen = context.HttpContext.Request.Headers[HeaderName].ToString();

        if (!SabitSuredeEsit(gelen, beklenen))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Yönetim parolası geçersiz." });
            return;
        }

        await next();
    }

    /// <summary>
    /// Sabit süreli karşılaştırma. Sıradan == ilk farklı karakterde durur ve
    /// yanıt süresinden parola karakter karakter tahmin edilebilir.
    ///
    /// NOT: FixedTimeEquals farklı uzunluktaki dizilerde İSTİSNA fırlatır — bu
    /// hem "uzunluk oracle"ı (yanıttan parola uzunluğu tahmin edilebilir) hem de
    /// yakalanmazsa 500 hatasına yol açar. Kısa girdi önce beklenen uzunluğa
    /// (hash ile) sabitlenir, böylece karşılaştırma her zaman eşit uzunlukta
    /// ve sabit sürede yapılır.
    /// </summary>
    private static bool SabitSuredeEsit(string a, string b)
    {
        var beklenenBayt = Encoding.UTF8.GetBytes(b);
        var gelenBayt = Encoding.UTF8.GetBytes(a);

        // Gelen değeri SHA-256 ile beklenenle aynı sabit uzunluğa (32 bayt)
        // getiriyoruz ki uzunluk farkı hiçbir zaman FixedTimeEquals'a sızmasın.
        var gelenSabitUzunluk = SHA256.HashData(gelenBayt);
        var beklenenSabitUzunluk = SHA256.HashData(beklenenBayt);

        var hashEsit = CryptographicOperations.FixedTimeEquals(gelenSabitUzunluk, beklenenSabitUzunluk);
        return hashEsit;
    }
}
