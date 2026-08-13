using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using DisplayConfigurator.Infrastructure.Pdf;
using QuestPDF.Fluent;

namespace DisplayConfigurator.Infrastructure.Services;

public class PdfReportService : IPdfReportService
{
    public byte[] Generate(ConfigurationResponseDto config, PdfReportExtras? extras = null, Cabin? cabin = null)
    {
        var document = new ProfessionalReportDocument(config, extras, cabin);
        return document.GeneratePdf();
    }
}
