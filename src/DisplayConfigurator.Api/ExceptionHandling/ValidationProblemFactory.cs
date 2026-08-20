using Microsoft.AspNetCore.Mvc;

namespace DisplayConfigurator.Api.ExceptionHandling;

/// <summary>
/// [ApiController] model doğrulama hatalarını RFC 7807 ValidationProblemDetails
/// olarak döner. Alan adları camelCase (errors.email) — frontend alan altına bağlar.
/// </summary>
public static class ValidationProblemFactory
{
    public const string TypeUri = "https://tools.ietf.org/html/rfc7231#section-6.5.1";
    public const string Title = "Doğrulama Hatası";

    public static IActionResult Create(ActionContext context)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, entry) in context.ModelState)
        {
            if (entry is not { Errors.Count: > 0 }) continue;

            var field = NormalizeFieldName(key);
            var messages = entry.Errors
                .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage)
                    ? "Bu alan geçersiz."
                    : e.ErrorMessage)
                .Distinct()
                .ToArray();

            if (errors.TryGetValue(field, out var existing))
                errors[field] = existing.Concat(messages).Distinct().ToArray();
            else
                errors[field] = messages;
        }

        var problem = new ValidationProblemDetails(errors)
        {
            Type = TypeUri,
            Title = Title,
            Status = StatusCodes.Status400BadRequest,
            Instance = context.HttpContext.Request.Path,
        };
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

        return new BadRequestObjectResult(problem)
        {
            ContentTypes = { "application/problem+json" },
        };
    }

    internal static string NormalizeFieldName(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return "request";
        var trimmed = key.Trim();
        if (trimmed.StartsWith("$.", StringComparison.Ordinal)) trimmed = trimmed[2..];
        var last = trimmed.Split('.', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? trimmed;
        if (last.Length <= 1) return last.ToLowerInvariant();
        return char.ToLowerInvariant(last[0]) + last[1..];
    }
}
