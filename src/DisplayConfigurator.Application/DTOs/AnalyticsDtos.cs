namespace DisplayConfigurator.Application.DTOs;

public class TopModelDto
{
    public int CabinId { get; set; }
    public string ModelCode { get; set; } = string.Empty;
    public int ConfigurationCount { get; set; }
}

/// <summary>Yardımcının cevaplayamadığı, en sık sorulan sorular — SSS önerisi için.</summary>
public class FaqSuggestionDto
{
    public string Question { get; set; } = string.Empty;
    public int AskedCount { get; set; }
    public string? TopicId { get; set; }
}

/// <summary>Panelde gösterilen indirme kaydı satırı.</summary>
public class ExportLogDto
{
    public int Id { get; set; }
    public string? UserName { get; set; }
    public string? CompanyName { get; set; }
    public string? ModelCode { get; set; }
    public string Kind { get; set; } = "csv";
    public DateTime CreatedAt { get; set; }
}

public class DashboardSummaryDto
{
    public int TotalQuotes { get; set; }
    public int PendingQuotes { get; set; }
    public int TotalConfigurations { get; set; }
    public int UnansweredChatLogs { get; set; }
    /// <summary>CSV (Excel) indirme sayısı.</summary>
    public int CsvExports { get; set; }
    /// <summary>PDF rapor indirme sayısı.</summary>
    public int PdfExports { get; set; }
    public IEnumerable<ExportLogDto> RecentExports { get; set; } = Array.Empty<ExportLogDto>();
    public IEnumerable<TopModelDto> TopModels { get; set; } = Array.Empty<TopModelDto>();
    public IEnumerable<FaqSuggestionDto> FaqSuggestions { get; set; } = Array.Empty<FaqSuggestionDto>();
}
