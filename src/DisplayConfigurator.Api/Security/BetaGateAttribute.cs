using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Beta aşamasında herkese açık yazma uçlarını (teklif/konfigürasyon/sohbet
/// oluşturma) davet koduyla alınmış bir misafir jetonu veya oturum açmış bir
/// kullanıcı jetonuyla sınırlar.
///
/// TASARIM KARARI: "Beta:Enabled" appsettings/ortam değişkeni false olduğunda
/// (yani ürün canlıya alındığında) bu filtre TAMAMEN devre dışı kalır — kod
/// değişikliği veya yeniden derleme gerekmeden tek bir ortam değişkeniyle beta
/// kısıtlamasından production'a geçilebilir.
/// </summary>
public class BetaGateAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var betaEnabled = config.GetValue<bool>("Beta:Enabled");

        if (!betaEnabled)
        {
            await next();
            return;
        }

        var user = context.HttpContext.User;
        var isAuthenticated = user?.Identity?.IsAuthenticated == true;

        if (!isAuthenticated)
        {
            context.Result = new ObjectResult(new
            {
                message = "Beta aşamasındayız — devam etmek için bir davet kodu girmeniz gerekiyor.",
                code = "BETA_INVITE_REQUIRED",
            })
            { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        await next();
    }
}
