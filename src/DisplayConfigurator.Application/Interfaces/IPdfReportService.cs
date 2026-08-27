using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

/// <summary>
/// İki PDF formatı üretir: müşteri (fiyatsız teknik özet) ve admin (donanım + işçilik + güç/ısı).
/// </summary>
public interface IPdfReportService
{
    byte[] Generate(
        ConfigurationResponseDto config,
        PdfReportExtras? extras = null,
        Cabin? cabin = null,
        PdfReportKind kind = PdfReportKind.Client);
}
