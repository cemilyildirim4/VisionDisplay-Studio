using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Sohbet kaydı yazmayı açar. Diğer gözlem uçlarından (geri bildirim) farklı
/// olarak CANLIDA DA çalışır: asistanın cevaplayamadığı soruları toplamanın
/// başka yolu yok. ChatLogs:Enabled=false ile kapatılabilir.
/// </summary>
public sealed class ChatLogWriteAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();

        if (!RoleAvailability.ChatLogWriteEnabled(config))
        {
            context.Result = new ObjectResult(new
            {
                message = "Sohbet kaydı kapalıdır.",
                code = "CHATLOG_DISABLED",
            })
            { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        await next();
    }
}
