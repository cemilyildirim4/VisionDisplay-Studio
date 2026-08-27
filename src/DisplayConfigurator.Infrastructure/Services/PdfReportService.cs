using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using DisplayConfigurator.Infrastructure.Pdf;
using QuestPDF.Fluent;

namespace DisplayConfigurator.Infrastructure.Services;

/// <summary>
/// İki rapor formatı: <see cref="PdfReportKind.Client"/> (fiyatsız teknik özet)
/// ve <see cref="PdfReportKind.Admin"/> (6 kalem döküm + işçilik + güç/ısı).
/// </summary>
public class PdfReportService : IPdfReportService
{
    public byte[] Generate(
        ConfigurationResponseDto config,
        PdfReportExtras? extras = null,
        Cabin? cabin = null,
        PdfReportKind kind = PdfReportKind.Client)
    {
        var document = new ProfessionalReportDocument(config, extras, cabin, kind);
        return document.GeneratePdf();
    }
}
