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

public class DashboardSummaryDto
{
    public int TotalQuotes { get; set; }
    public int PendingQuotes { get; set; }
    public int TotalConfigurations { get; set; }
    public int UnansweredChatLogs { get; set; }
    public IEnumerable<TopModelDto> TopModels { get; set; } = Array.Empty<TopModelDto>();
    public IEnumerable<FaqSuggestionDto> FaqSuggestions { get; set; } = Array.Empty<FaqSuggestionDto>();
}
