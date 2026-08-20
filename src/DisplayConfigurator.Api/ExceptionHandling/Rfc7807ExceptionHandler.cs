using System.Net.Sockets;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace DisplayConfigurator.Api.ExceptionHandling;

/// <summary>
/// Yakalanmamış istisnaları RFC 7807 Problem Details olarak döner.
/// Production'da ex.Message / yığın izi istemciye gitmez; yalnızca Development'ta detail eklenir.
/// </summary>
public sealed class Rfc7807ExceptionHandler : IExceptionHandler
{
    private readonly IHostEnvironment _environment;
    private readonly ILogger<Rfc7807ExceptionHandler> _logger;

    public Rfc7807ExceptionHandler(IHostEnvironment environment, ILogger<Rfc7807ExceptionHandler> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Yakalanmamış istisna. Yol: {Path}, TraceId: {TraceId}",
            httpContext.Request.Path, httpContext.TraceIdentifier);

        var postgres = Unwrap<PostgresException>(exception);
        var isFkViolation = postgres?.SqlState == PostgresErrorCodes.ForeignKeyViolation;
        var isTransient = !isFkViolation && IsTransientDbOrNetwork(exception);

        var status = isFkViolation
            ? StatusCodes.Status409Conflict
            : isTransient
                ? StatusCodes.Status503ServiceUnavailable
                : StatusCodes.Status500InternalServerError;

        var title = isFkViolation
            ? "Bu kayıt başka veriler tarafından kullanıldığı için silinemiyor."
            : isTransient
                ? "Veritabanı veya ağ geçici olarak kullanılamıyor. Lütfen tekrar deneyin."
                : "Sunucuda beklenmeyen bir hata oluştu.";

        var problem = new ProblemDetails
        {
            Type = status switch
            {
                StatusCodes.Status409Conflict => "https://httpstatuses.com/409",
                StatusCodes.Status503ServiceUnavailable => "https://httpstatuses.com/503",
                _ => "https://httpstatuses.com/500",
            },
            Title = title,
            Status = status,
            Instance = httpContext.Request.Path,
        };
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;

        if (_environment.IsDevelopment())
            problem.Detail = exception.ToString();

        httpContext.Response.StatusCode = status;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }

    private static T? Unwrap<T>(Exception? exception) where T : Exception
    {
        for (var e = exception; e is not null; e = e.InnerException)
        {
            if (e is T typed) return typed;
        }

        return null;
    }

    private static bool IsTransientDbOrNetwork(Exception? exception)
    {
        for (var e = exception; e is not null; e = e.InnerException)
        {
            if (e is TimeoutException or SocketException) return true;
            if (e is NpgsqlException npg && npg.IsTransient) return true;
        }

        return false;
    }
}
