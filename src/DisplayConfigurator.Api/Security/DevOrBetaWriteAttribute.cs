using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Anonim gözlem yazmalarını (chatlog, feedback) yalnızca Development veya
/// Beta:Enabled ortamında açar. Canlıda 403 OBSERVATION_DISABLED döner.
/// </summary>
public sealed class DevOrBetaWriteAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var env = context.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();

        if (!RoleAvailability.ObservationWriteEnabled(env, config))
        {
            context.Result = new ObjectResult(new
            {
                message = "Gözlem kayıtları (sohbet / geri bildirim) canlı ortamda kapalıdır.",
                code = "OBSERVATION_DISABLED",
            })
            { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        await next();
    }
}
