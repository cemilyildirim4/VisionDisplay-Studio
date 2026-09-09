using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IExportLogRepository
{
    Task<ExportLog> CreateAsync(ExportLog log);

    /// <summary>Panel için en yeni kayıtlar.</summary>
    Task<IEnumerable<ExportLog>> GetRecentAsync(int limit);

    /// <summary>Biçime göre toplam sayı ("csv" | "pdf").</summary>
    Task<int> CountByKindAsync(string kind);
}
