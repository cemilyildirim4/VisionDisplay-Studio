using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DisplayConfigurator.Api.Security;

/// <summary>
/// Yönetim uçlarını korur. Yalnızca JWT Bearer + Role=Admin geçerlidir.
/// Paylaşılan X-Admin-Key arka kapısı kaldırıldı.
/// </summary>
public class AdminOnlyAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated == true)
        {
            var role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role");
            if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }
        }

        context.Result = new UnauthorizedObjectResult(new
        {
            message = "Yönetim paneli için Role=Admin hesabıyla giriş yapın.",
        });
    }
}
