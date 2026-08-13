using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

/// <summary>
/// Tek PDF üretim noktası — teklif özeti + teknik şartname aynı belgede.
/// </summary>
public interface IPdfReportService
{
    byte[] Generate(ConfigurationResponseDto config, PdfReportExtras? extras = null, Cabin? cabin = null);
}
